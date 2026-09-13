import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { POST as POST_CHECK_IN } from "@/app/api/check-in/route";
import { POST as POST_HOLDING } from "@/app/api/holdings/route";
import { POST as POST_VALUATION } from "@/app/api/holdings/[id]/valuations/route";
import { DEFAULT_ASSET_CLASS_ID } from "@/lib/asset-classes/defaults";
import { createTestUser, deleteTestUser, type TestUser } from "../fixtures/users";
import { jsonBody, requestAs } from "../fixtures/http";

const HOLDINGS_URL = "http://localhost:3000/api/holdings";
const CHECK_IN_URL = "http://localhost:3000/api/check-in";

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

function recordValuation(user: TestUser, holdingId: string, body: Record<string, unknown>) {
  return POST_VALUATION(
    requestAs(user, valuationsUrl(holdingId), { method: "POST", ...jsonBody(body) }),
    { params: Promise.resolve({ id: holdingId }) },
  );
}

function checkIn(user: TestUser) {
  return POST_CHECK_IN(requestAs(user, CHECK_IN_URL, { method: "POST" }));
}

/** Row count for a User's `check_in` rows, read with the service-role key —
 * used only to assert on DB state directly, mirroring
 * tests/fixtures/users.ts's `countPortfolioRows`. */
async function countHoldingValuationRows(holdingId: string): Promise<number> {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { count, error } = await admin
    .from("holding_valuation")
    .select("id", { count: "exact", head: true })
    .eq("holding_id", holdingId);
  if (error) throw error;
  return count ?? 0;
}

// Seam 2 from docs/SPEC.md: real requests against the real local Postgres,
// RLS actually enabled, mirrors tests/route/valuations.test.ts.
describe("POST /api/check-in", () => {
  let userA: TestUser;
  let userB: TestUser;

  beforeAll(async () => {
    [userA, userB] = await Promise.all([createTestUser("check-in-a"), createTestUser("check-in-b")]);
  });

  afterAll(async () => {
    await Promise.all([deleteTestUser(userA.id), deleteTestUser(userB.id)]);
  });

  it("rejects an unauthenticated request", async () => {
    const response = await POST_CHECK_IN(new NextRequest(CHECK_IN_URL, { method: "POST" }));
    expect(response.status).toBe(401);
  });

  it("reports no previous Check-in and a null delta on the first pass", async () => {
    const holdingId = await createHolding(userA);
    await recordValuation(userA, holdingId, { amount: 1000 });

    const response = await checkIn(userA);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.netWorth).toBe(1000);
    expect(body.previousNetWorth).toBeNull();
    expect(body.delta).toBeNull();
  });

  it("a pass with every value confirmed unchanged records zero new Valuations and reports a delta of zero", async () => {
    const holdingId = await createHolding(userA, { name: "Unchanged holding" });
    await recordValuation(userA, holdingId, { amount: 500 });

    const first = await checkIn(userA);
    expect(first.status).toBe(200);
    const firstBody = await first.json();

    // "Confirming an unchanged figure" never calls the record-Valuation
    // endpoint at all (user story 42) — simulated here simply by not
    // calling it again before the next pass completes.
    const second = await checkIn(userA);
    expect(second.status).toBe(200);
    const secondBody = await second.json();

    expect(secondBody.previousNetWorth).toBe(firstBody.netWorth);
    expect(secondBody.netWorth).toBe(firstBody.netWorth);
    expect(secondBody.delta).toBe(0);
    expect(await countHoldingValuationRows(holdingId)).toBe(1);
  });

  it("reports a nonzero delta when Net Worth moved between two passes", async () => {
    const holdingId = await createHolding(userA, { name: "Changed holding" });
    await recordValuation(userA, holdingId, { amount: 100 });
    const first = await checkIn(userA);
    const firstBody = await first.json();

    await recordValuation(userA, holdingId, { amount: 150 });
    const second = await checkIn(userA);
    const secondBody = await second.json();

    expect(secondBody.delta).toBe(secondBody.netWorth - firstBody.netWorth);
    expect(secondBody.delta).toBeGreaterThan(0);
  });

  it("keeps each User's Check-in history independent of the other's", async () => {
    const holdingId = await createHolding(userB, { name: "User B's holding" });
    await recordValuation(userB, holdingId, { amount: 42 });

    const response = await checkIn(userB);
    const body = await response.json();

    // userA has already completed several Check-ins above by this point in
    // the suite — userB's first pass must still see no previous Check-in.
    expect(body.previousNetWorth).toBeNull();
    expect(body.netWorth).toBe(42);
  });
});
