import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { POST as POST_VALUATION } from "@/app/api/liabilities/[id]/valuations/route";
import { PATCH as PATCH_PORTFOLIO } from "@/app/api/portfolio/route";
import { POST as POST_LIABILITY } from "@/app/api/liabilities/route";
import { DELETE as DELETE_LIABILITY } from "@/app/api/liabilities/[id]/route";
import { DEFAULT_LIABILITY_CLASS_ID } from "@/lib/liability-classes/defaults";
import { createTestUser, deleteTestUser, type TestUser } from "../fixtures/users";
import { jsonBody, requestAs } from "../fixtures/http";

const LIABILITIES_URL = "http://localhost:3000/api/liabilities";
const PORTFOLIO_URL = "http://localhost:3000/api/portfolio";

function valuationsUrl(liabilityId: string) {
  return `${LIABILITIES_URL}/${liabilityId}/valuations`;
}

async function createLiability(user: TestUser, overrides: Record<string, unknown> = {}) {
  const response = await POST_LIABILITY(
    requestAs(user, LIABILITIES_URL, {
      method: "POST",
      ...jsonBody({
        name: "Mortgage on 123 Main St",
        liability_class_id: DEFAULT_LIABILITY_CLASS_ID.mortgage,
        currency: "USD",
        ...overrides,
      }),
    }),
  );
  const { id } = await response.json();
  return id as string;
}

function recordValuation(user: TestUser, liabilityId: string, body: Record<string, unknown>) {
  return POST_VALUATION(
    requestAs(user, valuationsUrl(liabilityId), { method: "POST", ...jsonBody(body) }),
    { params: Promise.resolve({ id: liabilityId }) },
  );
}

