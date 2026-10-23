import type { SupabaseClient } from "@supabase/supabase-js";
import { todayIsoDate } from "@/lib/date/today";
import { recordTodayValuation } from "./store";
import {
  resolvePositions,
  type PositionRow,
  type PriceContext,
  type StocksHoldingInput,
} from "./stocks-input";

/** Loads the market data and stored Hand Prices the Positions resolve against. `holdingId` is null on create. */
async function loadPriceContext(
  supabase: SupabaseClient,
  tickers: string[],
  holdingId: string | null,
  confirmPrices: boolean,
): Promise<PriceContext> {
  const [prices, symbols, stored] = await Promise.all([
    supabase.from("price_cache").select("symbol, price").in("symbol", tickers),
    supabase.from("stock_symbol").select("symbol, name, sector").in("symbol", tickers),
    holdingId
      ? supabase.from("position").select("ticker, hand_price, price_as_of").eq("holding_id", holdingId)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (prices.error) throw prices.error;
  if (symbols.error) throw symbols.error;
  if (stored.error) throw stored.error;

  return {
    prices: new Map(prices.data.map((r) => [r.symbol as string, Number(r.price)])),
    symbols: new Map(
      symbols.data.map((r) => [r.symbol as string, { name: r.name as string, sector: r.sector as string | null }]),
    ),
    existing: new Map(
      stored.data
        .filter((r) => r.hand_price !== null && r.price_as_of !== null)
        .map((r) => [r.ticker as string, { hand_price: Number(r.hand_price), price_as_of: r.price_as_of as string }]),
    ),
    today: todayIsoDate(),
    confirmPrices,
  };
}

/** Prices the request's Positions (a validation error is returned, nothing is written). */
export async function priceStocksPositions(
  supabase: SupabaseClient,
  input: StocksHoldingInput,
  holdingId: string | null,
): Promise<{ ok: true; rows: PositionRow[]; total: number } | { ok: false; error: string }> {
  const context = await loadPriceContext(
    supabase,
    input.positions.map((p) => p.ticker),
    holdingId,
    input.confirmPrices,
  );
  return resolvePositions(input.positions, context);
}

/** Renames the Holding and replaces its Positions in one database call, then records today's Valuation. A failed Positions write leaves the old name. */
export async function updateStocksHolding(
  supabase: SupabaseClient,
  userId: string,
  holdingId: string,
  fields: { name: string; description: string | null },
  priced: { rows: PositionRow[]; total: number },
): Promise<void> {
  const { error } = await supabase.rpc("update_stocks_holding", {
    p_holding_id: holdingId,
    p_name: fields.name,
    p_description: fields.description,
    p_positions: priced.rows,
  });
  if (error) throw error;
  await recordTodayValuation(supabase, userId, holdingId, priced.total);
}

/** Replaces the Holding's Positions in one database call, then records today's Valuation at Σ shares × price. */
export async function writeStocksPositions(
  supabase: SupabaseClient,
  userId: string,
  holdingId: string,
  priced: { rows: PositionRow[]; total: number },
): Promise<void> {
  const { error } = await supabase.rpc("replace_positions", { p_holding_id: holdingId, p_positions: priced.rows });
  if (error) throw error;
  await recordTodayValuation(supabase, userId, holdingId, priced.total);
}
