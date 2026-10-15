/** One month of the nominal USD Net Worth series; `month` is "YYYY-MM". */
export interface NetWorthPoint {
  month: string;
  netWorth: number;
}

export type GoalStatus =
  | { status: "reached"; month: string; progress: number }
  | { status: "projected"; month: string; monthsFromToday: number; progress: number }
  | { status: "beyond"; horizonYears: number; progress: number };

/** Derives a Goal's status from the all-Countries nominal series (recorded
 * history, then the Projection), with `todayIndex` marking today's point.
 * Returns data, not copy. */
export function deriveGoalStatus(
  series: NetWorthPoint[],
  todayIndex: number,
  target: number,
  horizonYears: number,
): GoalStatus {
  const progress = clamp(series[todayIndex].netWorth / target, 0, 1);
  const firstIndex = series.findIndex((point) => point.netWorth >= target);

  if (firstIndex === -1) return { status: "beyond", horizonYears, progress };
  const month = series[firstIndex].month;
  if (firstIndex <= todayIndex) return { status: "reached", month, progress };
  return { status: "projected", month, monthsFromToday: firstIndex - todayIndex, progress };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
