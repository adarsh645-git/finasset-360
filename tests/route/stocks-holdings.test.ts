import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { POST as createHolding } from "@/app/api/holdings/route";
import { PATCH as editHolding } from "@/app/api/holdings/[id]/route";
import { jsonBody, requestAs } from "../fixtures/http";
import { createTestUser, deleteTestUser, type TestUser } from "../fixtures/users";

// Seam 1 (design.md Testing Decisions): the Stocks Holding routes against the
// real local Postgres with RLS on. Market data is seeded with the service-role
// client under tickers unique to this run.

const BASE = "http://localhost:3000/api/holdings";
const today = new Date().toISOString().slice(0, 10);
const run = Math.random().toString(36).slice(2, 7).toUpperCase();
const AAPL = `ZAA${run}`;
const MSFT = `ZMS${run}`;
const JPM = `ZJP${run}`;
const NVDA = `ZNV${run}`;
const SHARED = [AAPL, MSFT, JPM, NVDA];

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });
}

let user: TestUser;

beforeAll(async () => {
  user = await createTestUser("stocks");
  const now = new Date().toISOString();
  const prices: Record<string, number> = { [AAPL]: 232.1, [MSFT]: 428.4, [JPM]: 200, [NVDA]: 130 };
  const db = admin();
  for (const symbol of SHARED) {
    const a = await db.from("stock_symbol").insert({ symbol, name: `${symbol} Co`, type: "Common Stock", sector: "Technology", updated_at: now });
    const b = await db.from("price_cache").insert({ symbol, price: prices[symbol], currency: "USD", fetched_at: now });
    if (a.error || b.error) throw a.error ?? b.error;
  }
});

afterAll(async () => {
  const db = admin();
  await db.from("stock_symbol").delete().in("symbol", SHARED);
  await db.from("price_cache").delete().in("symbol", SHARED);
  await deleteTestUser(user.id);
});

type Body = Record<string, unknown>;
type Result = { status: number; json: { id?: string; error?: string } };

async function create(body: Body): Promise<Result> {
  const response = await createHolding(requestAs(user, BASE, { method: "POST", ...jsonBody(body) }));
  return { status: response.status, json: await response.json() };
}

async function edit(id: string, body: Body): Promise<Result> {
  const response = await editHolding(requestAs(user, `${BASE}/${id}`, { method: "PATCH", ...jsonBody(body) }), {
    params: Promise.resolve({ id }),
  });
  return { status: response.status, json: await response.json() };
}

const stocks = (positions: unknown, overrides: Body = {}): Body => ({
  asset_class: "stocks",
  country: "US",
  name: "Fidelity Brokerage",
  positions,
  ...overrides,
});

const india = (positions: unknown, overrides: Body = {}) =>
  stocks(positions, { country: "IN", name: "Zerodha", ...overrides });

async function createdId(body: Body): Promise<string> {
  const { status, json } = await create(body);
  if (status !== 201 || !json.id) throw new Error(`setup create failed: ${status} ${json.error}`);
  return json.id;
}

async function positions(id: string) {
  const { data, error } = await admin()
    .from("position")
    .select("ticker, shares, avg_cost, hand_price, price_as_of, sector, name")
    .eq("holding_id", id)
    .order("ticker");
  if (error) throw error;
  return data.map((r) => ({
    ticker: r.ticker as string,
    shares: Number(r.shares),
    avg_cost: Number(r.avg_cost),
    hand_price: r.hand_price === null ? null : Number(r.hand_price),
    price_as_of: r.price_as_of as string | null,
    sector: r.sector as string,
    name: r.name as string,
  }));
}

async function valuations(id: string) {
  const { data, error } = await admin().from("holding_valuation").select("valued_on, value").eq("holding_id", id);
  if (error) throw error;
  return data.map((r) => ({ valued_on: r.valued_on as string, value: Number(r.value) }));
}

async function setHandDate(id: string, ticker: string, days: number) {
  const { error } = await admin().from("position").update({ price_as_of: daysAgo(days) }).eq("holding_id", id).eq("ticker", ticker);
  if (error) throw error;
}

async function holdingCount(name: string) {
  const { count, error } = await admin()
    .from("holding")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("name", name);
  if (error) throw error;
  return count ?? 0;
}

