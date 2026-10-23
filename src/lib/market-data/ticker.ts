export type LookupCountry = "US" | "IN";

export function isLookupCountry(value: string | null): value is LookupCountry {
  return value === "US" || value === "IN";
}

/** Upper-cases the ticker and, for India, adds `.NS` when it has no suffix. */
export function normalizeTicker(raw: string, country: LookupCountry): string {
  const ticker = raw.trim().toUpperCase();
  if (country === "IN" && !ticker.includes(".")) return `${ticker}.NS`;
  return ticker;
}

const EXCHANGE_BY_MIC: Record<string, string> = {
  XNAS: "NASDAQ",
  XNYS: "NYSE",
  ARCX: "NYSE Arca",
  XASE: "NYSE American",
  BATS: "Cboe",
};

/** The display form: no `.NS` / `.BO`. */
export const shortTicker = (ticker: string): string => ticker.replace(/\.(NS|BO)$/i, "");

/** Display label for a ticker's exchange: `.NS` is NSE, else the mic's friendly name, else the mic. */
export function exchangeLabel(ticker: string, mic: string | null): string | null {
  if (ticker.endsWith(".NS")) return "NSE";
  if (!mic) return null;
  return EXCHANGE_BY_MIC[mic] ?? mic;
}
