import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GET as GET_REFRESH_PRICES } from "@/app/api/cron/refresh-prices/route";
import { POST as POST_HOLDING } from "@/app/api/holdings/route";
import { PATCH as PATCH_HOLDING } from "@/app/api/holdings/[id]/route";
import { DEFAULT_ASSET_CLASS_ID } from "@/lib/asset-classes/defaults";
import { createTestUser, deleteTestUser, type TestUser } from "../fixtures/users";
import { jsonBody, requestAs } from "../fixtures/http";

const HOLDINGS_URL = "http://localhost:3000/api/holdings";
const CRON_URL = "http://localhost:3000/api/cron/refresh-prices";

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

// Seam 2 from docs/SPEC.md: real requests (and, for price_cache itself,
// real direct PostgREST calls) against the real local Postgres with RLS
// actually enabled — mirrors tests/route/valuations.test.ts's pattern of
// reading back through the service-role key to assert on DB state.
describe("price_cache RLS", () => {
  let user: TestUser;
  const symbol = `TEST-RLS-${Date.now()}`;

  beforeAll(async () => {
    user = await createTestUser("price-cache-rls");
    const { error } = await adminClient()
      .from("price_cache")
      .insert({
        symbol,
        price: 100,
        price_currency: "USD",
        source: "finnhub",
        last_error: null,
        fetched_at: new Date().toISOString(),
      });
    if (error) throw error;
  });

  afterAll(async () => {
    await adminClient().from("price_cache").delete().eq("symbol", symbol);
    await deleteTestUser(user.id);
  });

  it("is readable by an authenticated client", async () => {
    const { data, error } = await anonClientAs(user).from("price_cache").select("*").eq("symbol", symbol);
    expect(error).toBeNull();
    expect(data).toHaveLength(1);
  });

  it("is not writable by an authenticated client, including with a client-side key", async () => {
    const insertResult = await anonClientAs(user)
      .from("price_cache")
      .insert({
        symbol: `${symbol}-blocked`,
        price: 1,
        price_currency: "USD",
        source: "finnhub",
        fetched_at: new Date().toISOString(),
      });
    expect(insertResult.error).not.toBeNull();

    // No UPDATE policy exists for any client role, so this matches zero
    // rows rather than erroring — RLS silently excludes every row from the
    // update rather than rejecting the statement outright. The readback
    // below is what actually proves the write didn't happen.
    await anonClientAs(user).from("price_cache").update({ price: 999 }).eq("symbol", symbol);

    const { data } = await adminClient().from("price_cache").select("price").eq("symbol", symbol).single();
    expect(data?.price).toBe(100);
  });
});

describe("GET /api/cron/refresh-prices", () => {
  it("rejects a request with no CRON_SECRET bearer token", async () => {
    const response = await GET_REFRESH_PRICES(new NextRequest(CRON_URL));
    expect(response.status).toBe(401);
  });

  it("rejects a request with the wrong bearer token", async () => {
    const response = await GET_REFRESH_PRICES(
      new NextRequest(CRON_URL, { headers: { authorization: "Bearer not-the-secret" } }),
    );
    expect(response.status).toBe(401);
  });

  describe("a provider failure", () => {
    let user: TestUser;
    const symbol = `TEST-FAIL-${Date.now()}`;
    const goodPrice = 321.5;
    const goodFetchedAt = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    let originalFetch: typeof fetch;

    beforeAll(async () => {
      user = await createTestUser("price-cache-cron");

      await adminClient()
        .from("price_cache")
        .insert({
          symbol,
          price: goodPrice,
          price_currency: "USD",
          source: "finnhub",
          last_error: null,
          fetched_at: goodFetchedAt,
        });

      const holdingResponse = await POST_HOLDING(
        requestAs(user, HOLDINGS_URL, {
          method: "POST",
          ...jsonBody({
            name: "Provider outage holding",
            asset_class_id: DEFAULT_ASSET_CLASS_ID.equity,
            currency: "USD",
            price_lookup_symbol: symbol,
            quantity: 10,
          }),
        }),
      );
      expect(holdingResponse.status).toBe(201);

      // Only the Finnhub call should fail here — a blanket fetch stub would
      // also break the Supabase client's own network calls, which use
      // `fetch` under the hood too (same pattern as the FX-rate fallback
      // tests in tests/route/valuations.test.ts).
      originalFetch = global.fetch;
      global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url.includes("finnhub.io")) {
          throw new Error("simulated provider outage");
        }
        return originalFetch(input, init);
      }) as typeof fetch;
    });

    afterAll(async () => {
      global.fetch = originalFetch;
      await adminClient().from("price_cache").delete().eq("symbol", symbol);
      await deleteTestUser(user.id);
    });

    it("leaves the previous good price in place and records last_error without touching fetched_at", async () => {
      const response = await GET_REFRESH_PRICES(
        new NextRequest(CRON_URL, {
          headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
        }),
      );
      expect(response.status).toBe(200);

      const { data } = await adminClient()
        .from("price_cache")
        .select("price, fetched_at, last_error")
        .eq("symbol", symbol)
        .single();

      expect(data?.price).toBe(goodPrice);
      expect(new Date(data!.fetched_at).getTime()).toBe(new Date(goodFetchedAt).getTime());
      expect(data?.last_error).not.toBeNull();
    });
  });
});

