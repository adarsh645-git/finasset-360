import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GET as GET_DAILY } from "@/app/api/cron/daily/route";
import { createTestUser, deleteTestUser, type TestUser } from "../fixtures/users";

const DAILY_URL = "http://localhost:3000/api/cron/daily";

const admin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const unique = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const today = new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);

type Stub = {
  /** Frankfurter's rates by date, or "down" for an outage. */
  fx?: Record<string, number> | "down";
  /** Finnhub quotes by symbol; "error" (or an unlisted symbol) answers HTTP 500. */
  quote?: Record<string, number | "error">;
};

const originalFetch = global.fetch;
let fxRequests: string[] = [];
let quoted: string[] = [];

function stub({ fx = {}, quote = {} }: Stub) {
  fxRequests = [];
  quoted = [];
  global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input.toString());
    if (url.hostname.includes("frankfurter")) {
      fxRequests.push(url.pathname + url.search);
      if (fx === "down") return new Response("down", { status: 503 });
      const rates = Object.fromEntries(Object.entries(fx).map(([date, rate]) => [date, { INR: rate }]));
      return Response.json({ base: "USD", rates });
    }
    if (url.hostname === "finnhub.io" && url.pathname === "/api/v1/quote") {
      const symbol = url.searchParams.get("symbol") ?? "";
      quoted.push(symbol);
      const price = quote[symbol];
      if (price === "error" || price === undefined) return new Response("error", { status: 500 });
      return Response.json({ c: price });
    }
    return originalFetch(input, init);
  }) as typeof fetch;
}

const runDaily = () =>
  GET_DAILY(new NextRequest(DAILY_URL, { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }));

afterEach(() => {
  global.fetch = originalFetch;
});

const seededSymbols = new Set<string>();

async function seedStocks(
  user: TestUser,
  country: string,
  positions: { ticker: string; shares: number; handPrice?: number }[],
  listed: string[],
  options: { archived?: boolean } = {},
): Promise<string> {
  const db = admin();
  const { data: holding, error } = await db
    .from("holding")
    .insert({
      user_id: user.id,
      country,
      asset_class: "stocks",
      name: `Daily ${unique}`,
      archived_at: options.archived ? new Date().toISOString() : null,
    })
    .select("id")
    .single();
  if (error) throw error;
  const inserted = await db.from("position").insert(
    positions.map((p) => ({
      user_id: user.id,
      holding_id: holding.id,
      ticker: p.ticker,
      shares: p.shares,
      avg_cost: 1,
      hand_price: p.handPrice ?? null,
      price_as_of: p.handPrice ? today : null,
      name: p.ticker,
    })),
  );
  if (inserted.error) throw inserted.error;
  const missing = listed.filter((t) => !seededSymbols.has(t));
  if (missing.length) {
    const now = new Date().toISOString();
    const symbols = await db
      .from("stock_symbol")
      .insert(missing.map((symbol) => ({ symbol, name: symbol, type: "Common Stock", updated_at: now })));
    if (symbols.error) throw symbols.error;
    missing.forEach((t) => seededSymbols.add(t));
  }
  return holding.id as string;
}

async function cachePrice(symbol: string, price: number) {
  const { error } = await admin()
    .from("price_cache")
    .upsert({ symbol, price, currency: "USD", fetched_at: new Date().toISOString() });
  if (error) throw error;
}

async function valuationsOf(holdingId: string) {
  const { data } = await admin()
    .from("holding_valuation")
    .select("value, source")
    .eq("holding_id", holdingId)
    .eq("valued_on", today);
  return (data ?? []).map((r) => ({ value: Number(r.value), source: r.source as string }));
}

async function cleanup(symbols: string[]) {
  const db = admin();
  await db.from("price_cache").delete().in("symbol", symbols);
  await db.from("stock_symbol").delete().in("symbol", symbols);
}

describe("daily job: FX Rate", () => {
  // The fx_rate table is shared by every suite, so these tests set its latest date themselves.
  async function clearFx() {
    const { error } = await admin().from("fx_rate").delete().gte("rate_date", "1900-01-01");
    if (error) throw error;
  }

  afterAll(clearFx);

  it("MD-10 today's rate is stored", async () => {
    await clearFx();
    await admin().from("fx_rate").insert({ rate_date: daysAgo(1), inr_per_usd: 83.1 });
    stub({ fx: { [today]: 83.4 } });

    expect((await runDaily()).status).toBe(200);

    expect(fxRequests[0]).toContain(`/${today}..`);
    const { data } = await admin().from("fx_rate").select("inr_per_usd").eq("rate_date", today).single();
    expect(Number(data?.inr_per_usd)).toBe(83.4);
  });

  it("MD-11 a missed run is filled in", async () => {
    await clearFx();
    await admin().from("fx_rate").insert({ rate_date: daysAgo(4), inr_per_usd: 83 });
    const filled = { [daysAgo(3)]: 83.1, [daysAgo(2)]: 83.2, [daysAgo(1)]: 83.3 };
    stub({ fx: filled });

    await runDaily();

    expect(fxRequests[0]).toContain(`/${daysAgo(3)}..`);
    const { data } = await admin().from("fx_rate").select("rate_date").order("rate_date");
    expect(data?.map((r) => r.rate_date)).toEqual([daysAgo(4), ...Object.keys(filled)]);
  });

  it("MD-12 an empty table is backfilled from 2018", async () => {
    await clearFx();
    const series = { "2018-01-02": 63.6, "2018-01-03": 63.5, [today]: 83.4 };
    stub({ fx: series });

    await runDaily();

    expect(fxRequests[0]).toContain(`/2018-01-01..${today}`);
    const { data } = await admin().from("fx_rate").select("rate_date").order("rate_date");
    expect(data?.map((r) => r.rate_date)).toEqual(Object.keys(series));
  });

  it("MD-13 an FX outage writes nothing and the other steps still run", async () => {
    await clearFx();
    await admin().from("fx_rate").insert({ rate_date: daysAgo(2), inr_per_usd: 83 });
    const user = await createTestUser("daily-fx-outage");
    const ticker = `ZOUT${unique}`;
    try {
      const holdingId = await seedStocks(user, "US", [{ ticker, shares: 10 }], [ticker]);
      stub({ fx: "down", quote: { [ticker]: 20 } });

      const response = await runDaily();

      expect(response.status).toBe(200);
      const fx = await admin().from("fx_rate").select("rate_date");
      expect(fx.data?.map((r) => r.rate_date)).toEqual([daysAgo(2)]);
      const price = await admin().from("price_cache").select("price").eq("symbol", ticker).single();
      expect(Number(price.data?.price)).toBe(20);
      expect(await valuationsOf(holdingId)).toEqual([{ value: 200, source: "cron" }]);
    } finally {
      await cleanup([ticker]);
      await deleteTestUser(user.id);
    }
  });
});

