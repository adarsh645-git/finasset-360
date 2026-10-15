import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createTestUser, deleteTestUser, type TestUser } from "../fixtures/users";

// Seam 1 (design.md Testing Decisions): direct reads and writes under each
// User's own session against the real local Postgres with RLS on. No route
// is involved yet; these scenarios are about what the database itself allows.

function sessionFor(user: TestUser): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${user.accessToken}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}

async function must<T>(
  result: PromiseLike<{ data: T | null; error: { message: string } | null }>,
): Promise<T> {
  const { data, error } = await result;
  if (error || data === null) throw new Error(error?.message ?? "no row returned");
  return data;
}

type Seeded = { holdingId: string; liabilityId: string };

// One Holding, Position, Liability, pair of Valuations and Goal, written
// through the User's own session so the policies are what let it in.
async function seedRecords(user: TestUser): Promise<Seeded> {
  const db = sessionFor(user);
  const holding = await must(
    db
      .from("holding")
      .insert({ user_id: user.id, country: "US", asset_class: "stocks", name: "Brokerage" })
      .select("id")
      .single(),
  );
  await must(
    db
      .from("position")
      .insert({
        user_id: user.id,
        holding_id: holding.id,
        ticker: "AAPL",
        shares: 2,
        avg_cost: 100,
        sector: "Technology",
        name: "Apple",
      })
      .select("id")
      .single(),
  );
  await must(
    db
      .from("holding_valuation")
      .insert({ user_id: user.id, holding_id: holding.id, valued_on: "2026-01-01", value: 200, source: "user" })
      .select("id")
      .single(),
  );
  const liability = await must(
    db
      .from("liability")
      .insert({
        user_id: user.id,
        country: "US",
        name: "Car loan",
        principal: 5000,
        apr: 5,
        monthly_payment: 150,
        start_month: "2026-01-01",
      })
      .select("id")
      .single(),
  );
  await must(
    db
      .from("liability_valuation")
      .insert({ user_id: user.id, liability_id: liability.id, valued_on: "2026-01-01", balance: 5000 })
      .select("id")
      .single(),
  );
  await must(
    db.from("goal").insert({ user_id: user.id, name: "Retire", target_usd: 1_000_000 }).select("id").single(),
  );
  return { holdingId: holding.id, liabilityId: liability.id };
}

describe("portfolio records isolation", () => {
  let userA: TestUser;
  let userB: TestUser;
  let seededA: Seeded;

  beforeAll(async () => {
    userA = await createTestUser("records-a");
    userB = await createTestUser("records-b");
    seededA = await seedRecords(userA);
    await seedRecords(userB);
  });

  afterAll(async () => {
    await deleteTestUser(userA.id);
    await deleteTestUser(userB.id);
  });

  const perUserTables = ["holding", "position", "holding_valuation", "liability", "liability_valuation", "goal"];

  it.each(perUserTables)("DM-01 another User's %s rows are invisible", async (table) => {
    const { data, error } = await sessionFor(userB).from(table).select("user_id");
    expect(error).toBeNull();
    // B sees their own row, so a clean result is RLS at work, not an empty table.
    expect(data!.length).toBeGreaterThan(0);
    expect(data!.every((row) => row.user_id === userB.id)).toBe(true);
  });

  it("DM-03 a Valuation can't point at another User's Holding", async () => {
    const { error } = await sessionFor(userB)
      .from("holding_valuation")
      .insert({ user_id: userB.id, holding_id: seededA.holdingId, valued_on: "2026-02-01", value: 1, source: "user" });
    expect(error).not.toBeNull();
  });

  it("DM-03 a Liability link can't point at another User's Holding", async () => {
    const { error } = await sessionFor(userB)
      .from("liability")
      .insert({
        user_id: userB.id,
        country: "US",
        name: "Sneaky",
        principal: 1,
        apr: 0,
        monthly_payment: 1,
        start_month: "2026-01-01",
        linked_holding_id: seededA.holdingId,
      });
    expect(error).not.toBeNull();
  });

  it("DM-04 first sign-in creates a blank Portfolio", async () => {
    const fresh = await createTestUser("records-fresh");
    try {
      const { data, error } = await sessionFor(fresh).from("portfolio").select("*");
      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      const portfolio = data![0];
      expect(portfolio.user_id).toBe(fresh.id);
      for (const column of ["horizon_years", "savings_growth", "crypto_rate", "metals_rate", "other_rate"]) {
        expect(portfolio[column], column).toBeNull();
      }
      const { data: perCountry } = await sessionFor(fresh).from("country_assumption").select("*");
      expect(perCountry).toEqual([]);
    } finally {
      await deleteTestUser(fresh.id);
    }
  });

  it.each([
    ["US", "USD", 3, 4, 7, 3.5],
    ["IN", "INR", 5, 6, 11, 6.5],
  ])(
    "DM-05 the Country %s has currency %s and its defaults",
    async (code, currency, inflation, realestate, stocks, cash) => {
      const { data, error } = await sessionFor(userA).from("country").select("*").eq("code", code).single();
      expect(error).toBeNull();
      expect(data).toMatchObject({
        currency,
        default_inflation: inflation,
        default_realestate: realestate,
        default_stocks: stocks,
        default_cash: cash,
      });
    },
  );

  it("DM-05 the shared Country table is read-only for Users", async () => {
    const { error } = await sessionFor(userA).from("country").insert({
      code: "ZZ",
      name: "Nowhere",
      currency: "ZZZ",
      default_inflation: 1,
      default_realestate: 1,
      default_stocks: 1,
      default_cash: 1,
    });
    expect(error).not.toBeNull();
  });
});
