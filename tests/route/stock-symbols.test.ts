import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GET as GET_REFRESH_STOCK_SYMBOLS } from "@/app/api/cron/refresh-stock-symbols/route";
import { GET as GET_SECTOR } from "@/app/api/stock-symbols/[symbol]/sector/route";
import { GET as GET_STOCK_SYMBOLS } from "@/app/api/stock-symbols/route";
import { createTestUser, deleteTestUser, type TestUser } from "../fixtures/users";
import { requestAs } from "../fixtures/http";

const STOCK_SYMBOLS_URL = "http://localhost:3000/api/stock-symbols";
const CRON_URL = "http://localhost:3000/api/cron/refresh-stock-symbols";

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

// Ticket 18 — same seam 2 pattern as tests/route/price-cache.test.ts: real
// requests against the real local Postgres with RLS actually enabled.
describe("stock_symbol RLS", () => {
  let user: TestUser;
  const suffix = Date.now();
  const symbol = `ZTEST${suffix}`;

  beforeAll(async () => {
    user = await createTestUser("stock-symbol-rls");
    const { error } = await adminClient()
      .from("stock_symbol")
      .insert({ symbol, name: "Z Test Rls Co", type: "Common Stock", sector: null, updated_at: new Date().toISOString() });
    if (error) throw error;
  });

  afterAll(async () => {
    await adminClient().from("stock_symbol").delete().eq("symbol", symbol);
    await deleteTestUser(user.id);
  });

  it("is readable by an authenticated client", async () => {
    const { data, error } = await anonClientAs(user).from("stock_symbol").select("*").eq("symbol", symbol);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("is not writable by an authenticated client, including with a client-side key", async () => {
    const insertResult = await anonClientAs(user)
      .from("stock_symbol")
      .insert({ symbol: `${symbol}-blocked`, name: "Blocked", type: "Common Stock", updated_at: new Date().toISOString() });
    expect(insertResult.error).not.toBeNull();
  });
});

describe("GET /api/stock-symbols", () => {
  let user: TestUser;
  const suffix = Date.now();
  const appleSymbol = `AAPL${suffix}`;
  const otherSymbol = `MSFT${suffix}`;

  beforeAll(async () => {
    user = await createTestUser("stock-symbols-search");
    const updatedAt = new Date().toISOString();
    const { error } = await adminClient()
      .from("stock_symbol")
      .insert([
        { symbol: appleSymbol, name: `Apple Search Co ${suffix}`, type: "Common Stock", sector: null, updated_at: updatedAt },
        { symbol: otherSymbol, name: `Microsoft Search Co ${suffix}`, type: "Common Stock", sector: "Technology", updated_at: updatedAt },
      ]);
    if (error) throw error;
  });

  afterAll(async () => {
    await adminClient().from("stock_symbol").delete().in("symbol", [appleSymbol, otherSymbol]);
    await deleteTestUser(user.id);
  });

  it("rejects a request with no session", async () => {
    const response = await GET_STOCK_SYMBOLS(new NextRequest(`${STOCK_SYMBOLS_URL}?q=${appleSymbol}`));
    expect(response.status).toBe(401);
  });

  it("returns an empty list for a blank query", async () => {
    const response = await GET_STOCK_SYMBOLS(requestAs(user, `${STOCK_SYMBOLS_URL}?q=`));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
  });

  it("matches by ticker prefix", async () => {
    const response = await GET_STOCK_SYMBOLS(requestAs(user, `${STOCK_SYMBOLS_URL}?q=${appleSymbol}`));
    expect(response.status).toBe(200);
    const matches = await response.json();
    expect(matches).toContainEqual(
      expect.objectContaining({ symbol: appleSymbol, name: `Apple Search Co ${suffix}`, sector: null }),
    );
  });

  it("matches by company-name substring and includes a cached Sector", async () => {
    const response = await GET_STOCK_SYMBOLS(requestAs(user, `${STOCK_SYMBOLS_URL}?q=Microsoft Search Co ${suffix}`));
    expect(response.status).toBe(200);
    const matches = await response.json();
    expect(matches).toContainEqual(
      expect.objectContaining({ symbol: otherSymbol, sector: "Technology" }),
    );
  });

  it("reports a resolved-but-blank Sector as null, not the internal '' sentinel", async () => {
    const blankSectorSymbol = `BLANK${suffix}`;
    const { error } = await adminClient()
      .from("stock_symbol")
      .insert({ symbol: blankSectorSymbol, name: `Blank Sector Co ${suffix}`, type: "Common Stock", sector: "", updated_at: new Date().toISOString() });
    if (error) throw error;

    try {
      const response = await GET_STOCK_SYMBOLS(requestAs(user, `${STOCK_SYMBOLS_URL}?q=${blankSectorSymbol}`));
      expect(response.status).toBe(200);
      const matches = await response.json();
      expect(matches).toContainEqual(expect.objectContaining({ symbol: blankSectorSymbol, sector: null }));
    } finally {
      await adminClient().from("stock_symbol").delete().eq("symbol", blankSectorSymbol);
    }
  });
});

describe("GET /api/stock-symbols/[symbol]/sector", () => {
  let user: TestUser;
  let originalFetch: typeof fetch;

  beforeAll(async () => {
    user = await createTestUser("stock-symbol-sector");
  });

  afterAll(async () => {
    await deleteTestUser(user.id);
  });

  afterEach(async () => {
    if (originalFetch) global.fetch = originalFetch;
  });

  function requestFor(symbol: string) {
    return requestAs(user, `${STOCK_SYMBOLS_URL}/${symbol}/sector`);
  }

  async function callSector(symbol: string) {
    return GET_SECTOR(requestFor(symbol), {
      params: Promise.resolve({ symbol }),
    });
  }

  it("404s for a symbol not in stock_symbol", async () => {
    const response = await callSector(`UNKNOWN${Date.now()}`);
    expect(response.status).toBe(404);
  });

  it("returns the cached Sector without calling Finnhub", async () => {
    const symbol = `CACHED${Date.now()}`;
    await adminClient()
      .from("stock_symbol")
      .insert({ symbol, name: "Cached Co", type: "Common Stock", sector: "Financial Services", updated_at: new Date().toISOString() });

    let finnhubCalled = false;
    originalFetch = global.fetch;
    global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("finnhub.io")) finnhubCalled = true;
      return originalFetch(input, init);
    }) as typeof fetch;

    try {
      const response = await callSector(symbol);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ sector: "Financial Services" });
      expect(finnhubCalled).toBe(false);
    } finally {
      await adminClient().from("stock_symbol").delete().eq("symbol", symbol);
    }
  });

  it("resolves via Finnhub once, caches it, and reports a blank industry as sector: null", async () => {
    const symbol = `RESOLVE${Date.now()}`;
    await adminClient()
      .from("stock_symbol")
      .insert({ symbol, name: "Resolve Co", type: "Common Stock", sector: null, updated_at: new Date().toISOString() });

    let finnhubCallCount = 0;
    originalFetch = global.fetch;
    global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("finnhub.io/api/v1/stock/profile2")) {
        finnhubCallCount += 1;
        return new Response(JSON.stringify({ finnhubIndustry: "" }), { status: 200 });
      }
      return originalFetch(input, init);
    }) as typeof fetch;

    try {
      const first = await callSector(symbol);
      expect(first.status).toBe(200);
      expect(await first.json()).toEqual({ sector: null });
      expect(finnhubCallCount).toBe(1);

      const { data } = await adminClient().from("stock_symbol").select("sector").eq("symbol", symbol).single();
      expect(data?.sector).toBe("");

      const second = await callSector(symbol);
      expect(second.status).toBe(200);
      expect(await second.json()).toEqual({ sector: null });
      expect(finnhubCallCount).toBe(1);
    } finally {
      await adminClient().from("stock_symbol").delete().eq("symbol", symbol);
    }
  });
});