describe("daily job: prices and snapshots", () => {
  let userA: TestUser;
  let userB: TestUser;
  const aapl = `ZAAPL${unique}`;
  const infy = `ZINFY${unique}.NS`;
  const tsla = `ZTSLA${unique}`;

  beforeAll(async () => {
    userA = await createTestUser("daily-a");
    userB = await createTestUser("daily-b");
  });

  afterAll(async () => {
    await cleanup([aapl, infy, tsla]);
    await deleteTestUser(userA.id);
    await deleteTestUser(userB.id);
  });

  it("MD-14 only held, listed tickers are quoted", async () => {
    await seedStocks(userA, "US", [{ ticker: aapl, shares: 10 }], [aapl]);
    await seedStocks(userB, "IN", [{ ticker: infy, shares: 90, handPrice: 1880 }], []);
    await seedStocks(userA, "US", [{ ticker: tsla, shares: 5 }], [tsla], { archived: true });
    stub({ quote: { [aapl]: 232.1 } });

    await runDaily();

    expect(quoted).toContain(aapl);
    expect(quoted).not.toContain(infy);
    expect(quoted).not.toContain(tsla);
  });

  it("MD-15 a failed quote keeps the last price and records the error", async () => {
    await cachePrice(aapl, 230);
    stub({ quote: { [aapl]: "error" } });

    await runDaily();

    const { data } = await admin().from("price_cache").select("price, last_error").eq("symbol", aapl).single();
    expect(Number(data?.price)).toBe(230);
    expect(data?.last_error).toMatch(/Finnhub/);
  });

  it("MD-16 snapshots every User's Stocks Holdings", async () => {
    const a = await seedStocks(userA, "US", [{ ticker: aapl, shares: 10 }], [aapl]);
    const b = await seedStocks(userB, "IN", [{ ticker: infy, shares: 90, handPrice: 1880 }], []);
    stub({ quote: { [aapl]: 232.1 } });

    await runDaily();

    expect(await valuationsOf(a)).toEqual([{ value: 2321, source: "cron" }]);
    expect(await valuationsOf(b)).toEqual([{ value: 169200, source: "cron" }]);
  });

  it("MD-17 a failed quote still yields a snapshot from the cached price", async () => {
    const h = await seedStocks(userA, "US", [{ ticker: aapl, shares: 10 }], [aapl]);
    await cachePrice(aapl, 230);
    stub({ quote: { [aapl]: "error" } });

    await runDaily();

    expect(await valuationsOf(h)).toEqual([{ value: 2300, source: "cron" }]);
  });

  it("MD-18 skips archived and manual Holdings and reruns safely", async () => {
    const archived = await seedStocks(userA, "US", [{ ticker: aapl, shares: 1 }], [aapl], { archived: true });
    const active = await seedStocks(userA, "US", [{ ticker: aapl, shares: 2 }], [aapl]);
    const cash = await admin()
      .from("holding")
      .insert({ user_id: userA.id, country: "US", asset_class: "cash", name: `Cash ${unique}` })
      .select("id")
      .single();
    if (cash.error) throw cash.error;
    stub({ quote: { [aapl]: 100 } });

    await runDaily();
    await runDaily();

    expect(await valuationsOf(archived)).toEqual([]);
    expect(await valuationsOf(cash.data.id)).toEqual([]);
    expect(await valuationsOf(active)).toEqual([{ value: 200, source: "cron" }]);
  });

  it("MD-19 marks snapshots automatic and never overwrites a User's mark", async () => {
    const s1 = await seedStocks(userA, "US", [{ ticker: aapl, shares: 10 }], [aapl]);
    const s2 = await seedStocks(userB, "US", [{ ticker: aapl, shares: 10 }], [aapl]);
    const saved = await admin()
      .from("holding_valuation")
      .insert({ user_id: userB.id, holding_id: s2, valued_on: today, value: 1, source: "user" });
    if (saved.error) throw saved.error;
    stub({ quote: { [aapl]: 50 } });

    await runDaily();

    expect(await valuationsOf(s1)).toEqual([{ value: 500, source: "cron" }]);
    expect(await valuationsOf(s2)).toEqual([{ value: 500, source: "user" }]);
  });
});
