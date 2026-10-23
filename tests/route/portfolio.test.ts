import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { GET as getPortfolio } from "@/app/api/portfolio/route";
import { loadPortfolio } from "@/lib/read-model/load-portfolio";
import type { PortfolioData } from "@/lib/read-model/types";
import { requestAs } from "../fixtures/http";
import { createTestUser, deleteTestUser, type TestUser } from "../fixtures/users";

// Seam 1 (design.md Testing Decisions): GET /api/portfolio against the real
// local Postgres with RLS on. Records are seeded with the service-role client
// (so Valuations can carry past dates and sources); everything asserted comes
// back through the route. Shared tables (price_cache, stock_symbol, fx_rate)
// are touched only with unique tickers or restored dates. Run serially
// (`--no-file-parallelism`), since the FX tests borrow rows of a shared table.

const ENDPOINT = "http://localhost:3000/api/portfolio";

function admin(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

function sessionFor(user: TestUser): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${user.accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function read(user: TestUser): Promise<PortfolioData> {
  const response = await getPortfolio(requestAs(user, ENDPOINT));
  expect(response.status).toBe(200);
  return (await response.json()) as PortfolioData;
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

async function must<T>(result: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<NonNullable<T>> {
  const { data, error } = await result;
  if (error || data === null || data === undefined) throw new Error(error?.message ?? "no data");
  return data as NonNullable<T>;
}

async function addHolding(user: TestUser, fields: Record<string, unknown>): Promise<string> {
  const row = await must(
    admin()
      .from("holding")
      .insert({ user_id: user.id, country: "US", ...fields })
      .select("id")
      .single(),
  );
  return row.id as string;
}

async function addValuations(
  user: TestUser,
  holdingId: string,
  rows: { on: string; value: number; source?: "user" | "cron" }[],
) {
  await must(
    admin()
      .from("holding_valuation")
      .insert(
        rows.map((r) => ({
          user_id: user.id,
          holding_id: holdingId,
          valued_on: r.on,
          value: r.value,
          source: r.source ?? "user",
        })),
      )
      .select("id"),
  );
}

async function addLiability(user: TestUser, fields: Record<string, unknown>): Promise<string> {
  const row = await must(
    admin()
      .from("liability")
      .insert({
        user_id: user.id,
        country: "US",
        name: "Loan",
        principal: 10000,
        apr: 5,
        monthly_payment: 100,
        start_month: "2026-01-01",
        ...fields,
      })
      .select("id")
      .single(),
  );
  return row.id as string;
}

async function addBalances(user: TestUser, liabilityId: string, rows: { on: string; balance: number }[]) {
  await must(
    admin()
      .from("liability_valuation")
      .insert(rows.map((r) => ({ user_id: user.id, liability_id: liabilityId, valued_on: r.on, balance: r.balance })))
      .select("id"),
  );
}

const unique = Math.random().toString(36).slice(2, 8).toUpperCase();
const tickers = {
  aapl: `RMAAPL${unique}`,
  fund: `RMTDF${unique}`,
  infy: `RMINFY${unique}.NS`,
};

let user: TestUser;
let other: TestUser;

beforeAll(async () => {
  user = await createTestUser("portfolio");
  other = await createTestUser("portfolio-other");
  const db = admin();
  await must(
    db
      .from("stock_symbol")
      .insert({
        symbol: tickers.aapl,
        name: "Apple Inc",
        type: "Common Stock",
        mic: "XNAS",
        sector: "Technology",
        updated_at: new Date().toISOString(),
      })
      .select("symbol"),
  );
  await must(
    db
      .from("price_cache")
      .insert({ symbol: tickers.aapl, price: 232.1, currency: "USD", fetched_at: new Date().toISOString() })
      .select("symbol"),
  );
});

afterAll(async () => {
  const db = admin();
  const symbols = Object.values(tickers);
  await db.from("price_cache").delete().in("symbol", symbols);
  await db.from("stock_symbol").delete().in("symbol", symbols);
  await deleteTestUser(user.id);
  await deleteTestUser(other.id);
});

describe("GET /api/portfolio", () => {
  it("RM-01 a new User's Portfolio is empty", async () => {
    const fresh = await createTestUser("portfolio-fresh");
    try {
      const data = await read(fresh);
      expect(data.holdings).toEqual([]);
      expect(data.liabilities).toEqual([]);
      expect(data.goals).toEqual([]);
      expect(data.countries.map((c) => c.code).sort()).toEqual(["IN", "US"]);
      const us = data.countries.find((c) => c.code === "US")!;
      expect(us).toMatchObject({ currency: "USD", defaults: { inflation: 3, realestate: 4, stocks: 7, cash: 3.5 } });
      expect(data.assumptions).toEqual({
        horizonYears: null,
        savingsGrowth: null,
        shared: { crypto: null, metals: null, other: null },
        byCountry: {
          US: { inflation: null, realestate: null, stocks: null, cash: null, monthlySavings: null },
          IN: { inflation: null, realestate: null, stocks: null, cash: null, monthlySavings: null },
        },
      });
      expect(data.today).toBe(daysAgo(0));
    } finally {
      await deleteTestUser(fresh.id);
    }
  });

  it("RM-02 only the User's own records come back", async () => {
    await addHolding(other, { asset_class: "cash", name: "Other's cash" });
    await addLiability(other, { name: "Other's loan" });
    await must(admin().from("goal").insert({ user_id: other.id, target_usd: 777 }).select("id"));
    const mine = await addHolding(user, { asset_class: "cash", name: "My cash" });

    const data = await read(user);
    expect(data.holdings.map((h) => h.id)).toContain(mine);
    expect(data.holdings.map((h) => h.name)).not.toContain("Other's cash");
    expect(data.liabilities.map((l) => l.name)).not.toContain("Other's loan");
    expect(data.goals.map((g) => g.targetUsd)).not.toContain(777);

    const theirs = await read(other);
    expect(theirs.holdings.map((h) => h.name)).toEqual(["Other's cash"]);
    expect(theirs.liabilities.map((l) => l.name)).toEqual(["Other's loan"]);
    expect(theirs.goals.map((g) => g.targetUsd)).toEqual([777]);
  });

  it("RM-03 no session, no Portfolio", async () => {
    const response = await getPortfolio(new NextRequest(ENDPOINT));
    expect(response.status).toBe(401);
  });

  it("RM-04 a Stocks Holding is valued from its Positions", async () => {
    const id = await addHolding(user, { asset_class: "stocks", name: "Brokerage RM-04" });
    await must(
      admin()
        .from("position")
        .insert([
          {
            user_id: user.id,
            holding_id: id,
            ticker: tickers.aapl,
            shares: 30,
            avg_cost: 165,
            sector: "Other",
            name: "stored name",
          },
          {
            user_id: user.id,
            holding_id: id,
            ticker: tickers.fund,
            shares: 100,
            avg_cost: 40,
            hand_price: 45,
            price_as_of: "2026-09-01",
            sector: "Financials",
            name: "Target Date 2055",
          },
        ])
        .select("id"),
    );

    const holding = (await read(user)).holdings.find((h) => h.id === id)!;
    expect(holding.currentValue).toBeCloseTo(11463, 6);
    expect(holding.costBasis).toBeCloseTo(8950, 6);
    const market = holding.positions.find((p) => p.ticker === tickers.aapl)!;
    expect(market).toMatchObject({
      price: 232.1,
      priceSource: "market",
      priceAsOf: null,
      name: "Apple Inc",
      sector: "Technology",
      exchange: "NASDAQ",
    });
    const hand = holding.positions.find((p) => p.ticker === tickers.fund)!;
    expect(hand).toMatchObject({
      price: 45,
      priceSource: "hand",
      priceAsOf: "2026-09-01",
      name: "Target Date 2055",
      sector: "Financials",
    });
  });

  it("RM-05 a manually valued Holding's value is its latest Valuation", async () => {
    const id = await addHolding(user, {
      asset_class: "realestate",
      name: "Flat RM-05",
      property_type: "Residential",
      city: "Pune",
      cost_basis: 4_800_000,
      country: "IN",
    });
    await addValuations(user, id, [
      { on: daysAgo(365), value: 6_000_000 },
      { on: daysAgo(10), value: 6_200_000 },
    ]);

    const holding = (await read(user)).holdings.find((h) => h.id === id)!;
    expect(holding).toMatchObject({
      currentValue: 6_200_000,
      costBasis: 4_800_000,
      currency: "INR",
      propertyType: "Residential",
      city: "Pune",
      assetClass: "realestate",
    });
    expect(holding.valuations).toEqual([
      { date: daysAgo(365), value: 6_000_000, source: "user" },
      { date: daysAgo(10), value: 6_200_000, source: "user" },
    ]);
  });

  it("RM-12 Valuations say who recorded them", async () => {
    const id = await addHolding(user, { asset_class: "stocks", name: "Brokerage RM-12" });
    await addValuations(user, id, [
      { on: daysAgo(21), value: 100, source: "user" },
      { on: daysAgo(20), value: 101, source: "cron" },
      { on: daysAgo(19), value: 102, source: "cron" },
    ]);

    const holding = (await read(user)).holdings.find((h) => h.id === id)!;
    expect(holding.valuations.map((v) => v.source)).toEqual(["user", "cron", "cron"]);
  });

  it("RM-06 a loan's balance is as recorded", async () => {
    const home = await addHolding(user, { asset_class: "cash", name: "Linked RM-06" });
    const id = await addLiability(user, {
      name: "Car RM-06",
      apr: 5.9,
      monthly_payment: 501,
      start_month: "2026-03-01",
      revolving: true,
      linked_holding_id: home,
    });
    await addBalances(user, id, [
      { on: daysAgo(180), balance: 9600 },
      { on: daysAgo(40), balance: 9100 },
    ]);

    const loan = (await read(user)).liabilities.find((l) => l.id === id)!;
    expect(loan).toMatchObject({
      currentBalance: 9100,
      apr: 5.9,
      monthlyPayment: 501,
      startMonth: "2026-03-01",
      revolving: true,
      linkedHoldingId: home,
      currency: "USD",
      archivedAt: null,
    });
    expect(loan.valuations).toEqual([
      { date: daysAgo(180), value: 9600, source: "user" },
      { date: daysAgo(40), value: 9100, source: "user" },
    ]);
  });

  it("RM-07 an archived Holding is still returned", async () => {
    const id = await addHolding(user, {
      asset_class: "cash",
      name: "Old RM-07",
      archived_at: new Date(Date.now() - 7 * 86_400_000).toISOString(),
    });
    await addValuations(user, id, [
      { on: daysAgo(60), value: 10 },
      { on: daysAgo(30), value: 20 },
    ]);

    const holding = (await read(user)).holdings.find((h) => h.id === id)!;
    expect(holding.archivedAt).not.toBeNull();
    expect(holding.valuations.map((v) => v.value)).toEqual([10, 20]);
  });

  describe("FX Rates", () => {
    // fx_rate is shared: the rows in a window are set aside, replaced, and put back.
    async function withFxWindow(
      from: string,
      to: string,
      rows: { rate_date: string; inr_per_usd: number }[],
      run: () => Promise<void>,
    ) {
      const db = admin();
      const saved = await must(db.from("fx_rate").select("*").gte("rate_date", from).lte("rate_date", to));
      await must(db.from("fx_rate").delete().gte("rate_date", from).lte("rate_date", to).select("rate_date"));
      await must(db.from("fx_rate").insert(rows).select("rate_date"));
      try {
        await run();
      } finally {
        await db.from("fx_rate").delete().gte("rate_date", from).lte("rate_date", to);
        if (saved.length) await db.from("fx_rate").insert(saved);
      }
    }

    it("RM-08 a missed fetch shows its date", async () => {
      await withFxWindow("2026-10-01", "2026-10-14", [{ rate_date: "2026-10-10", inr_per_usd: 83.4 }], async () => {
        const data = await loadPortfolio(sessionFor(user), "2026-10-14");
        expect(data.today).toBe("2026-10-14");
        expect(data.fx.today).toEqual({ rate: 83.4, asOf: "2026-10-10" });
      });
    });

    it("RM-09 FX history covers the earliest Valuation", async () => {
      const fresh = await createTestUser("portfolio-fx");
      try {
        const id = await addHolding(fresh, { asset_class: "cash", name: "Early RM-09" });
        await addValuations(fresh, id, [{ on: "2024-03-03", value: 5 }]);
        await withFxWindow(
          "2024-02-20",
          "2024-03-10",
          [
            { rate_date: "2024-02-29", inr_per_usd: 82.9 },
            { rate_date: "2024-03-01", inr_per_usd: 83.1 },
            { rate_date: "2024-03-04", inr_per_usd: 83.2 },
          ],
          async () => {
            const data = await loadPortfolio(sessionFor(fresh), daysAgo(0));
            expect(data.fx.history[0]).toEqual({ date: "2024-03-01", rate: 83.1 });
            expect(data.fx.history[1]).toEqual({ date: "2024-03-04", rate: 83.2 });
            const dates = data.fx.history.map((p) => p.date);
            expect(dates).toEqual([...dates].sort());
            expect(data.fx.today!.asOf).toBe(dates[dates.length - 1]);
          },
        );
      } finally {
        await deleteTestUser(fresh.id);
      }
    });
  });

  it("RM-10 blank and filled assumptions", async () => {
    const fresh = await createTestUser("portfolio-assumptions");
    try {
      await must(
        sessionFor(fresh)
          .from("country_assumption")
          .insert({ user_id: fresh.id, country: "US", stocks_rate: 8, monthly_savings: 3000 })
          .select("country"),
      );

      const data = await read(fresh);
      expect(data.assumptions.byCountry.US).toEqual({
        inflation: null,
        realestate: null,
        stocks: 8,
        cash: null,
        monthlySavings: 3000,
      });
      expect(data.assumptions.byCountry.IN.stocks).toBeNull();
      expect(data.assumptions.shared.crypto).toBeNull();
      expect(data.assumptions.savingsGrowth).toBeNull();
      expect(data.assumptions.horizonYears).toBeNull();
      expect(data.countries.find((c) => c.code === "US")!.defaults.stocks).toBe(7);
    } finally {
      await deleteTestUser(fresh.id);
    }
  });

  it("RM-11 Goals come in target order", async () => {
    const fresh = await createTestUser("portfolio-goals");
    try {
      await must(
        admin()
          .from("goal")
          .insert([
            { user_id: fresh.id, name: "Half a million", target_usd: 500_000 },
            { user_id: fresh.id, name: null, target_usd: 100_000 },
            { user_id: fresh.id, name: "Quarter million", target_usd: 250_000 },
          ])
          .select("id"),
      );
      const data = await read(fresh);
      expect(data.goals.map((g) => [g.name, g.targetUsd])).toEqual([
        [null, 100_000],
        ["Quarter million", 250_000],
        ["Half a million", 500_000],
      ]);
    } finally {
      await deleteTestUser(fresh.id);
    }
  });

  it("MD-09 a feed price overrides a Hand Price", async () => {
    const id = await addHolding(user, { asset_class: "stocks", name: "India MD-09", country: "IN" });
    await must(
      admin()
        .from("position")
        .insert({
          user_id: user.id,
          holding_id: id,
          ticker: tickers.infy,
          shares: 10,
          avg_cost: 1500,
          hand_price: 1880,
          price_as_of: daysAgo(47),
          sector: "Technology",
          name: "Infosys",
        })
        .select("id"),
    );
    const before = (await read(user)).holdings.find((h) => h.id === id)!;
    expect(before.currentValue).toBe(18800);
    expect(before.positions[0].priceSource).toBe("hand");

    await must(
      admin()
        .from("price_cache")
        .insert({ symbol: tickers.infy, price: 1900, currency: "INR", fetched_at: new Date().toISOString() })
        .select("symbol"),
    );
    const after = (await read(user)).holdings.find((h) => h.id === id)!;
    expect(after.currentValue).toBe(19000);
    expect(after.positions[0]).toMatchObject({ price: 1900, priceSource: "market", priceAsOf: null });
  });
});
