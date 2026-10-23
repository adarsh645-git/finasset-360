import { describe, expect, it } from "vitest";
import { parseStocksHolding, resolvePositions, type PriceContext } from "@/lib/holdings/stocks-input";

const COUNTRIES = ["US", "IN"];
const parse = (positions: unknown, country = "US") =>
  parseStocksHolding({ asset_class: "stocks", country, name: "Brokerage", positions }, COUNTRIES);

const ctx = (over: Partial<PriceContext> = {}): PriceContext => ({
  prices: new Map(),
  symbols: new Map(),
  existing: new Map(),
  today: "2026-10-22",
  confirmPrices: false,
  ...over,
});

function resolveOk(positions: unknown, c = ctx(), country = "US") {
  const parsed = parse(positions, country);
  if (!parsed.ok) throw new Error(parsed.error);
  const resolved = resolvePositions(parsed.input.positions, c);
  if (!resolved.ok) throw new Error(resolved.error);
  return resolved;
}

describe("stocks holding fields", () => {
  it.each(["cost_basis", "property_type", "city", "quantity", "unit"])(
    "DM-12 rejects %s, a field of another Asset Class",
    (field) => {
      const result = parseStocksHolding(
        { asset_class: "stocks", country: "US", name: "B", positions: [{ ticker: "AAPL", shares: 1 }], [field]: 1 },
        COUNTRIES,
      );
      expect(result.ok).toBe(false);
    },
  );
});

describe("stocks positions", () => {
  it("DM-18 defaults average cost to the market price and totals shares x price", () => {
    const c = ctx({
      prices: new Map([
        ["AAPL", 232.1],
        ["MSFT", 428.4],
      ]),
    });
    const { rows, total } = resolveOk(
      [{ ticker: "AAPL", shares: 30, avg_cost: 165 }, { ticker: "MSFT", shares: 12 }],
      c,
    );
    expect(rows.map((r) => r.avg_cost)).toEqual([165, 428.4]);
    expect(total).toBe(12103.8);
  });

  it.each([
    ["none", [], false],
    ["zero shares", [{ ticker: "AAPL", shares: 0 }], false],
    ["duplicate ticker", [{ ticker: "AAPL", shares: 1 }, { ticker: "aapl", shares: 2 }], false],
    ["lower case", [{ ticker: "aapl", shares: 5 }], true],
  ])("DM-19 %s", (_label, positions, ok) => {
    const parsed = parse(positions);
    expect(parsed.ok).toBe(ok);
    if (parsed.ok) expect(parsed.input.positions[0].ticker).toBe("AAPL");
  });

  it("DM-20 adds .NS to India tickers without a suffix", () => {
    const parsed = parse(
      [{ ticker: "INFY", shares: 1, hand_price: 1 }, { ticker: "TCS.NS", shares: 1, hand_price: 1 }],
      "IN",
    );
    if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.input.positions.map((p) => p.ticker)).toEqual(["INFY.NS", "TCS.NS"]);
  });

  it("DM-22 rejects an unknown ticker without a Hand Price", () => {
    const parsed = parse([{ ticker: "TDF2055", shares: 100 }]);
    if (!parsed.ok) throw new Error(parsed.error);
    expect(resolvePositions(parsed.input.positions, ctx()).ok).toBe(false);
  });

  it("DM-23 stores a Hand Price with its date, Sector and name; defaults Other and the ticker", () => {
    const { rows } = resolveOk(
      [
        { ticker: "INFY", shares: 90, hand_price: 1880, sector: "Technology", name: "Infosys" },
        { ticker: "ABC", shares: 1, hand_price: 5 },
      ],
      ctx(),
      "IN",
    );
    expect(rows[0]).toMatchObject({
      ticker: "INFY.NS",
      hand_price: 1880,
      price_as_of: "2026-10-22",
      sector: "Technology",
      name: "Infosys",
      avg_cost: 1880,
    });
    expect(rows[1]).toMatchObject({ sector: "Other", name: "ABC.NS" });
  });

  it("DM-25 rejects an invalid Sector", () => {
    expect(parse([{ ticker: "X", shares: 1, hand_price: 1, sector: "Crypto" }]).ok).toBe(false);
  });

  const existing = new Map([
    ["INFY.NS", { hand_price: 1880, price_as_of: "2026-09-05" }],
    ["TCS.NS", { hand_price: 4150, price_as_of: "2026-10-12" }],
  ]);

  it("DM-24 re-dates a changed Hand Price", () => {
    const { rows } = resolveOk([{ ticker: "INFY", shares: 1, hand_price: 1912 }], ctx({ existing }), "IN");
    expect(rows[0]).toMatchObject({ hand_price: 1912, price_as_of: "2026-10-22" });
  });

  it("DM-39 keeps the date of an unchanged Hand Price", () => {
    const { rows } = resolveOk(
      [{ ticker: "INFY", shares: 1, hand_price: 1880 }, { ticker: "TCS", shares: 1, hand_price: 4200 }],
      ctx({ existing }),
      "IN",
    );
    expect(rows.map((r) => r.price_as_of)).toEqual(["2026-09-05", "2026-10-22"]);
  });

  it("DM-40 confirm_prices re-dates every Hand Price", () => {
    const { rows } = resolveOk(
      [{ ticker: "INFY", shares: 1, hand_price: 1880 }, { ticker: "TCS", shares: 1, hand_price: 4150 }],
      ctx({ existing, confirmPrices: true }),
      "IN",
    );
    expect(rows.map((r) => [r.hand_price, r.price_as_of])).toEqual([
      [1880, "2026-10-22"],
      [4150, "2026-10-22"],
    ]);
  });
});
