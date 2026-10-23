import type { SupabaseClient } from "@supabase/supabase-js";
import { todayIsoDate } from "@/lib/date/today";
import { fetchFinnhubPrice } from "./finnhub";
import { fetchFxSeries } from "./frankfurter";

// The steps of the daily cron (design.md D14, D16). Each takes the
// service-role client; runDailyJob runs them in order and a failing step never
// stops the next.

const FX_BACKFILL_START = "2018-01-01";
const BATCH_SIZE = 200;
const PAGE = 1000;

/** Who wrote a Valuation: the User, or the daily job. */
type ValuationSource = "user" | "cron";

type Holding = { id: string; user_id: string };
type ActivePosition = { holding_id: string; ticker: string; shares: number; hand_price: number | null };

function nextDay(isoDate: string): string {
  return new Date(Date.parse(`${isoDate}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
}

/** Reads every row of a query, a page at a time (the API caps one response at 1000 rows). */
async function readAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    orThrow(error);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

const orThrow = (error: { message: string } | null) => {
  if (error) throw new Error(error.message);
};

/** Runs `read` once per batch of `keys` (the `.in()` filter has a size limit) and concatenates the rows. */
async function readInBatches<T>(
  keys: string[],
  read: (batch: string[]) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (const batch of chunks(keys)) {
    const { data, error } = await read(batch);
    orThrow(error);
    rows.push(...(data ?? []));
  }
  return rows;
}

function chunks<T>(items: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE) out.push(items.slice(i, i + BATCH_SIZE));
  return out;
}

/** Stores the INR-per-USD rates published since the latest stored one (or since 2018-01-01). An outage writes nothing. */
export async function refreshFxRates(admin: SupabaseClient): Promise<{ stored: number; error?: string }> {
  const latest = await admin.from("fx_rate").select("rate_date").order("rate_date", { ascending: false }).limit(1);
  if (latest.error) return { stored: 0, error: latest.error.message };

  const today = todayIsoDate();
  const from = latest.data.length ? nextDay(latest.data[0].rate_date as string) : FX_BACKFILL_START;
  if (from > today) return { stored: 0 };

  const series = await fetchFxSeries(from, today);
  if (!series.ok) return { stored: 0, error: series.error };
  if (series.rates.length === 0) return { stored: 0 };

  const { error } = await admin.from("fx_rate").upsert(series.rates, { onConflict: "rate_date" });
  if (error) return { stored: 0, error: error.message };
  return { stored: series.rates.length };
}

/** Every non-archived Stocks Holding and its Positions, across Users. */
async function loadActiveStocks(admin: SupabaseClient): Promise<{ holdings: Holding[]; positions: ActivePosition[] }> {
  const holdings = await readAll<Holding>((from, to) =>
    admin.from("holding").select("id, user_id").eq("asset_class", "stocks").is("archived_at", null).order("id").range(from, to),
  );
  const positions: ActivePosition[] = [];
  for (const ids of chunks(holdings.map((h) => h.id))) {
    const rows = await readAll<{ holding_id: string; ticker: string; shares: number; hand_price: number | null }>(
      (from, to) =>
        admin.from("position").select("holding_id, ticker, shares, hand_price").in("holding_id", ids).order("id").range(from, to),
    );
    for (const r of rows) {
      positions.push({
        holding_id: r.holding_id,
        ticker: r.ticker,
        shares: Number(r.shares),
        hand_price: r.hand_price === null ? null : Number(r.hand_price),
      });
    }
  }
  return { holdings, positions };
}

/** Quotes each distinct listed ticker held in an active Stocks Holding; a failed quote keeps the cached price and records the error. */
export async function refreshHeldPrices(
  admin: SupabaseClient,
  positions: ActivePosition[],
): Promise<{ quoted: number; failed: number }> {
  const held = [...new Set(positions.map((p) => p.ticker))];
  const listed = (
    await readInBatches<{ symbol: string }>(held, (batch) => admin.from("stock_symbol").select("symbol").in("symbol", batch))
  ).map((r) => r.symbol);

  let quoted = 0;
  let failed = 0;
  for (const symbol of listed) {
    const result = await fetchFinnhubPrice(symbol);
    if (result.ok) {
      const { error } = await admin.from("price_cache").upsert(
        { symbol, price: result.price, currency: result.priceCurrency, fetched_at: new Date().toISOString(), last_error: null },
        { onConflict: "symbol" },
      );
      orThrow(error);
      quoted += 1;
    } else {
      // Update, never insert: a symbol with no cached price has nothing to keep.
      const { error } = await admin.from("price_cache").update({ last_error: result.error }).eq("symbol", symbol);
      orThrow(error);
      failed += 1;
    }
  }
  return { quoted, failed };
}

/** Upserts today's Valuation (Σ shares × price) for every active Stocks Holding, marked automatic unless the User already saved one today. */
export async function snapshotStocksHoldings(
  admin: SupabaseClient,
  holdings: Holding[],
  positions: ActivePosition[],
): Promise<{ snapshots: number }> {
  const prices = new Map<string, number>();
  const cached = await readInBatches<{ symbol: string; price: number }>(
    [...new Set(positions.map((p) => p.ticker))],
    (batch) => admin.from("price_cache").select("symbol, price").in("symbol", batch),
  );
  for (const r of cached) prices.set(r.symbol, Number(r.price));

  // A Position with neither a market nor a Hand Price can't be saved by the
  // routes. If one exists anyway, the Holding gets no snapshot: a total that
  // silently leaves it out would disagree with the read model.
  const totals = new Map<string, number>();
  const unpriced = new Set<string>();
  for (const p of positions) {
    const price = prices.get(p.ticker) ?? p.hand_price;
    if (price === null) {
      unpriced.add(p.holding_id);
      continue;
    }
    totals.set(p.holding_id, (totals.get(p.holding_id) ?? 0) + p.shares * price);
  }

  const today = todayIsoDate();
  const userMarked = new Set<string>();
  const todays = await readInBatches<{ holding_id: string; source: ValuationSource }>(
    holdings.map((h) => h.id),
    (batch) => admin.from("holding_valuation").select("holding_id, source").in("holding_id", batch).eq("valued_on", today),
  );
  for (const r of todays) if (r.source === "user") userMarked.add(r.holding_id);

  const rows = holdings
    .filter((h) => totals.has(h.id) && !unpriced.has(h.id))
    .map((h) => ({
      user_id: h.user_id,
      holding_id: h.id,
      valued_on: today,
      value: Math.round((totals.get(h.id) as number) * 1e6) / 1e6,
      source: (userMarked.has(h.id) ? "user" : "cron") satisfies ValuationSource,
    }));
  for (const batch of chunks(rows)) {
    const { error } = await admin.from("holding_valuation").upsert(batch, { onConflict: "holding_id,valued_on" });
    orThrow(error);
  }
  return { snapshots: rows.length };
}

/** The whole daily job: FX, then prices, then snapshots. Each step reports its own failure and the rest still run. */
export async function runDailyJob(admin: SupabaseClient) {
  const errorOf = (e: unknown) => (e instanceof Error ? e.message : String(e));

  const fx = await refreshFxRates(admin).catch((e) => ({ stored: 0, error: errorOf(e) }));

  let active: { holdings: Holding[]; positions: ActivePosition[] };
  try {
    active = await loadActiveStocks(admin);
  } catch (e) {
    const error = errorOf(e);
    return { fx, prices: { quoted: 0, failed: 0, error }, snapshots: { snapshots: 0, error } };
  }

  const prices = await refreshHeldPrices(admin, active.positions).catch((e) => ({
    quoted: 0,
    failed: 0,
    error: errorOf(e),
  }));
  const snapshots = await snapshotStocksHoldings(admin, active.holdings, active.positions).catch((e) => ({
    snapshots: 0,
    error: errorOf(e),
  }));

  return { fx, prices, snapshots };
}