// Seam 2 from docs/SPEC.md: real requests against the real local Postgres,
// RLS actually enabled — mirrors tests/route/valuations.test.ts. Recording a
// Liability balance is meant to work identically to recording a Holding
// value (ticket 05's checklist), so this file mirrors that one closely.
describe("POST /api/liabilities/[id]/valuations", () => {
  let userA: TestUser;
  let userB: TestUser;

  beforeAll(async () => {
    [userA, userB] = await Promise.all([
      createTestUser("liability-valuation-a"),
      createTestUser("liability-valuation-b"),
    ]);
  });

  afterAll(async () => {
    await Promise.all([deleteTestUser(userA.id), deleteTestUser(userB.id)]);
  });

  it("rejects a request with no session", async () => {
    const response = await POST_VALUATION(
      new NextRequest(valuationsUrl("00000000-0000-0000-0000-000000000000"), {
        method: "POST",
        ...jsonBody({ amount: 100 }),
      }),
      { params: Promise.resolve({ id: "00000000-0000-0000-0000-000000000000" }) },
    );
    expect(response.status).toBe(401);
  });

  it("records a balance dated today by default", async () => {
    const liabilityId = await createLiability(userA);
    const today = new Date().toISOString().slice(0, 10);

    const response = await recordValuation(userA, liabilityId, { amount: 300_000 });
    expect(response.status).toBe(200);
    const created = await response.json();
    expect(created).toMatchObject({ liability_id: liabilityId, amount: 300_000, recorded_at: today });
  });

  it("accepts a backdated recorded_at", async () => {
    const liabilityId = await createLiability(userA);

    const response = await recordValuation(userA, liabilityId, {
      amount: 295_000,
      recorded_at: "2026-01-15",
    });
    expect(response.status).toBe(200);
    expect((await response.json()).recorded_at).toBe("2026-01-15");
  });

  it("rejects a recorded_at in the future", async () => {
    const liabilityId = await createLiability(userA);

    const response = await recordValuation(userA, liabilityId, {
      amount: 295_000,
      recorded_at: "2099-01-01",
    });
    expect(response.status).toBe(400);
  });

  it("rejects a non-numeric amount", async () => {
    const liabilityId = await createLiability(userA);

    const response = await recordValuation(userA, liabilityId, { amount: "a lot" });
    expect(response.status).toBe(400);
  });

  it("recording twice on the same date updates that row rather than inserting a second one", async () => {
    const liabilityId = await createLiability(userA);

    const first = await recordValuation(userA, liabilityId, {
      amount: 300_000,
      recorded_at: "2026-03-01",
    });
    const firstBody = await first.json();

    const second = await recordValuation(userA, liabilityId, {
      amount: 299_500,
      recorded_at: "2026-03-01",
    });
    const secondBody = await second.json();

    expect(secondBody.id).toBe(firstBody.id);
    expect(secondBody.amount).toBe(299_500);

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data: rows } = await admin
      .from("liability_valuation")
      .select("id")
      .eq("liability_id", liabilityId)
      .eq("recorded_at", "2026-03-01");
    expect(rows).toHaveLength(1);
  });

  it("captures fx_rate_to_home as 1 when the Liability's currency matches home currency", async () => {
    const liabilityId = await createLiability(userA, { currency: "USD" });

    const response = await recordValuation(userA, liabilityId, { amount: 5000 });
    const body = await response.json();

    expect(body.fx_rate_to_home).toBe(1);
    expect(body.home_currency_at_recording).toBe("USD");
  });

  it("captures a live fx_rate_to_home for a foreign-currency Liability", async () => {
    const liabilityId = await createLiability(userA, { currency: "EUR" });

    const response = await recordValuation(userA, liabilityId, { amount: 5000 });
    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.fx_rate_to_home).toBeGreaterThan(0);
    expect(body.home_currency_at_recording).toBe("USD");
  });

  it("404s recording against a Liability that doesn't exist", async () => {
    const response = await recordValuation(userA, "00000000-0000-0000-0000-000000000000", {
      amount: 100,
    });
    expect(response.status).toBe(404);
  });

  it("User A cannot record a Valuation against User B's Liability", async () => {
    const liabilityId = await createLiability(userB, { name: "B's liability" });

    const response = await recordValuation(userA, liabilityId, { amount: 100 });
    expect(response.status).toBe(404);

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data: rows } = await admin
      .from("liability_valuation")
      .select("id")
      .eq("liability_id", liabilityId);
    expect(rows).toHaveLength(0);
  });

  it("User A cannot read User B's Liability Valuations directly, even with a matching liability_id guess", async () => {
    const liabilityId = await createLiability(userB, { name: "B's liability" });
    await recordValuation(userB, liabilityId, { amount: 50_000 });

    const asUserA = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${userA.accessToken}` } } },
    );

    const { data } = await asUserA
      .from("liability_valuation")
      .select("id")
      .eq("liability_id", liabilityId);
    expect(data).toEqual([]);
  });

  it("deleting a Liability cascades its Valuations", async () => {
    const liabilityId = await createLiability(userA);
    await recordValuation(userA, liabilityId, { amount: 100 });

    const deleteResponse = await DELETE_LIABILITY(
      requestAs(userA, `${LIABILITIES_URL}/${liabilityId}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: liabilityId }) },
    );
    expect(deleteResponse.status).toBe(200);

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data: rows } = await admin
      .from("liability_valuation")
      .select("id")
      .eq("liability_id", liabilityId);
    expect(rows).toHaveLength(0);
  });

  it("changing portfolio.home_currency afterwards does not retroactively alter a historical Valuation's stored rate", async () => {
    const liabilityId = await createLiability(userA, { currency: "USD" });

    const recorded = await recordValuation(userA, liabilityId, {
      amount: 7000,
      recorded_at: "2026-02-01",
    });
    const recordedBody = await recorded.json();
    expect(recordedBody.fx_rate_to_home).toBe(1);
    expect(recordedBody.home_currency_at_recording).toBe("USD");

    const changedHomeCurrency = await PATCH_PORTFOLIO(
      requestAs(userA, PORTFOLIO_URL, {
        method: "PATCH",
        ...jsonBody({ home_currency: "JPY" }),
      }),
    );
    expect(changedHomeCurrency.status).toBe(200);

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data: row } = await admin
      .from("liability_valuation")
      .select("fx_rate_to_home, home_currency_at_recording")
      .eq("liability_id", liabilityId)
      .eq("recorded_at", "2026-02-01")
      .single();

    expect(row).toMatchObject({ fx_rate_to_home: 1, home_currency_at_recording: "USD" });
  });
});
