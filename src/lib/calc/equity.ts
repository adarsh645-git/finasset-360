// Equity for a Holding linked to a Liability. Pointwise over plain USD
// numbers or series, so recorded and projected values share one rule (D12).

/** Holding value minus Liability balance, both in USD. Can be negative. */
export function equity(value: number, balance: number): number {
  return value - balance;
}

/** Equity at each point of a projected Holding and Liability series. */
export function equitySeries(values: readonly number[], balances: readonly number[]): number[] {
  return values.map((value, i) => equity(value, balances[i] ?? 0));
}

/** Equity over value, clamped to 0-1; a value of 0 is 0% owned. */
export function percentOwned(value: number, balance: number): number {
  if (value <= 0) return 0;
  return Math.min(1, Math.max(0, equity(value, balance) / value));
}

/** Sum of Equity across every Holding-Liability link; 0 with none. */
export function equityBuilt(equities: readonly number[]): number {
  return equities.reduce((sum, e) => sum + e, 0);
}
