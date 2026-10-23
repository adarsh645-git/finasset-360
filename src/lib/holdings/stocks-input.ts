// Validation and price resolution for a Stocks Holding's Positions, shared by
// create and edit (design.md D5, D6). Pure: the route loads the market data and
// the stored Hand Prices and passes them in.

import { SECTORS } from "@/lib/market-data/sector";
import { isLookupCountry, normalizeTicker } from "@/lib/market-data/ticker";

export type PositionInput = {
  ticker: string;
  shares: number;
  avgCost: number | null;
  handPrice: number | null;
  sector: string | null;
  name: string | null;
};

export type StocksHoldingInput = {
  country: string;
  name: string;
  description: string | null;
  confirmPrices: boolean;
  positions: PositionInput[];
};

export type PositionRow = {
  ticker: string;
  shares: number;
  avg_cost: number;
  hand_price: number | null;
  price_as_of: string | null;
  sector: string;
  name: string;
};

type Fail = { ok: false; error: string };

const absent = (value: unknown) => value === undefined || value === null;
const positive = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value > 0;

function trimmedOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

export function parseStocksHolding(
  body: Record<string, unknown>,
  knownCountries: readonly string[],
): { ok: true; input: StocksHoldingInput } | Fail {
  const fail = (error: string): Fail => ({ ok: false, error });

  const country = body.country;
  if (typeof country !== "string" || !knownCountries.includes(country)) return fail("Country must be a known country.");
  const name = trimmedOrNull(body.name);
  if (!name) return fail("Name is required.");
  if (!absent(body.confirm_prices) && typeof body.confirm_prices !== "boolean") {
    return fail("confirm_prices must be true or false.");
  }
  if (!Array.isArray(body.positions) || body.positions.length === 0) {
    return fail("A Stocks Holding needs at least one Position.");
  }

  const positions: PositionInput[] = [];
  const seen = new Set<string>();
  for (const raw of body.positions as unknown[]) {
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return fail("Each Position must be an object.");
    const p = raw as Record<string, unknown>;
    const rawTicker = trimmedOrNull(p.ticker);
    if (!rawTicker) return fail("Each Position needs a ticker.");
    const ticker = isLookupCountry(country) ? normalizeTicker(rawTicker, country) : rawTicker.toUpperCase();
    if (seen.has(ticker)) return fail(`${ticker} appears more than once.`);
    seen.add(ticker);
    if (!positive(p.shares)) return fail(`${ticker}: shares must be a number above 0.`);
    if (!absent(p.avg_cost) && !positive(p.avg_cost)) return fail(`${ticker}: average cost must be a number above 0.`);
    if (!absent(p.hand_price) && !positive(p.hand_price)) return fail(`${ticker}: Hand Price must be a number above 0.`);
    const sector = trimmedOrNull(p.sector);
    if (!absent(p.sector) && (sector === null || !(SECTORS as readonly string[]).includes(sector))) {
      return fail(`${ticker}: Sector must be one of the 12 Sectors.`);
    }
    positions.push({
      ticker,
      shares: p.shares,
      avgCost: absent(p.avg_cost) ? null : (p.avg_cost as number),
      handPrice: absent(p.hand_price) ? null : (p.hand_price as number),
      sector,
      name: trimmedOrNull(p.name),
    });
  }

  return {
    ok: true,
    input: { country, name, description: trimmedOrNull(body.description), confirmPrices: body.confirm_prices === true, positions },
  };
}

export type PriceContext = {
  /** Cached market prices by ticker. */
  prices: Map<string, number>;
  /** Shared symbol data by ticker, for the name and Sector of market-priced tickers. */
  symbols: Map<string, { name: string; sector: string | null }>;
  /** The Holding's stored Hand Prices by ticker (empty on create). */
  existing: Map<string, { hand_price: number; price_as_of: string }>;
  today: string;
  confirmPrices: boolean;
};

/** Settles each Position's price source, date, Sector, name and average cost, and the Holding's Σ shares × price. Market price wins over a Hand Price. */
export function resolvePositions(
  positions: PositionInput[],
  ctx: PriceContext,
): { ok: true; rows: PositionRow[]; total: number } | Fail {
  const rows: PositionRow[] = [];
  let total = 0;
  for (const p of positions) {
    const market = ctx.prices.get(p.ticker);
    const symbol = ctx.symbols.get(p.ticker);
    let price: number;
    let handPrice: number | null = null;
    let priceAsOf: string | null = null;
    if (market !== undefined) {
      price = market;
    } else {
      if (p.handPrice === null) return { ok: false, error: `${p.ticker} has no market price; enter its price.` };
      price = handPrice = p.handPrice;
      const stored = ctx.existing.get(p.ticker);
      priceAsOf = !ctx.confirmPrices && stored && stored.hand_price === handPrice ? stored.price_as_of : ctx.today;
    }
    rows.push({
      ticker: p.ticker,
      shares: p.shares,
      avg_cost: p.avgCost ?? price,
      hand_price: handPrice,
      price_as_of: priceAsOf,
      sector: p.sector ?? symbol?.sector ?? "Other",
      name: p.name ?? symbol?.name ?? p.ticker,
    });
    total += p.shares * price;
  }
  return { ok: true, rows, total: Math.round(total * 1e6) / 1e6 };
}
