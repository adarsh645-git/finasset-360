import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { POST as createGoal } from "@/app/api/goals/route";
import { DELETE as deleteGoal } from "@/app/api/goals/[id]/route";
import { PATCH as patchAssumptions } from "@/app/api/projection-assumptions/route";
import { createTestUser, deleteTestUser, type TestUser } from "../fixtures/users";
import { jsonBody, requestAs } from "../fixtures/http";

// Seam 2: Route Handlers called as a signed-in User against the real local
// Postgres. Read-back goes through the User's own session (RLS on).

function sessionFor(user: TestUser): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${user.accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const post = (user: TestUser, body: unknown) =>
  createGoal(requestAs(user, "http://localhost:3000/api/goals", { method: "POST", ...jsonBody(body) }));

const remove = (user: TestUser, id: string) =>
  deleteGoal(requestAs(user, `http://localhost:3000/api/goals/${id}`, { method: "DELETE" }), {
    params: Promise.resolve({ id }),
  });

const patch = (user: TestUser, body: unknown) =>
  patchAssumptions(
    requestAs(user, "http://localhost:3000/api/projection-assumptions", { method: "PATCH", ...jsonBody(body) }),
  );

async function portfolioOf(user: TestUser) {
  const { data } = await sessionFor(user).from("portfolio").select("*").eq("user_id", user.id).single();
  return data!;
}

async function countryOf(user: TestUser, country: string) {
  const { data } = await sessionFor(user)
    .from("country_assumption")
    .select("*")
    .eq("user_id", user.id)
    .eq("country", country)
    .maybeSingle();
  return data;
}

async function goalsOf(user: TestUser) {
  const { data } = await sessionFor(user).from("goal").select("*").eq("user_id", user.id);
  return data!;
}

describe("Goals", () => {
  let user: TestUser;
  beforeAll(async () => {
    user = await createTestUser("goals");
  });
  afterAll(async () => {
    await deleteTestUser(user.id);
  });

  it.each([
    { name: "Quarter million", target: 250000, status: 201, stored: "Quarter million" },
    { name: "", target: 100000, status: 201, stored: null },
    { name: "Zero", target: 0, status: 400, stored: undefined },
    { name: "Negative", target: -5, status: 400, stored: undefined },
  ])("DM-34 Goal targets: $name / $target", async ({ name, target, status, stored }) => {
    const before = (await goalsOf(user)).length;
    const response = await post(user, { name, target_usd: target });
    expect(response.status).toBe(status);
    const goals = await goalsOf(user);
    if (status === 201) {
      expect(goals).toHaveLength(before + 1);
      const { id } = await response.json();
      const created = goals.find((g) => g.id === id)!;
      expect(created.name).toBe(stored);
      expect(Number(created.target_usd)).toBe(target);
    } else {
      expect(goals).toHaveLength(before);
    }
  });

  it("DM-35 Removing a Goal deletes it", async () => {
    const other = await createTestUser("goals-delete");
    try {
      const first = (await (await post(other, { name: "$100K net worth", target_usd: 100000 })).json()).id;
      await post(other, { name: "Half a million", target_usd: 500000 });

      const response = await remove(other, first);
      expect(response.status).toBe(200);

      const remaining = await goalsOf(other);
      expect(remaining.map((g) => g.name)).toEqual(["Half a million"]);
      expect(remaining.find((g) => g.id === first)).toBeUndefined();
    } finally {
      await deleteTestUser(other.id);
    }
  });
});

describe("Projection Assumptions", () => {
  let user: TestUser;
  beforeAll(async () => {
    user = await createTestUser("assumptions");
  });
  afterAll(async () => {
    await deleteTestUser(user.id);
  });

  it("DM-36 A partial update leaves the rest untouched", async () => {
    await patch(user, { horizon_years: 15, countries: { US: { stocks_rate: 8 } } });

    const response = await patch(user, { countries: { IN: { monthly_savings: 50000 } } });
    expect(response.status).toBe(200);

    expect(Number((await countryOf(user, "IN"))!.monthly_savings)).toBe(50000);
    expect(Number((await countryOf(user, "US"))!.stocks_rate)).toBe(8);
    expect((await portfolioOf(user)).horizon_years).toBe(15);
  });

  it("DM-37 Reset defaults blanks every field", async () => {
    const reset = await createTestUser("assumptions-reset");
    try {
      await patch(reset, {
        horizon_years: 20,
        savings_growth: 3,
        crypto_rate: 10,
        metals_rate: 4,
        other_rate: 2,
        countries: {
          US: { inflation: 2, realestate_rate: 5, stocks_rate: 8, cash_rate: 3, monthly_savings: 1000 },
          IN: { monthly_savings: 50000 },
        },
      });

      const blankCountry = {
        inflation: null,
        realestate_rate: null,
        stocks_rate: null,
        cash_rate: null,
        monthly_savings: null,
      };
      const response = await patch(reset, {
        horizon_years: null,
        savings_growth: null,
        crypto_rate: null,
        metals_rate: null,
        other_rate: null,
        countries: { US: blankCountry, IN: blankCountry },
      });
      expect(response.status).toBe(200);

      const p = await portfolioOf(reset);
      expect([p.horizon_years, p.savings_growth, p.crypto_rate, p.metals_rate, p.other_rate]).toEqual([
        null, null, null, null, null,
      ]);
      for (const code of ["US", "IN"]) {
        const row = (await countryOf(reset, code))!;
        expect([row.inflation, row.realestate_rate, row.stocks_rate, row.cash_rate, row.monthly_savings]).toEqual([
          null, null, null, null, null,
        ]);
      }
    } finally {
      await deleteTestUser(reset.id);
    }
  });

  it.each([
    { field: "US Stocks rate", body: { countries: { US: { stocks_rate: -50 } } }, status: 200 },
    { field: "US Stocks rate", body: { countries: { US: { stocks_rate: 50.5 } } }, status: 400 },
    { field: "Crypto rate", body: { crypto_rate: 0 }, status: 200 },
    { field: "horizon", body: { horizon_years: 40 }, status: 200 },
    { field: "horizon", body: { horizon_years: 0 }, status: 400 },
    { field: "horizon", body: { horizon_years: 41 }, status: 400 },
    { field: "horizon", body: { horizon_years: 12.5 }, status: 400 },
    { field: "India Monthly savings", body: { countries: { IN: { monthly_savings: -1 } } }, status: 400 },
    { field: "savings growth", body: { savings_growth: 3 }, status: 200 },
  ])("DM-38 Assumption ranges: $field $body -> $status", async ({ body, status }) => {
    const ranged = await createTestUser("assumptions-range");
    try {
      const response = await patch(ranged, body);
      expect(response.status).toBe(status);
    } finally {
      await deleteTestUser(ranged.id);
    }
  });
});
