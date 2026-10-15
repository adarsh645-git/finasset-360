import { lookupFxRate, toUsd, type FxRate } from "./fx";
import { valueOn, type HistoryItem } from "./history";
import type { Country } from "./types";

export type AttributionScope = Country | "ALL";

/** A range's Net Worth change in USD, split so the terms sum to it (D11). */
export interface ChangeAttribution {
  assetGrowth: number;
  debtPaidDown: number;
  currencyEffect: number;
}

/** Splits the Net Worth change from `rangeStart` to `today` into asset
 * growth, debt paid down and Currency effect, for the items in `scope`.
 * Native values at both ends come from D7 (0 before an item existed), each
 * grown/paid-down amount converts at the FX Rate on `rangeStart`, and the
 * Currency effect is the native value now times the change in 1/FX. */
export function attributeChange(
  items: HistoryItem[],
  rates: FxRate[],
  rangeStart: string,
  today: string,
  scope: AttributionScope,
): ChangeAttribution {
  const result: ChangeAttribution = {
    assetGrowth: 0,
    debtPaidDown: 0,
    currencyEffect: 0,
  };
  for (const item of items) {
    if (scope !== "ALL" && item.country !== scope) continue;
    const fxThen = lookupFxRate(rates, rangeStart).rate;
    const fxNow = lookupFxRate(rates, today).rate;
    const nativeThen = valueOn(item, rangeStart, today);
    const nativeNow = valueOn(item, today, today);
    const currency =
      toUsd(nativeNow, item.country, fxNow) -
      toUsd(nativeNow, item.country, fxThen);
    if (item.kind === "holding") {
      result.assetGrowth += toUsd(nativeNow - nativeThen, item.country, fxThen);
      result.currencyEffect += currency;
    } else {
      result.debtPaidDown += toUsd(
        nativeThen - nativeNow,
        item.country,
        fxThen,
      );
      result.currencyEffect -= currency;
    }
  }
  return result;
}
