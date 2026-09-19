import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { DELETE, PATCH } from "@/app/api/holdings/[id]/route";
import { GET, POST } from "@/app/api/holdings/route";
import { POST as POST_ASSET_CLASS } from "@/app/api/asset-classes/route";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_ASSET_CLASS_ID } from "@/lib/asset-classes/defaults";
import { createTestUser, deleteTestUser, type TestUser } from "../fixtures/users";
import { jsonBody, requestAs } from "../fixtures/http";

const HOLDINGS_URL = "http://localhost:3000/api/holdings";
const ASSET_CLASSES_URL = "http://localhost:3000/api/asset-classes";

async function createHolding(user: TestUser, overrides: Record<string, unknown> = {}) {
  const response = await POST(
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
  return response;
}

// Seam 2 from docs/SPEC.md: real requests against the real local Postgres,
// RLS actually enabled, exactly like tests/route/portfolio.test.ts.
describe("GET/POST /api/holdings, PATCH/DELETE /api/holdings/[id]", () => {
  let userA: TestUser;
  let userB: TestUser;

  beforeAll(async () => {
    [userA, userB] = await Promise.all([createTestUser("holding-a"), createTestUser("holding-b")]);
  });

  afterAll(async () => {
    await Promise.all([deleteTestUser(userA.id), deleteTestUser(userB.id)]);
  });

  it("rejects a request with no session", async () => {
    const response = await GET(new NextRequest(HOLDINGS_URL));
    expect(response.status).toBe(401);
  });

  it("adds a Holding under an Asset Class with a name and currency", async () => {
    const response = await createHolding(userA);
    expect(response.status).toBe(201);
    const created = await response.json();
    expect(created).toMatchObject({
      asset_class_id: DEFAULT_ASSET_CLASS_ID.equity,
      name: "10 shares of AAPL",
      currency: "USD",
    });
  });

  it("accepts any ISO currency code, not a hardcoded list", async () => {
    const response = await createHolding(userA, { name: "Tokyo apartment", currency: "JPY" });
    expect(response.status).toBe(201);
    expect((await response.json()).currency).toBe("JPY");
  });

  it("rejects a currency code that isn't valid ISO 4217", async () => {
    const response = await createHolding(userA, { currency: "NOTACODE" });
    expect(response.status).toBe(400);
  });

  // Ticket 07: price_lookup_symbol and quantity are populated together
  // (docs/SPEC.md's schema note) — quantity exists solely to compute the
  // Live Estimate, so it's meaningless without a symbol and vice versa.
  it("creates a Holding with a market symbol and quantity together", async () => {
    const response = await createHolding(userA, { price_lookup_symbol: "aapl", quantity: 10 });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ price_lookup_symbol: "AAPL", quantity: 10 });
  });

  it("rejects a market symbol without a quantity", async () => {
    const response = await createHolding(userA, { price_lookup_symbol: "AAPL" });
    expect(response.status).toBe(400);
  });

  it("rejects a quantity without a market symbol", async () => {
    const response = await createHolding(userA, { quantity: 10 });
    expect(response.status).toBe(400);
  });

  it("a Holding created with no market symbol has no quantity either", async () => {
    const response = await createHolding(userA);
    expect(await response.json()).toMatchObject({ price_lookup_symbol: null, quantity: null });
  });

  // Ticket 18: Sector rides along with a market symbol picked from the
  // stock-picker, but is validated independently of the symbol/quantity
  // coupling above — a Holding can be created with a symbol and no Sector
  // yet (the lazy Finnhub lookup hasn't resolved it).
  it("creates a Holding with a Sector", async () => {
    const response = await createHolding(userA, {
      price_lookup_symbol: "aapl",
      quantity: 10,
      sector: " Technology ",
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ sector: "Technology" });
  });

  it("a Holding created with no Sector has none", async () => {
    const response = await createHolding(userA);
    expect(await response.json()).toMatchObject({ sector: null });
  });

  it("rejects a blank Sector", async () => {
    const response = await createHolding(userA, { sector: "   " });
    expect(response.status).toBe(400);
  });

  // Ticket 19: Held at is independent of Sector and of the symbol/quantity
  // pair — it applies to every Asset Class, not just market-symbol
  // Holdings.
  it("creates a Holding with Held at", async () => {
    const response = await createHolding(userA, { held_at: " Fidelity 401k " });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ held_at: "Fidelity 401k" });
  });

  it("a Holding created with no Held at has none", async () => {
    const response = await createHolding(userA);
    expect(await response.json()).toMatchObject({ held_at: null });
  });

  it("rejects a blank Held at", async () => {
    const response = await createHolding(userA, { held_at: "   " });
    expect(response.status).toBe(400);
  });

  it("rejects an asset_class_id that doesn't exist or isn't visible to the caller", async () => {
    const response = await createHolding(userA, {
      asset_class_id: "00000000-0000-0000-0000-000000000000",
    });
    expect(response.status).toBe(400);
  });

  it("rejects creating a Holding under another User's custom Asset Class", async () => {
    const customClass = await POST_ASSET_CLASS(
      requestAs(userB, ASSET_CLASSES_URL, { method: "POST", ...jsonBody({ name: "B's Private Class" }) }),
    );
    const { id: privateClassId } = await customClass.json();

    const response = await createHolding(userA, { asset_class_id: privateClassId });
    expect(response.status).toBe(400);
  });

  it("edits a Holding's name, class, and currency", async () => {
    const created = await createHolding(userA);
    const { id } = await created.json();

    const response = await PATCH(
      requestAs(userA, `${HOLDINGS_URL}/${id}`, {
        method: "PATCH",
        ...jsonBody({
          name: "15 shares of AAPL",
          asset_class_id: DEFAULT_ASSET_CLASS_ID.cash,
          currency: "EUR",
        }),
      }),
      { params: Promise.resolve({ id }) },
    );
    expect(response.status).toBe(200);
    const updated = await response.json();
    expect(updated).toMatchObject({
      id,
      name: "15 shares of AAPL",
      asset_class_id: DEFAULT_ASSET_CLASS_ID.cash,
      currency: "EUR",
    });
  });

  it("adds a market symbol and quantity to a Holding that had none", async () => {
    const created = await createHolding(userA);
    const { id } = await created.json();

    const response = await PATCH(
      requestAs(userA, `${HOLDINGS_URL}/${id}`, {
        method: "PATCH",
        ...jsonBody({ price_lookup_symbol: "voo", quantity: 5 }),
      }),
      { params: Promise.resolve({ id }) },
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ price_lookup_symbol: "VOO", quantity: 5 });
  });

  it("clears a Holding's market symbol and quantity together", async () => {
    const created = await createHolding(userA, { price_lookup_symbol: "AAPL", quantity: 10 });
    const { id } = await created.json();

    const response = await PATCH(
      requestAs(userA, `${HOLDINGS_URL}/${id}`, {
        method: "PATCH",
        ...jsonBody({ price_lookup_symbol: null, quantity: null }),
      }),
      { params: Promise.resolve({ id }) },
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ price_lookup_symbol: null, quantity: null });
  });

  it("rejects setting a market symbol without a quantity via PATCH", async () => {
    const created = await createHolding(userA);
    const { id } = await created.json();

    const response = await PATCH(
      requestAs(userA, `${HOLDINGS_URL}/${id}`, {
        method: "PATCH",
        ...jsonBody({ price_lookup_symbol: "AAPL" }),
      }),
      { params: Promise.resolve({ id }) },
    );
    expect(response.status).toBe(400);
  });

  it("sets and clears a Holding's Sector via PATCH", async () => {
    const created = await createHolding(userA);
    const { id } = await created.json();

    const withSector = await PATCH(
      requestAs(userA, `${HOLDINGS_URL}/${id}`, { method: "PATCH", ...jsonBody({ sector: "Energy" }) }),
      { params: Promise.resolve({ id }) },
    );
    expect(withSector.status).toBe(200);
    expect(await withSector.json()).toMatchObject({ sector: "Energy" });

    const cleared = await PATCH(
      requestAs(userA, `${HOLDINGS_URL}/${id}`, { method: "PATCH", ...jsonBody({ sector: null }) }),
      { params: Promise.resolve({ id }) },
    );
    expect(cleared.status).toBe(200);
    expect(await cleared.json()).toMatchObject({ sector: null });
  });

  it("sets and clears a Holding's Held at via PATCH", async () => {
    const created = await createHolding(userA);
    const { id } = await created.json();

    const withHeldAt = await PATCH(
      requestAs(userA, `${HOLDINGS_URL}/${id}`, { method: "PATCH", ...jsonBody({ held_at: "Robinhood" }) }),
      { params: Promise.resolve({ id }) },
    );
    expect(withHeldAt.status).toBe(200);
    expect(await withHeldAt.json()).toMatchObject({ held_at: "Robinhood" });

    const cleared = await PATCH(
      requestAs(userA, `${HOLDINGS_URL}/${id}`, { method: "PATCH", ...jsonBody({ held_at: null }) }),
      { params: Promise.resolve({ id }) },
    );
    expect(cleared.status).toBe(200);
    expect(await cleared.json()).toMatchObject({ held_at: null });
  });

  // Ticket 22: Cash has no market symbol or quantity. The Cash form never
  // sends them, and the route refuses them rather than trusting the client.
  describe("Cash Holdings (ticket 22)", () => {
    async function patchHolding(user: TestUser, id: string, body: Record<string, unknown>) {
      return PATCH(requestAs(user, `${HOLDINGS_URL}/${id}`, { method: "PATCH", ...jsonBody(body) }), {
        params: Promise.resolve({ id }),
      });
    }

    it("creates a Cash Holding with no market symbol or quantity", async () => {
      const response = await createHolding(userA, {
        name: "Chase Checking",
        asset_class_id: DEFAULT_ASSET_CLASS_ID.cash,
        held_at: "Chase",
      });
      expect(response.status).toBe(201);
      expect(await response.json()).toMatchObject({ price_lookup_symbol: null, quantity: null });
    });

    it("accepts an explicit null symbol/quantity pair on Cash", async () => {
      const response = await createHolding(userA, {
        asset_class_id: DEFAULT_ASSET_CLASS_ID.cash,
        price_lookup_symbol: null,
        quantity: null,
      });
      expect(response.status).toBe(201);
    });

    it("refuses a market symbol and quantity on a new Cash Holding", async () => {
      const response = await createHolding(userA, {
        asset_class_id: DEFAULT_ASSET_CLASS_ID.cash,
        price_lookup_symbol: "AAPL",
        quantity: 10,
      });
      expect(response.status).toBe(400);
    });

    it("refuses setting a market symbol on an existing Cash Holding", async () => {
      const { id } = await (
        await createHolding(userA, { asset_class_id: DEFAULT_ASSET_CLASS_ID.cash })
      ).json();
      const response = await patchHolding(userA, id, { price_lookup_symbol: "AAPL", quantity: 1 });
      expect(response.status).toBe(400);
    });

    it("refuses moving a Holding into Cash while setting a market symbol", async () => {
      const { id } = await (await createHolding(userA)).json();
      const response = await patchHolding(userA, id, {
        asset_class_id: DEFAULT_ASSET_CLASS_ID.cash,
        price_lookup_symbol: "AAPL",
        quantity: 1,
      });
      expect(response.status).toBe(400);
    });

    it("moving a live-priced Holding into Cash works when the pair is cleared with it", async () => {
      const { id } = await (
        await createHolding(userA, { price_lookup_symbol: "AAPL", quantity: 10 })
      ).json();
      const response = await patchHolding(userA, id, {
        asset_class_id: DEFAULT_ASSET_CLASS_ID.cash,
        price_lookup_symbol: null,
        quantity: null,
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        asset_class_id: DEFAULT_ASSET_CLASS_ID.cash,
        price_lookup_symbol: null,
        quantity: null,
      });
    });

    it("leaves a legacy Cash Holding's stored symbol/quantity intact when only its name is edited", async () => {
      // Reachable only for rows that predate ticket 22 (or via a direct
      // write), so seed one with the service-role client, past the route.
      const { data: legacy } = await createAdminClient()
        .from("holding")
        .insert({
          user_id: userA.id,
          asset_class_id: DEFAULT_ASSET_CLASS_ID.cash,
          name: "Legacy cash",
          currency: "USD",
          price_lookup_symbol: "AAPL",
          quantity: 3,
        })
        .select("id")
        .single();

      // The edit form's real Save payload for a Cash Holding: every visible
      // field, including the (unchanged) class, but no symbol/quantity.
      const response = await patchHolding(userA, legacy!.id, {
        name: "Renamed legacy cash",
        asset_class_id: DEFAULT_ASSET_CLASS_ID.cash,
        currency: "USD",
        held_at: "Chase",
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        name: "Renamed legacy cash",
        held_at: "Chase",
        price_lookup_symbol: "AAPL",
        quantity: 3,
      });
    });
  });

  it("deletes a Holding", async () => {
    const created = await createHolding(userA);
    const { id } = await created.json();

    const response = await DELETE(requestAs(userA, `${HOLDINGS_URL}/${id}`, { method: "DELETE" }), {
      params: Promise.resolve({ id }),
    });
    expect(response.status).toBe(200);

    const after = await GET(requestAs(userA, HOLDINGS_URL));
    const ids = (await after.json()).map((h: { id: string }) => h.id);
    expect(ids).not.toContain(id);
  });

  it("User A cannot read User B's Holdings", async () => {
    const created = await createHolding(userB, { name: "B's holding" });
    const { id } = await created.json();

    const asA = await GET(requestAs(userA, HOLDINGS_URL));
    const idsVisibleToA = (await asA.json()).map((h: { id: string }) => h.id);
    expect(idsVisibleToA).not.toContain(id);
  });

  it("User A cannot update User B's Holding", async () => {
    const created = await createHolding(userB, { name: "B's holding to protect" });
    const { id } = await created.json();

    const response = await PATCH(
      requestAs(userA, `${HOLDINGS_URL}/${id}`, {
        method: "PATCH",
        ...jsonBody({ name: "Hijacked" }),
      }),
      { params: Promise.resolve({ id }) },
    );
    expect(response.status).toBe(404);

    const stillB = await GET(requestAs(userB, HOLDINGS_URL));
    const holding = (await stillB.json()).find((h: { id: string }) => h.id === id);
    expect(holding.name).toBe("B's holding to protect");
  });

  it("User A cannot delete User B's Holding", async () => {
    const created = await createHolding(userB, { name: "B's holding to keep" });
    const { id } = await created.json();

    const response = await DELETE(requestAs(userA, `${HOLDINGS_URL}/${id}`, { method: "DELETE" }), {
      params: Promise.resolve({ id }),
    });
    expect(response.status).toBe(404);

    const stillB = await GET(requestAs(userB, HOLDINGS_URL));
    const ids = (await stillB.json()).map((h: { id: string }) => h.id);
    expect(ids).toContain(id);
  });
});
