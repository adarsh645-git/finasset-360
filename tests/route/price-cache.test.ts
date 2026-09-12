import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GET as GET_REFRESH_PRICES } from "@/app/api/cron/refresh-prices/route";
import { POST as POST_HOLDING } from "@/app/api/holdings/route";
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
