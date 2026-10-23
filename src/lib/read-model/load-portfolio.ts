import type { SupabaseClient } from "@supabase/supabase-js";
import { exchangeLabel } from "@/lib/market-data/ticker";
import type {
  AssetClassId,
  CountryAssumptionsData,
  CountryCode,
  HoldingData,
  LiabilityData,
  PortfolioData,
  PositionData,
} from "./types";

// design.md D17: one set of parallel queries under the User's session (RLS),
// returning everything, archived items included. The only arithmetic here is
// Σ shares × price, which the calculations module doesn't own; rates come back
// as stored.

const PAGE = 1000;
const CHUNK = 200;

type Row = Record<string, unknown>;
type Page = PromiseLike<{ data: Row[] | null; error: { message: string } | null }>;

/** Every row of a query, a page at a time (the API caps one response at 1000 rows). */
async function readAll(page: (from: number, to: number) => Page): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

type CountedPage = PromiseLike<{ data: Row[] | null; error: { message: string } | null; count: number | null }>;

/** Like readAll, but the first page also returns the row count, so the remaining pages
 * are requested together instead of one after another (the FX history runs to thousands of rows). */
async function readAllParallel(page: (from: number, to: number, counted: boolean) => CountedPage): Promise<Row[]> {
  const first = await page(0, PAGE - 1, true);
  if (first.error) throw new Error(first.error.message);
  const rows: Row[] = [...(first.data ?? [])];
  const pages = Math.ceil((first.count ?? rows.length) / PAGE);
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, pages - 1) }, (_, i) => page((i + 1) * PAGE, (i + 2) * PAGE - 1, false)),
  );
  for (const { data, error } of rest) {
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
  }
  return rows;
}

const num = (value: unknown): number => Number(value);
const numOrNull = (value: unknown): number | null => (value === null || value === undefined ? null : Number(value));
const str = (value: unknown): string => String(value);
const strOrNull = (value: unknown): string | null => (value === null || value === undefined ? null : String(value));

function groupBy(rows: Row[], key: string): Map<string, Row[]> {
  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    const id = str(row[key]);
    const group = groups.get(id);
    if (group) group.push(row);
    else groups.set(id, [row]);
  }
  return groups;
}

async function loadMarketData(supabase: SupabaseClient, symbols: string[]) {
  const prices = new Map<string, number>();
  const listings = new Map<string, { name: string; sector: string | null; mic: string | null }>();
  for (let i = 0; i < symbols.length; i += CHUNK) {
    const batch = symbols.slice(i, i + CHUNK);
    const [cache, listed] = await Promise.all([
      supabase.from("price_cache").select("symbol, price").in("symbol", batch),
      supabase.from("stock_symbol").select("symbol, name, sector, mic").in("symbol", batch),
    ]);
    if (cache.error) throw new Error(cache.error.message);
    if (listed.error) throw new Error(listed.error.message);
    for (const r of cache.data) prices.set(str(r.symbol), num(r.price));
    for (const r of listed.data) {
      listings.set(str(r.symbol), { name: str(r.name), sector: strOrNull(r.sector), mic: strOrNull(r.mic) });
    }
  }
  return { prices, listings };
}

function buildPosition(
  row: Row,
  market: Awaited<ReturnType<typeof loadMarketData>>,
): PositionData {
  const ticker = str(row.ticker);
  const marketPrice = market.prices.get(ticker);
  const listing = market.listings.get(ticker);
  const isMarket = marketPrice !== undefined;
  const handPrice = numOrNull(row.hand_price);
  return {
    ticker,
    shares: num(row.shares),
    avgCost: num(row.avg_cost),
    // Market data always beats a Hand Price (D6). A Position with neither
    // can't be saved by the routes; fall back to its cost rather than zero.
    price: isMarket ? marketPrice : (handPrice ?? num(row.avg_cost)),
    priceSource: isMarket ? "market" : "hand",
    priceAsOf: isMarket ? null : strOrNull(row.price_as_of),
    name: isMarket && listing ? listing.name : str(row.name),
    sector: isMarket && listing?.sector ? listing.sector : str(row.sector),
    exchange: exchangeLabel(ticker, listing?.mic ?? null),
  };
}

