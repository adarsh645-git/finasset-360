import { fetchJson } from "./fetch-json";

const FRANKFURTER_URL = "https://api.frankfurter.dev/v1";

export type FxRateRow = { rate_date: string; inr_per_usd: number };

export type FxSeriesResult = { ok: true; rates: FxRateRow[] } | { ok: false; error: string };

/** INR per USD for every date Frankfurter published from `from` through `to` (YYYY-MM-DD, inclusive). Weekends and holidays have no row. */
export async function fetchFxSeries(from: string, to: string): Promise<FxSeriesResult> {
  const result = await fetchJson(`${FRANKFURTER_URL}/${from}..${to}?base=USD&symbols=INR`, "Frankfurter");
  if (!result.ok) return result;

  const rates = (result.body as { rates?: unknown }).rates;
  if (typeof rates !== "object" || rates === null || Array.isArray(rates)) {
    return { ok: false, error: "Frankfurter returned an unexpected rate-series shape." };
  }

  const rows: FxRateRow[] = [];
  for (const [date, byCurrency] of Object.entries(rates)) {
    const inr = Number((byCurrency as { INR?: unknown } | null)?.INR);
    if (/^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(inr) && inr > 0) {
      rows.push({ rate_date: date, inr_per_usd: inr });
    }
  }
  return { ok: true, rates: rows };
}
