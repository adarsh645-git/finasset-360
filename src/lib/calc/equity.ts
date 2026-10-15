/** An amount in USD, or a native amount with the FX Rate (native per USD) of its point. */
export type EquityAmount = number | { native: number; fxRate: number };

const toUsd = (amount: EquityAmount): number =>
  typeof amount === "number" ? amount : amount.native / amount.fxRate;

/** Equity of a linked Holding: its USD value minus its Liability's USD balance. Can be negative. */
export function equity(value: EquityAmount, balance: EquityAmount): number {
  return toUsd(value) - toUsd(balance);
}

/** Equity point by point over a projected Holding series and its Liability series (both USD). */
export function equitySeries(value: readonly number[], balance: readonly number[]): number[] {
  return value.map((v, month) => v - (balance[month] ?? 0));
}

/** Equity over the Holding's value, clamped to 0–1. A Holding worth 0 is 0% owned. */
export function percentOwned(value: EquityAmount, balance: EquityAmount): number {
  const valueUsd = toUsd(value);
  if (valueUsd === 0) return 0;
  return Math.min(1, Math.max(0, equity(value, balance) / valueUsd));
}

/** Sum of Equity across every Holding–Liability link; 0 with none. */
export function equityBuilt(
  pairs: readonly { value: EquityAmount; balance: EquityAmount }[],
): number {
  return pairs.reduce((sum, p) => sum + equity(p.value, p.balance), 0);
}