export async function loadPortfolio(supabase: SupabaseClient, today: string): Promise<PortfolioData> {
  const [countryRows, portfolioRow, assumptionRows, holdingRows, positionRows, holdingValuationRows, liabilityRows, liabilityValuationRows, goalRows, fxToday] =
    await Promise.all([
      readAll((from, to) => supabase.from("country").select("*").order("code").range(from, to)),
      supabase.from("portfolio").select("*").maybeSingle(),
      readAll((from, to) => supabase.from("country_assumption").select("*").order("country").range(from, to)),
      readAll((from, to) => supabase.from("holding").select("*").order("created_at").order("id").range(from, to)),
      readAll((from, to) => supabase.from("position").select("*").order("created_at").order("id").range(from, to)),
      readAll((from, to) =>
        supabase.from("holding_valuation").select("*").order("valued_on").order("id").range(from, to),
      ),
      readAll((from, to) => supabase.from("liability").select("*").order("created_at").order("id").range(from, to)),
      readAll((from, to) =>
        supabase.from("liability_valuation").select("*").order("valued_on").order("id").range(from, to),
      ),
      readAll((from, to) =>
        supabase.from("goal").select("*").order("target_usd").order("created_at").order("id").range(from, to),
      ),
      loadFxToday(supabase, today),
    ]);
  if (portfolioRow.error) throw new Error(portfolioRow.error.message);

  const currencyOf = new Map(countryRows.map((c) => [str(c.code), str(c.currency)]));
  const currency = (country: unknown) => currencyOf.get(str(country)) as "USD" | "INR";

  const earliest = [...holdingValuationRows.map((v) => str(v.valued_on)), ...liabilityValuationRows.map((v) => str(v.valued_on))]
    .sort()[0];
  // Market data and the FX history only depend on the first round, so they share the second.
  const [market, fxHistory] = await Promise.all([
    loadMarketData(supabase, [...new Set(positionRows.map((p) => str(p.ticker)))]),
    loadFxHistory(supabase, today, earliest),
  ]);
  const positionsByHolding = groupBy(positionRows, "holding_id");
  const valuationsByHolding = groupBy(holdingValuationRows, "holding_id");
  const balancesByLiability = groupBy(liabilityValuationRows, "liability_id");

  const holdings: HoldingData[] = holdingRows.map((h) => {
    const id = str(h.id);
    const assetClass = str(h.asset_class) as AssetClassId;
    const positions = (positionsByHolding.get(id) ?? []).map((p) => buildPosition(p, market));
    const valuations = (valuationsByHolding.get(id) ?? []).map((v) => ({
      date: str(v.valued_on),
      value: num(v.value),
      source: str(v.source) as "user" | "cron",
    }));

    let currentValue: number;
    let costBasis: number | null;
    if (assetClass === "stocks") {
      currentValue = positions.reduce((sum, p) => sum + p.shares * p.price, 0);
      costBasis = positions.reduce((sum, p) => sum + p.shares * p.avgCost, 0);
    } else {
      currentValue = valuations.length ? valuations[valuations.length - 1].value : 0;
      costBasis = numOrNull(h.cost_basis);
    }

    return {
      id,
      assetClass,
      country: str(h.country) as CountryCode,
      currency: currency(h.country),
      name: str(h.name),
      description: strOrNull(h.description),
      propertyType: strOrNull(h.property_type),
      city: strOrNull(h.city),
      quantity: numOrNull(h.quantity),
      unit: strOrNull(h.unit),
      costBasis,
      currentValue,
      archivedAt: strOrNull(h.archived_at),
      createdAt: str(h.created_at),
      positions,
      valuations,
    };
  });

  const liabilities: LiabilityData[] = liabilityRows.map((l) => {
    const id = str(l.id);
    const valuations = (balancesByLiability.get(id) ?? []).map((v) => ({
      date: str(v.valued_on),
      value: num(v.balance),
      source: "user" as const,
    }));
    return {
      id,
      country: str(l.country) as CountryCode,
      currency: currency(l.country),
      name: str(l.name),
      principal: num(l.principal),
      apr: num(l.apr),
      monthlyPayment: num(l.monthly_payment),
      termYears: numOrNull(l.term_years),
      startMonth: str(l.start_month),
      revolving: Boolean(l.revolving),
      linkedHoldingId: strOrNull(l.linked_holding_id),
      currentBalance: valuations.length ? valuations[valuations.length - 1].value : 0,
      archivedAt: strOrNull(l.archived_at),
      createdAt: str(l.created_at),
      valuations,
    };
  });

  return {
    today,
    countries: countryRows.map((c) => ({
      code: str(c.code) as CountryCode,
      name: str(c.name),
      currency: str(c.currency) as "USD" | "INR",
      defaults: {
        inflation: num(c.default_inflation),
        realestate: num(c.default_realestate),
        stocks: num(c.default_stocks),
        cash: num(c.default_cash),
      },
    })),
    fx: { today: fxToday, history: fxHistory },
    holdings,
    liabilities,
    assumptions: buildAssumptions(portfolioRow.data, assumptionRows),
    goals: goalRows.map((g) => ({ id: str(g.id), name: strOrNull(g.name), targetUsd: num(g.target_usd) })),
  };
}