describe("Stocks Holdings", () => {
  it("DM-18 creates a brokerage account with Positions and today's Valuation", async () => {
    const id = await createdId(
      stocks([
        { ticker: AAPL, shares: 30, avg_cost: 165 },
        { ticker: MSFT, shares: 12 },
      ]),
    );
    const rows = await positions(id);
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.ticker === MSFT)?.avg_cost).toBe(428.4);
    expect(rows.find((r) => r.ticker === AAPL)?.avg_cost).toBe(165);
    expect(await valuations(id)).toEqual([{ valued_on: today, value: 12103.8 }]);
  });

  it.each([
    ["none", [], 400],
    ["AAPL with 0 shares", [{ ticker: AAPL, shares: 0 }], 400],
    ["AAPL twice", [{ ticker: AAPL, shares: 1 }, { ticker: AAPL, shares: 2 }], 400],
    ["lower case", [{ ticker: AAPL.toLowerCase(), shares: 5 }], 201],
  ])("DM-19 Positions %s answer %i", async (label, list, status) => {
    const name = `DM-19 ${label}`;
    const { status: got, json } = await create(stocks(list, { name }));
    expect(got).toBe(status);
    if (status === 400) {
      expect(await holdingCount(name)).toBe(0);
    } else {
      expect((await positions(json.id!)).map((r) => r.ticker)).toEqual([AAPL]);
    }
  });

  it("DM-20 adds .NS to India tickers without a suffix", async () => {
    const id = await createdId(
      india([
        { ticker: `Z${run}INFY`, shares: 90, hand_price: 1880 },
        { ticker: `Z${run}TCS.NS`, shares: 10, hand_price: 4150 },
      ]),
    );
    expect((await positions(id)).map((r) => r.ticker)).toEqual([`Z${run}INFY.NS`, `Z${run}TCS.NS`]);
  });

  it("DM-21 editing replaces the Position list, and a failed save keeps the old one", async () => {
    const id = await createdId(
      stocks([
        { ticker: AAPL, shares: 10 },
        { ticker: MSFT, shares: 10 },
        { ticker: JPM, shares: 10 },
      ]),
    );
    const failed = await edit(id, stocks([{ ticker: AAPL, shares: 40 }, { ticker: `ZNOPRICE${run}`, shares: 1 }]));
    expect(failed.status).toBe(400);
    expect((await positions(id)).map((r) => r.ticker).sort()).toEqual([AAPL, JPM, MSFT].sort());

    const saved = await edit(id, stocks([{ ticker: AAPL, shares: 40 }, { ticker: NVDA, shares: 5 }]));
    expect(saved.status).toBe(200);
    const rows = await positions(id);
    expect(rows.map((r) => [r.ticker, r.shares]).sort()).toEqual(
      [[AAPL, 40], [NVDA, 5]].sort(),
    );
    expect(await valuations(id)).toEqual([{ valued_on: today, value: 40 * 232.1 + 5 * 130 }]);
  });

  it("DM-22 rejects an unknown ticker without a Hand Price", async () => {
    const name = "DM-22 holding";
    const { status, json } = await create(stocks([{ ticker: `TDF${run}`, shares: 100 }], { name }));
    expect(status).toBe(400);
    expect(json.error).toMatch(/price/i);
    expect(await holdingCount(name)).toBe(0);
  });

  it("DM-23 stores a Hand Price with its date, Sector and name", async () => {
    const ticker = `Z${run}HP`;
    const id = await createdId(
      india([{ ticker, shares: 90, hand_price: 1880, sector: "Technology", name: "Infosys" }]),
    );
    expect(await positions(id)).toEqual([
      { ticker: `${ticker}.NS`, shares: 90, avg_cost: 1880, hand_price: 1880, price_as_of: today, sector: "Technology", name: "Infosys" },
    ]);
  });

  it("DM-25 rejects an invalid Sector", async () => {
    const { status } = await create(india([{ ticker: `Z${run}SEC`, shares: 1, hand_price: 10, sector: "Crypto" }]));
    expect(status).toBe(400);
  });

  const INFY = `Z${run}INF`;
  const TCS = `Z${run}TC`;
  async function zerodha() {
    const id = await createdId(
      india([
        { ticker: INFY, shares: 90, hand_price: 1880 },
        { ticker: TCS, shares: 10, hand_price: 4150 },
      ]),
    );
    await setHandDate(id, `${INFY}.NS`, 47);
    await setHandDate(id, `${TCS}.NS`, 10);
    return id;
  }

  it("DM-24 re-dates a changed Hand Price", async () => {
    const id = await zerodha();
    const { status } = await edit(
      id,
      india([{ ticker: INFY, shares: 90, hand_price: 1912 }, { ticker: TCS, shares: 10, hand_price: 4150 }]),
    );
    expect(status).toBe(200);
    const infy = (await positions(id)).find((r) => r.ticker === `${INFY}.NS`);
    expect(infy).toMatchObject({ hand_price: 1912, price_as_of: today });
  });

  it("DM-39 an unchanged Hand Price keeps its date", async () => {
    const id = await zerodha();
    const { status } = await edit(
      id,
      india(
        [{ ticker: INFY, shares: 90, hand_price: 1880 }, { ticker: TCS, shares: 10, hand_price: 4200 }],
        { name: "Zerodha Kite" },
      ),
    );
    expect(status).toBe(200);
    const rows = await positions(id);
    expect(rows.find((r) => r.ticker === `${INFY}.NS`)?.price_as_of).toBe(daysAgo(47));
    expect(rows.find((r) => r.ticker === `${TCS}.NS`)).toMatchObject({ hand_price: 4200, price_as_of: today });
  });

  it("DM-40 confirming prices re-dates every Hand Price", async () => {
    const id = await zerodha();
    const { status } = await edit(
      id,
      india(
        [{ ticker: INFY, shares: 90, hand_price: 1880 }, { ticker: TCS, shares: 10, hand_price: 4150 }],
        { confirm_prices: true },
      ),
    );
    expect(status).toBe(200);
    expect((await positions(id)).map((r) => [r.hand_price, r.price_as_of])).toEqual([
      [1880, today],
      [4150, today],
    ]);
  });
});
