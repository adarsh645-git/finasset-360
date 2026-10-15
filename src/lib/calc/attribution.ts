import { fxRateOn, valueOn } from "./history";
import type { ChangeAttribution, Country, FxRate, HistoryItem, HistoryPortfolio } from "./types";

/** Split the Net Worth change from `t0` to `today` into asset growth, debt paid
 * down and Currency effect, for the Countries in `scope`. USD items use an FX of 1. */
export function attributeChange(
  portfolio: HistoryPortfolio,
  rates: readonly FxRate[],
  t0: string,
  today: string,
  scope: readonly Country[],
): ChangeAttribution {
  const fxThen = fxRateOn(rates, t0).rate;
  const fxNow = fxRateOn(rates, today).rate;
  const inScope = (items: readonly HistoryItem[]) => items.filter((i) => scope.includes(i.country));
  const fx = (item: HistoryItem, rate: number) => (item.country === "US" ? 1 : rate);

  let assetGrowth = 0;
  let debtPaidDown = 0;
  let currencyEffect = 0;
  for (const item of inScope(portfolio.holdings)) {
    const then = valueOn(item, t0, today);
    const now = valueOn(item, today, today);
    assetGrowth += (now - then) / fx(item, fxThen);
    currencyEffect += now * (1 / fx(item, fxNow) - 1 / fx(item, fxThen));
  }
  for (const item of inScope(portfolio.liabilities)) {
    const then = valueOn(item, t0, today);
    const now = valueOn(item, today, today);
    debtPaidDown += (then - now) / fx(item, fxThen);
    currencyEffect -= now * (1 / fx(item, fxNow) - 1 / fx(item, fxThen));
  }
  return { assetGrowth, debtPaidDown, currencyEffect };
}
