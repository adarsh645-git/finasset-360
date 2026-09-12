import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { POST as POST_VALUATION } from "@/app/api/holdings/[id]/valuations/route";
import { PATCH as PATCH_PORTFOLIO } from "@/app/api/portfolio/route";
import { POST as POST_HOLDING } from "@/app/api/holdings/route";
import { DELETE as DELETE_HOLDING } from "@/app/api/holdings/[id]/route";
import { DEFAULT_ASSET_CLASS_ID } from "@/lib/asset-classes/defaults";
import { createTestUser, deleteTestUser, type TestUser } from "../fixtures/users";
import { jsonBody, requestAs } from "../fixtures/http";

const HOLDINGS_URL = "http://localhost:3000/api/holdings";
const PORTFOLIO_URL = "http://localhost:3000/api/portfolio";

function valuationsUrl(holdingId: string) {
  return `${HOLDINGS_URL}/${holdingId}/valuations`;
}

async function createHolding(user: TestUser, overrides: Record<string, unknown> = {}) {
  const response = await POST_HOLDING(
    requestAs(user, HOLDINGS_URL, {
      method: "POST",
      ...jsonBody({
        name: "10 shares of AAPL",
        asset_class_id: DEFAULT_ASSET_CLASS_ID.equity,
        currency: "USD",
        ...overrides,
      }),
    }),
  );
  const { id } = await response.json();
  return id as string;
}

function recordValuation(
  user: TestUser,
  holdingId: string,
  body: Record<string, unknown>,
) {
  return POST_VALUATION(
    requestAs(user, valuationsUrl(holdingId), { method: "POST", ...jsonBody(body) }),
    { params: Promise.resolve({ id: holdingId }) },
  );
}