describe("GET /api/cron/refresh-stock-symbols", () => {
  it("rejects a request with no CRON_SECRET bearer token", async () => {
    const response = await GET_REFRESH_STOCK_SYMBOLS(new NextRequest(CRON_URL));
    expect(response.status).toBe(401);
  });

  it("rejects a request with the wrong bearer token", async () => {
    const response = await GET_REFRESH_STOCK_SYMBOLS(
      new NextRequest(CRON_URL, { headers: { authorization: "Bearer not-the-secret" } }),
    );
    expect(response.status).toBe(401);
  });

  it("upserts Finnhub's symbol list into stock_symbol without touching sector", async () => {
    const symbol = `CRON${Date.now()}`;
    const originalFetch = global.fetch;
    global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("finnhub.io/api/v1/stock/symbol")) {
        return new Response(
          JSON.stringify([{ symbol, description: "Cron Test Co", type: "Common Stock" }]),
          { status: 200 },
        );
      }
      return originalFetch(input, init);
    }) as typeof fetch;

    try {
      const response = await GET_REFRESH_STOCK_SYMBOLS(
        new NextRequest(CRON_URL, { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }),
      );
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ refreshed: 1 });

      const { data } = await adminClient().from("stock_symbol").select("*").eq("symbol", symbol).single();
      expect(data).toMatchObject({ symbol, name: "Cron Test Co", type: "Common Stock", sector: null });
    } finally {
      global.fetch = originalFetch;
      await adminClient().from("stock_symbol").delete().eq("symbol", symbol);
    }
  });

  it("leaves an already-resolved sector untouched when re-upserting the same symbol", async () => {
    const symbol = `CRON-RESECTOR${Date.now()}`;
    await adminClient()
      .from("stock_symbol")
      .insert({ symbol, name: "Stale Name Co", type: "Common Stock", sector: "Healthcare", updated_at: new Date().toISOString() });

    const originalFetch = global.fetch;
    global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("finnhub.io/api/v1/stock/symbol")) {
        return new Response(
          JSON.stringify([{ symbol, description: "Refreshed Name Co", type: "Common Stock" }]),
          { status: 200 },
        );
      }
      return originalFetch(input, init);
    }) as typeof fetch;

    try {
      const response = await GET_REFRESH_STOCK_SYMBOLS(
        new NextRequest(CRON_URL, { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }),
      );
      expect(response.status).toBe(200);

      const { data } = await adminClient().from("stock_symbol").select("*").eq("symbol", symbol).single();
      expect(data).toMatchObject({ name: "Refreshed Name Co", sector: "Healthcare" });
    } finally {
      global.fetch = originalFetch;
      await adminClient().from("stock_symbol").delete().eq("symbol", symbol);
    }
  });
});
