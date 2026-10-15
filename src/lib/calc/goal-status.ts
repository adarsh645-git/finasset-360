import type { GoalStatus, GoalStatusInput } from "./types";

/** A Goal's derived status and progress from one nominal USD Net Worth series.
 * Returns data, not copy. The status comes from the first point at or above
 * the target: at or before today it is reached (and stays reached after a
 * dip), later it is projected, and with no such point it is beyond. */
export function goalStatus({ series, todayIndex, target, horizonYears }: GoalStatusInput): GoalStatus {
  const todayNetWorth = series[todayIndex]?.netWorth ?? 0;
  const progress = target > 0 ? Math.min(1, Math.max(0, todayNetWorth / target)) : 1;

  const first = series.findIndex((point) => point.netWorth >= target);
  if (first === -1) return { status: "beyond", horizonYears, progress };
  return {
    status: first <= todayIndex ? "reached" : "projected",
    month: series[first].month,
    monthsFromToday: first - todayIndex,
    progress,
  };
}