function buildAssumptions(portfolio: Row | null, countryRows: Row[]): PortfolioData["assumptions"] {
  const blank = (): CountryAssumptionsData => ({
    inflation: null,
    realestate: null,
    stocks: null,
    cash: null,
    monthlySavings: null,
  });
  const byCountry: Record<CountryCode, CountryAssumptionsData> = { US: blank(), IN: blank() };
  for (const r of countryRows) {
    const code = str(r.country) as CountryCode;
    if (!(code in byCountry)) continue;
    byCountry[code] = {
      inflation: numOrNull(r.inflation),
      realestate: numOrNull(r.realestate_rate),
      stocks: numOrNull(r.stocks_rate),
      cash: numOrNull(r.cash_rate),
      monthlySavings: numOrNull(r.monthly_savings),
    };
  }
  return {
    horizonYears: numOrNull(portfolio?.horizon_years),
    savingsGrowth: numOrNull(portfolio?.savings_growth),
    shared: {
      crypto: numOrNull(portfolio?.crypto_rate),
      metals: numOrNull(portfolio?.metals_rate),
      other: numOrNull(portfolio?.other_rate),
    },
    byCountry,
  };
}

/** Today's rate is the latest stored one on or before `today`. */
async function loadFxToday(supabase: SupabaseClient, today: string) {
  const latest = await supabase
    .from("fx_rate")
    .select("rate_date, inr_per_usd")
    .lte("rate_date", today)
    .order("rate_date", { ascending: false })
    .limit(1);
  if (latest.error) throw new Error(latest.error.message);
  return latest.data[0] ? { rate: num(latest.data[0].inr_per_usd), asOf: str(latest.data[0].rate_date) } : null;
}

/** The history runs from the latest rate on or before the earliest Valuation. */
async function loadFxHistory(supabase: SupabaseClient, today: string, earliestValuation: string | undefined) {
  if (earliestValuation === undefined) return [];

  const start = await supabase
    .from("fx_rate")
    .select("rate_date")
    .lte("rate_date", earliestValuation)
    .order("rate_date", { ascending: false })
    .limit(1);
  if (start.error) throw new Error(start.error.message);
  // No rate on or before the earliest Valuation: the history starts at the first rate stored.
  const from = start.data[0] ? str(start.data[0].rate_date) : null;

  const rows = await readAllParallel((a, b, counted) => {
    const query = supabase.from("fx_rate").select("rate_date, inr_per_usd", counted ? { count: "exact" } : undefined);
    return (from === null ? query : query.gte("rate_date", from))
      .lte("rate_date", today)
      .order("rate_date")
      .range(a, b);
  });
  return rows.map((r) => ({ date: str(r.rate_date), rate: num(r.inr_per_usd) }));
}