// Seam 2 from docs/SPEC.md: real requests against the real local Postgres,
// RLS actually enabled, exactly like tests/route/holdings.test.ts.
describe("POST /api/holdings/[id]/valuations", () => {
  let userA: TestUser;
  let userB: TestUser;

  beforeAll(async () => {
    [userA, userB] = await Promise.all([
      createTestUser("valuation-a"),
      createTestUser("valuation-b"),
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

  it("records a Valuation dated today by default", async () => {
    const holdingId = await createHolding(userA);
    const today = new Date().toISOString().slice(0, 10);

    const response = await recordValuation(userA, holdingId, { amount: 1500 });
    expect(response.status).toBe(200);
    const created = await response.json();
    expect(created).toMatchObject({ holding_id: holdingId, amount: 1500, recorded_at: today });
  });

  it("accepts a backdated recorded_at", async () => {
    const holdingId = await createHolding(userA);

    const response = await recordValuation(userA, holdingId, {
      amount: 900,
      recorded_at: "2026-01-15",
    });
    expect(response.status).toBe(200);
    expect((await response.json()).recorded_at).toBe("2026-01-15");
  });

  it("rejects a recorded_at in the future", async () => {
    const holdingId = await createHolding(userA);

    const response = await recordValuation(userA, holdingId, {
      amount: 900,
      recorded_at: "2099-01-01",
    });
    expect(response.status).toBe(400);
  });

  it("rejects a non-numeric amount", async () => {
    const holdingId = await createHolding(userA);

    const response = await recordValuation(userA, holdingId, { amount: "a lot" });
    expect(response.status).toBe(400);
  });

  it("recording twice on the same date updates that row rather than inserting a second one", async () => {
    const holdingId = await createHolding(userA);

    const first = await recordValuation(userA, holdingId, {
      amount: 1000,
      recorded_at: "2026-03-01",
    });
    const firstBody = await first.json();

    const second = await recordValuation(userA, holdingId, {
      amount: 1250,
      recorded_at: "2026-03-01",
    });
    const secondBody = await second.json();

    expect(secondBody.id).toBe(firstBody.id);
    expect(secondBody.amount).toBe(1250);

    // Confirm there is exactly one row for that day, not two, by reading
    // back with the service-role key.
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data: rows } = await admin
      .from("holding_valuation")
      .select("id")
      .eq("holding_id", holdingId)
      .eq("recorded_at", "2026-03-01");
    expect(rows).toHaveLength(1);
  });

  it("captures fx_rate_to_home as 1 when the Holding's currency matches home currency", async () => {
    const holdingId = await createHolding(userA, { currency: "USD" });

    const response = await recordValuation(userA, holdingId, { amount: 500 });
    const body = await response.json();

    expect(body.fx_rate_to_home).toBe(1);
    expect(body.home_currency_at_recording).toBe("USD");
  });

  it("captures a live fx_rate_to_home for a foreign-currency Holding", async () => {
    const holdingId = await createHolding(userA, { currency: "EUR" });

    const response = await recordValuation(userA, holdingId, { amount: 500 });
    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.fx_rate_to_home).toBeGreaterThan(0);
    expect(body.home_currency_at_recording).toBe("USD");
  });

  it("falls back to this User's last recorded rate for the pair when the live FX fetch fails", async () => {
    const holdingId = await createHolding(userB, { currency: "EUR" });

    const first = await recordValuation(userB, holdingId, {
      amount: 200,
      recorded_at: "2026-04-01",
    });
    expect(first.status).toBe(200);
    const firstRate = (await first.json()).fx_rate_to_home;
    expect(firstRate).toBeGreaterThan(0);

    // Only the FX provider call should fail here — a blanket fetch stub
    // would also break the Supabase client's own network calls (auth,
    // Postgres over PostgREST), which use `fetch` under the hood too.
    const originalFetch = global.fetch;
    global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("frankfurter")) {
        throw new Error("simulated network failure");
      }
      return originalFetch(input, init);
    }) as typeof fetch;

    try {
      const second = await recordValuation(userB, holdingId, {
        amount: 250,
        recorded_at: "2026-04-02",
      });
      expect(second.status).toBe(200);
      expect((await second.json()).fx_rate_to_home).toBe(firstRate);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("502s when the live FX fetch fails and there is no prior recorded rate for the pair", async () => {
    const holdingId = await createHolding(userB, { currency: "GBP" });

    // Only the FX provider call should fail here — a blanket fetch stub
    // would also break the Supabase client's own network calls (auth,
    // Postgres over PostgREST), which use `fetch` under the hood too.
    const originalFetch = global.fetch;
    global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("frankfurter")) {
        throw new Error("simulated network failure");
      }
      return originalFetch(input, init);
    }) as typeof fetch;

    try {
      const response = await recordValuation(userB, holdingId, { amount: 100 });
      expect(response.status).toBe(502);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("changing portfolio.home_currency afterwards does not retroactively alter a historical Valuation's stored rate", async () => {
    const holdingId = await createHolding(userA, { currency: "USD" });

    const recorded = await recordValuation(userA, holdingId, {
      amount: 700,
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
      .from("holding_valuation")
      .select("fx_rate_to_home, home_currency_at_recording")
      .eq("holding_id", holdingId)
      .eq("recorded_at", "2026-02-01")
      .single();

    expect(row).toMatchObject({ fx_rate_to_home: 1, home_currency_at_recording: "USD" });
  });

  it("404s recording against a Holding that doesn't exist", async () => {
    const response = await recordValuation(userA, "00000000-0000-0000-0000-000000000000", {
      amount: 100,
    });
    expect(response.status).toBe(404);
  });

  it("User A cannot record a Valuation against User B's Holding", async () => {
    const holdingId = await createHolding(userB, { name: "B's holding" });

    const response = await recordValuation(userA, holdingId, { amount: 100 });
    expect(response.status).toBe(404);

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data: rows } = await admin
      .from("holding_valuation")
      .select("id")
      .eq("holding_id", holdingId);
    expect(rows).toHaveLength(0);
  });

  it("User A cannot read User B's Valuations directly, even with a matching holding_id guess", async () => {
    const holdingId = await createHolding(userB, { name: "B's holding" });
    await recordValuation(userB, holdingId, { amount: 5000 });

    const asUserA = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${userA.accessToken}` } } },
    );

    const { data } = await asUserA
      .from("holding_valuation")
      .select("id")
      .eq("holding_id", holdingId);
    expect(data).toEqual([]);
  });

  it("deleting a Holding cascades its Valuations", async () => {
    const holdingId = await createHolding(userA);
    await recordValuation(userA, holdingId, { amount: 100 });

    const deleteResponse = await DELETE_HOLDING(
      requestAs(userA, `${HOLDINGS_URL}/${holdingId}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: holdingId }) },
    );
    expect(deleteResponse.status).toBe(200);

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data: rows } = await admin
      .from("holding_valuation")
      .select("id")
      .eq("holding_id", holdingId);
    expect(rows).toHaveLength(0);
  });
});
