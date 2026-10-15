import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GET as GET_REFRESH_STOCK_SYMBOLS } from "@/app/api/cron/refresh-stock-symbols/route";
import { createTestUser, deleteTestUser, type TestUser } from "../fixtures/users";

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

// Ticket 18 — real
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
