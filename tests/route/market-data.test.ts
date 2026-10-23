import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GET as GET_DAILY } from "@/app/api/cron/daily/route";
import { GET as GET_REFRESH_STOCK_SYMBOLS } from "@/app/api/cron/refresh-stock-symbols/route";
import { GET as GET_LOOKUP } from "@/app/api/tickers/lookup/route";
import { createTestUser, deleteTestUser, type TestUser } from "../fixtures/users";
import { requestAs } from "../fixtures/http";

const CRON_BASE = "http://localhost:3000/api/cron";
const LOOKUP_URL = "http://localhost:3000/api/tickers/lookup";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

function anonClientAs(user: TestUser) {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${user.accessToken}` } },
  });
}

// Unique per run so concurrent suites sharing the local database never collide.
const unique = `${Date.now()}${Math.floor(Math.random() * 1000)}`;

type FinnhubStub = {
  symbolList?: unknown[];
  profile?: Record<string, { finnhubIndustry: string }>;
  quote?: Record<string, number>;
  search?: Record<string, { description: string; symbol: string }[]>;
};

const originalFetch = global.fetch;
let finnhubCalls: string[] = [];

function stubFinnhub(stub: FinnhubStub) {
  finnhubCalls = [];
  global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === "string" ? input : input.toString());
    if (url.hostname !== "finnhub.io") return originalFetch(input, init);
    finnhubCalls.push(url.pathname + url.search);
    const symbol = url.searchParams.get("symbol") ?? "";
    switch (url.pathname) {
      case "/api/v1/stock/symbol":
        return Response.json(stub.symbolList ?? []);
      case "/api/v1/stock/profile2":
        return Response.json(stub.profile?.[symbol] ?? {});
      case "/api/v1/quote":
        return Response.json({ c: stub.quote?.[symbol] ?? 0 });
      case "/api/v1/search":
        return Response.json({ result: stub.search?.[url.searchParams.get("q") ?? ""] ?? [] });
      default:
        return new Response("unexpected", { status: 500 });
    }
  }) as typeof fetch;
}

afterEach(() => {
  global.fetch = originalFetch;
});

describe("shared market data RLS", () => {
  let user: TestUser;
  const symbol = `ZRLS${unique}`;
  const rateDate = `19${50 + (Number(unique) % 40)}-01-${String((Number(unique) % 27) + 1).padStart(2, "0")}`;

  beforeAll(async () => {
    user = await createTestUser("market-data-rls");
    const admin = adminClient();
    const now = new Date().toISOString();
    for (const result of [
      await admin.from("stock_symbol").insert({ symbol, name: "Z Rls Co", type: "Common Stock", updated_at: now }),
      await admin.from("price_cache").insert({ symbol, price: 10, currency: "USD", fetched_at: now }),
      await admin.from("fx_rate").upsert({ rate_date: rateDate, inr_per_usd: 80 }),
    ]) {
      if (result.error) throw result.error;
    }
  });

  afterAll(async () => {
    const admin = adminClient();
    await admin.from("stock_symbol").delete().eq("symbol", symbol);
    await admin.from("price_cache").delete().eq("symbol", symbol);
    await admin.from("fx_rate").delete().eq("rate_date", rateDate);
    await deleteTestUser(user.id);
  });

  const tables: {
    table: string;
    key: string;
    value: () => string;
    change: Record<string, unknown>;
    insert: () => Record<string, unknown>;
  }[] = [
    { table: "stock_symbol", key: "symbol", value: () => symbol, change: { name: "Hacked" }, insert: () => ({ symbol: `${symbol}B`, name: "B", type: "Common Stock", updated_at: new Date().toISOString() }) },
    { table: "price_cache", key: "symbol", value: () => symbol, change: { price: 1 }, insert: () => ({ symbol: `${symbol}B`, price: 1, currency: "USD", fetched_at: new Date().toISOString() }) },
    { table: "fx_rate", key: "rate_date", value: () => rateDate, change: { inr_per_usd: 1 }, insert: () => ({ rate_date: "1949-01-01", inr_per_usd: 1 }) },
  ];

  it.each(tables)("MD-01 a User can read but not write $table", async ({ table, key, value, change, insert }) => {
    const client = anonClientAs(user);

    const read = await client.from(table).select("*").eq(key, value());
    expect(read.error).toBeNull();
    expect(read.data).toHaveLength(1);

    const update = await client.from(table).update(change).eq(key, value()).select();
    expect(update.data ?? []).toHaveLength(0);
    const insertResult = await client.from(table).insert(insert());
    expect(insertResult.error).not.toBeNull();
    const del = await client.from(table).delete().eq(key, value()).select();
    expect(del.data ?? []).toHaveLength(0);

    const after = await client.from(table).select("*").eq(key, value());
    expect(after.data).toEqual(read.data);
  });
});

describe("cron secret", () => {
  const jobs = [
    { name: "daily", handler: GET_DAILY, url: `${CRON_BASE}/daily` },
    { name: "weekly symbol refresh", handler: GET_REFRESH_STOCK_SYMBOLS, url: `${CRON_BASE}/refresh-stock-symbols` },
  ];

  it.each(jobs)("MD-02 the $name job refuses a missing secret", async ({ handler, url }) => {
    stubFinnhub({ symbolList: [{ symbol: `ZNOAUTH${unique}`, description: "No Auth", type: "Common Stock", mic: "XNAS" }] });
    const response = await handler(new NextRequest(url));
    expect(response.status).toBe(401);
    expect(finnhubCalls).toEqual([]);
  });

  it.each(jobs)("MD-02 the $name job refuses a wrong secret", async ({ handler, url }) => {
    stubFinnhub({ symbolList: [{ symbol: `ZNOAUTH${unique}`, description: "No Auth", type: "Common Stock", mic: "XNAS" }] });
    const response = await handler(new NextRequest(url, { headers: { authorization: "Bearer not-the-secret" } }));
    expect(response.status).toBe(401);
    expect(finnhubCalls).toEqual([]);
  });
});

describe("weekly symbol refresh", () => {
  const aapl = `ZAAPL${unique}`;
  const jpm = `ZJPM${unique}`;

  afterAll(async () => {
    await adminClient().from("stock_symbol").delete().in("symbol", [aapl, jpm]);
  });

  it("MD-03 symbols are stored with their exchange and keep a resolved Sector", async () => {
    await adminClient().from("stock_symbol").insert({
      symbol: aapl, name: "Old Name", type: "Common Stock", sector: "Technology", updated_at: new Date().toISOString(),
    });
    stubFinnhub({
      symbolList: [
        { symbol: aapl, description: "Apple Inc.", type: "Common Stock", mic: "XNAS" },
        { symbol: jpm, description: "JPMorgan", type: "Common Stock", mic: "XNYS" },
      ],
    });

    const response = await GET_REFRESH_STOCK_SYMBOLS(
      new NextRequest(`${CRON_BASE}/refresh-stock-symbols`, { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }),
    );
    expect(response.status).toBe(200);

    const { data } = await adminClient().from("stock_symbol").select("*").in("symbol", [aapl, jpm]);
    const bySymbol = Object.fromEntries((data ?? []).map((row) => [row.symbol, row]));
    expect(bySymbol[aapl]).toMatchObject({ mic: "XNAS", sector: "Technology", name: "Apple Inc." });
    expect(bySymbol[jpm]).toMatchObject({ mic: "XNYS", sector: null });
  });
});

describe("GET /api/tickers/lookup", () => {
  let user: TestUser;
  const created: string[] = [];

  beforeAll(async () => {
    user = await createTestUser("ticker-lookup");
  });

  afterAll(async () => {
    const admin = adminClient();
    await admin.from("stock_symbol").delete().in("symbol", created);
    await admin.from("price_cache").delete().in("symbol", created);
    await deleteTestUser(user.id);
  });

  async function seedSymbol(symbol: string, row: { name: string; mic: string | null; sector: string | null }, price?: number) {
    created.push(symbol);
    const admin = adminClient();
    const now = new Date().toISOString();
    await admin.from("stock_symbol").insert({ symbol, type: "Common Stock", updated_at: now, ...row });
    if (price !== undefined) {
      await admin.from("price_cache").insert({ symbol, price, currency: "USD", fetched_at: now });
    }
  }

  function lookup(ticker: string, country: string) {
    return GET_LOOKUP(requestAs(user, `${LOOKUP_URL}?ticker=${encodeURIComponent(ticker)}&country=${country}`));
  }

  it("refuses a signed-out caller", async () => {
    const response = await GET_LOOKUP(new NextRequest(`${LOOKUP_URL}?ticker=AAPL&country=US`));
    expect(response.status).toBe(401);
  });

  it("MD-05 a known US ticker returns its name, Sector, exchange and price", async () => {
    const symbol = `ZK${unique}`;
    await seedSymbol(symbol, { name: "Apple Inc.", mic: "XNAS", sector: "Technology" }, 232.1);
    stubFinnhub({});

    const response = await lookup(symbol.toLowerCase(), "US");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      known: true,
      ticker: symbol,
      name: "Apple Inc.",
      sector: "Technology",
      exchange: "NASDAQ",
      price: { amount: 232.1, currency: "USD" },
    });
    expect(finnhubCalls).toEqual([]);
  });

  it("MD-06 an India ticker is unknown but named from search", async () => {
    const ticker = `ZINFY${unique}`;
    stubFinnhub({ search: { [`${ticker}.NS`]: [{ description: "Infosys Ltd", symbol: `${ticker}.NS` }] } });

    const response = await lookup(ticker, "IN");

    expect(await response.json()).toEqual({
      known: false,
      ticker: `${ticker}.NS`,
      name: "Infosys Ltd",
      exchange: "NSE",
    });
  });

  it("MD-07 an unknown ticker with no search match has no name", async () => {
    stubFinnhub({});

    const response = await lookup(`TDF${unique}`, "US");

    expect(await response.json()).toEqual({ known: false, ticker: `TDF${unique}`, name: null, exchange: null });
  });

  it("MD-08 a known ticker with no price gets its first price, cached for every User", async () => {
    const symbol = `ZNV${unique}`;
    await seedSymbol(symbol, { name: "Nvidia", mic: "XNAS", sector: "Technology" });
    stubFinnhub({ quote: { [symbol]: 128.2 } });

    const body = await (await lookup(symbol, "US")).json();

    expect(body.price).toEqual({ amount: 128.2, currency: "USD" });
    const { data } = await adminClient().from("price_cache").select("price").eq("symbol", symbol).single();
    expect(Number(data?.price)).toBe(128.2);
  });

  it("MD-04 a known ticker with no Sector gets one mapped from its industry and stored", async () => {
    const symbol = `ZSEC${unique}`;
    await seedSymbol(symbol, { name: "Chip Co", mic: "XNAS", sector: null }, 50);
    stubFinnhub({ profile: { [symbol]: { finnhubIndustry: "Semiconductors" } } });

    const body = await (await lookup(symbol, "US")).json();

    expect(body.sector).toBe("Technology");
    const { data } = await adminClient().from("stock_symbol").select("sector").eq("symbol", symbol).single();
    expect(data?.sector).toBe("Technology");
  });

  it("rejects a missing ticker or unsupported country", async () => {
    expect((await lookup("", "US")).status).toBe(400);
    expect((await lookup("AAPL", "FR")).status).toBe(400);
  });
});
