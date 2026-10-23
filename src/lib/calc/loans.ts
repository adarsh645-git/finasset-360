import { project } from "./projection";
import type { LiabilitySeries, ProjectionLiability } from "./types";

/** Each loan's amortization (payoff month, interest remaining, Not on track), by id. */
export function amortize(
  liabilities: readonly ProjectionLiability[],
  fxRate: number,
): Map<string, LiabilitySeries> {
  const { liabilities: series } = project({ holdings: [], liabilities, assumptions: {}, fxRate });
  return new Map(series.map((s) => [s.id, s]));
}

/** APR weighted by balance (same unit for every loan); undefined with no balance. */
export function weightedApr(loans: readonly { balance: number; apr: number }[]): number | undefined {
  const total = loans.reduce((sum, l) => sum + l.balance, 0);
  if (total <= 0) return undefined;
  return loans.reduce((sum, l) => sum + l.balance * l.apr, 0) / total;
}

/** Share of the principal paid off, clamped to 0 to 1; a loan with no principal is 0. */
export function fractionPaid(principal: number, balance: number): number {
  if (principal <= 0) return 0;
  return Math.min(1, Math.max(0, (principal - balance) / principal));
}
