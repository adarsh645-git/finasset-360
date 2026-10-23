import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { GET as getPortfolio } from "@/app/api/portfolio/route";
import { PATCH as editHolding } from "@/app/api/holdings/[id]/route";
import { POST as updateValue } from "@/app/api/holdings/[id]/valuations/route";
import { POST as updateBalance } from "@/app/api/liabilities/[id]/valuations/route";
import type { PortfolioData } from "@/lib/read-model/types";
import { buildStaleList } from "@/lib/views/stale-list";
import { jsonBody, requestAs } from "../fixtures/http";
import { createTestUser, deleteTestUser, type TestUser } from "../fixtures/users";

// Seam 2 (design.md Testing Decisions): the pass relies on a save of an
// unchanged figure making the item fresh. Saved through the existing routes,
// read back through GET /api/portfolio.

const BASE = "http://localhost:3000/api";

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

let user: TestUser;

beforeAll(async () => {
  user = await createTestUser("update-pass");
});

afterAll(async () => {
  await deleteTestUser(user.id);
});

async function read(): Promise<PortfolioData> {
  const response = await getPortfolio(requestAs(user, `${BASE}/portfolio`));
  expect(response.status).toBe(200);
  return (await response.json()) as PortfolioData;
}

const staleIds = (data: PortfolioData) => buildStaleList(data, data.today).map((r) => r.id);

describe("Save & next records an unchanged figure", () => {
  it("UP-05 an unchanged value posted to the Holding Valuation route makes the Holding fresh", async () => {
    const db = admin();
    const { data: row, error } = await db
      .from("holding")
      .insert({ user_id: user.id, country: "US", asset_class: "cash", name: "Pass cash" })
      .select("id")
      .single();
    if (error) throw error;
    const id = row.id as string;
    const seeded = await db
      .from("holding_valuation")
      .insert({ user_id: user.id, holding_id: id, valued_on: daysAgo(90), value: 18_000, source: "user" })
      .select("id");
    if (seeded.error) throw seeded.error;
    expect(staleIds(await read())).toContain(id);

    const response = await updateValue(
      requestAs(user, `${BASE}/holdings/${id}/valuations`, { method: "POST", ...jsonBody({ value: 18_000 }) }),
      ctx(id),
    );
    expect(response.status).toBeLessThan(300);

    const after = await read();
    expect(staleIds(after)).not.toContain(id);
    expect(after.holdings.find((h) => h.id === id)!.valuations.map((v) => [v.date, v.value])).toEqual([
      [daysAgo(90), 18_000],
      [daysAgo(0), 18_000],
    ]);
  });

  it("UP-05 an unchanged balance posted to the Liability Valuation route makes the Liability fresh", async () => {
    const db = admin();
    const { data: row, error } = await db
      .from("liability")
      .insert({
        user_id: user.id,
        country: "US",
        name: "Pass loan",
        principal: 250_000,
        apr: 5,
        monthly_payment: 1_500,
        start_month: "2026-01-01",
      })
      .select("id")
      .single();
    if (error) throw error;
    const id = row.id as string;
    const seeded = await db
      .from("liability_valuation")
      .insert({ user_id: user.id, liability_id: id, valued_on: daysAgo(90), balance: 212_400 })
      .select("id");
    if (seeded.error) throw seeded.error;
    expect(staleIds(await read())).toContain(id);

    const response = await updateBalance(
      requestAs(user, `${BASE}/liabilities/${id}/valuations`, { method: "POST", ...jsonBody({ balance: 212_400 }) }),
      ctx(id),
    );
    expect(response.status).toBeLessThan(300);

    const after = await read();
    expect(staleIds(after)).not.toContain(id);
    expect(after.liabilities.find((l) => l.id === id)!.valuations.map((v) => [v.date, v.value])).toEqual([
      [daysAgo(90), 212_400],
      [daysAgo(0), 212_400],
    ]);
  });
});

describe("Confirming Positions in a pass", () => {
  async function staleBrokerage() {
    const db = admin();
    const ticker = `ZUP${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const { data: row, error } = await db
      .from("holding")
      .insert({ user_id: user.id, country: "IN", asset_class: "stocks", name: `Pass brokerage ${ticker}` })
      .select("id")
      .single();
    if (error) throw error;
    const id = row.id as string;
    const made = await db.from("position").insert([
      { user_id: user.id, holding_id: id, ticker: `${ticker}A.NS`, shares: 90, avg_cost: 1880, hand_price: 1880, price_as_of: daysAgo(47), sector: "Technology", name: "A" },
      { user_id: user.id, holding_id: id, ticker: `${ticker}B.NS`, shares: 10, avg_cost: 4150, hand_price: 4150, price_as_of: daysAgo(10), sector: "Technology", name: "B" },
    ]);
    if (made.error) throw made.error;
    const seeded = await db
      .from("holding_valuation")
      .insert({ user_id: user.id, holding_id: id, valued_on: daysAgo(47), value: 100_000, source: "user" })
      .select("id");
    if (seeded.error) throw seeded.error;
    return { id, ticker };
  }

  const handPrices = async (id: string) => {
    const { data, error } = await admin().from("position").select("ticker, hand_price, price_as_of").eq("holding_id", id).order("ticker");
    if (error) throw error;
    return data.map((r) => [Number(r.hand_price), r.price_as_of as string]);
  };

  async function patch(id: string, ticker: string, extra: Record<string, unknown>) {
    const response = await editHolding(
      requestAs(user, `${BASE}/holdings/${id}`, {
        method: "PATCH",
        ...jsonBody({
          asset_class: "stocks",
          country: "IN",
          name: `Pass brokerage ${ticker}`,
          positions: [
            { ticker: `${ticker}A.NS`, shares: 90, avg_cost: 1880, hand_price: 1880 },
            { ticker: `${ticker}B.NS`, shares: 10, avg_cost: 4150, hand_price: 4150 },
          ],
          ...extra,
        }),
      }),
      ctx(id),
    );
    expect(response.status).toBe(200);
  }

  it("UP-14 unchanged Positions with confirm_prices date every Hand Price today and clear the Holding", async () => {
    const { id, ticker } = await staleBrokerage();
    expect(staleIds(await read())).toContain(id);
    await patch(id, ticker, { confirm_prices: true });
    expect(await handPrices(id)).toEqual([
      [1880, daysAgo(0)],
      [4150, daysAgo(0)],
    ]);
    expect(staleIds(await read())).not.toContain(id);
  });

  it("UP-14 the same PATCH without the flag leaves the dates and the Holding Stale", async () => {
    const { id, ticker } = await staleBrokerage();
    await patch(id, ticker, {});
    expect(await handPrices(id)).toEqual([
      [1880, daysAgo(47)],
      [4150, daysAgo(10)],
    ]);
    expect(staleIds(await read())).toContain(id);
  });
});
