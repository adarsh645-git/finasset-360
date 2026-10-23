import type { FxRate } from "@/lib/calc";
import type { PortfolioData } from "@/lib/read-model/types";

/** The FX Rates a view values with: the history, plus today's stored rate when the history lacks its day. */
export function fxRatesOf(portfolio: Pick<PortfolioData, "fx">): FxRate[] {
  const { history, today } = portfolio.fx;
  return [
    ...history,
    ...(today && !history.some((r) => r.date === today.asOf)
      ? [{ date: today.asOf, rate: today.rate }]
      : []),
  ];
}

/** Without any FX Rate an INR item can't be valued in USD; it is left out rather than guessed. */
export function usableItems<T extends { country: "US" | "IN" }>(items: T[], rates: FxRate[]): T[] {
  return rates.length ? items : items.filter((i) => i.country === "US");
}