// Ticket 21: a symbol added after today's cron run has no cache row until
// tomorrow's — POST/PATCH /api/holdings fill that hole immediately.
describe("fetch-on-add for a newly tracked symbol", () => {
  let user: TestUser;
  let originalFetch: typeof fetch;
  let finnhubCalls: string[];
  let finnhubBehaviour: "price" | "outage" | "unknown-symbol";
  const symbols: string[] = [];

  function newSymbol(label: string) {
    const symbol = `TEST-${label}-${Date.now()}`;
    symbols.push(symbol);
    return symbol;
  }

  function addHolding(symbol: string) {
    return POST_HOLDING(
      requestAs(user, HOLDINGS_URL, {
        method: "POST",
        ...jsonBody({
          name: "Fetch on add",
          asset_class_id: DEFAULT_ASSET_CLASS_ID.equity,
          currency: "USD",
          price_lookup_symbol: symbol,
          quantity: 3,
        }),
      }),
    );
  }

  beforeAll(async () => {
    user = await createTestUser("price-cache-fetch-on-add");
    originalFetch = global.fetch;
    // Only the Finnhub call is stubbed — the Supabase client uses `fetch`
    // too (same pattern as the cron failure test above).
    global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("finnhub.io")) {
        finnhubCalls.push(url);
        if (finnhubBehaviour === "outage") throw new Error("simulated provider outage");
        // Finnhub answers an unrecognised symbol with `c: 0`, not an error.
        const c = finnhubBehaviour === "unknown-symbol" ? 0 : 42.5;
        return new Response(JSON.stringify({ c }), { status: 200 });
      }
      return originalFetch(input, init);
    }) as typeof fetch;
  });

  beforeEach(() => {
    finnhubCalls = [];
    finnhubBehaviour = "price";
  });

  afterAll(async () => {
    global.fetch = originalFetch;
    await adminClient().from("price_cache").delete().in("symbol", symbols);
    await deleteTestUser(user.id);
  });

  it("populates price_cache for an uncached symbol when a Holding is added", async () => {
    const symbol = newSymbol("ADD");

    const response = await addHolding(symbol);
    expect(response.status).toBe(201);

    const { data } = await adminClient()
      .from("price_cache")
      .select("price, price_currency, last_error")
      .eq("symbol", symbol)
      .single();
    expect(data?.price).toBe(42.5);
    expect(data?.price_currency).toBe("USD");
    expect(data?.last_error).toBeNull();
  });

  it("does not re-fetch a symbol that already has a cache row", async () => {
    const symbol = newSymbol("CACHED");
    const fetchedAt = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    await adminClient()
      .from("price_cache")
      .insert({ symbol, price: 7, price_currency: "USD", source: "finnhub", fetched_at: fetchedAt });

    const response = await addHolding(symbol);
    expect(response.status).toBe(201);

    expect(finnhubCalls).toHaveLength(0);
    const { data } = await adminClient().from("price_cache").select("price").eq("symbol", symbol).single();
    expect(data?.price).toBe(7);
  });

  it("still saves the Holding when the provider fails, leaving the cache empty", async () => {
    const symbol = newSymbol("FAIL");
    finnhubBehaviour = "outage";

    const response = await addHolding(symbol);
    expect(response.status).toBe(201);
    const holding = await response.json();
    expect(holding.price_lookup_symbol).toBe(symbol);

    const { data } = await adminClient().from("price_cache").select("symbol").eq("symbol", symbol);
    expect(data).toEqual([]);
  });

  it("still saves the Holding when the provider doesn't recognise the symbol", async () => {
    const symbol = newSymbol("UNKNOWN");
    finnhubBehaviour = "unknown-symbol";

    const response = await addHolding(symbol);
    expect(response.status).toBe(201);

    const { data } = await adminClient().from("price_cache").select("symbol").eq("symbol", symbol);
    expect(data).toEqual([]);
  });

  it("prices an uncached symbol set through an edit too", async () => {
    const created = await POST_HOLDING(
      requestAs(user, HOLDINGS_URL, {
        method: "POST",
        ...jsonBody({
          name: "Edit into a symbol",
          asset_class_id: DEFAULT_ASSET_CLASS_ID.equity,
          currency: "USD",
        }),
      }),
    );
    const { id } = await created.json();
    const symbol = newSymbol("EDIT");

    const response = await PATCH_HOLDING(
      requestAs(user, `${HOLDINGS_URL}/${id}`, {
        method: "PATCH",
        ...jsonBody({ price_lookup_symbol: symbol, quantity: 2 }),
      }),
      { params: Promise.resolve({ id }) },
    );
    expect(response.status).toBe(200);

    const { data } = await adminClient().from("price_cache").select("price").eq("symbol", symbol).single();
    expect(data?.price).toBe(42.5);
  });
});
