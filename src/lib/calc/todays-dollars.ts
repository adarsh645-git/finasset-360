import { resolveAssumptions } from "./assumptions";
import type { Country, NetWorthPoint, ProjectionAssumptionsInput } from "./types";

const monthIndex = (month: string): number => {
  const [y, m] = month.split("-").map(Number);
  return y * 12 + m - 1;
};

/** Restate per-Country USD series in Today's dollars: each point is divided by
 * (1 + that Country's inflation)^(k/12), k the whole calendar months from
 * `todayMonth` (negative for the past). Countries are deflated, then summed by month. */
export function restateInTodaysDollars(
  byCountry: Partial<Record<Country, readonly NetWorthPoint[]>>,
  todayMonth: string,
  assumptions: ProjectionAssumptionsInput,
): NetWorthPoint[] {
  const resolved = resolveAssumptions(assumptions);
  const totals = new Map<string, number>();
  for (const country of Object.keys(byCountry) as Country[]) {
    const inflation = resolved.countries[country].inflation;
    for (const point of byCountry[country] ?? []) {
      const k = monthIndex(point.month) - monthIndex(todayMonth);
      const deflated = point.netWorth / (1 + inflation) ** (k / 12);
      totals.set(point.month, (totals.get(point.month) ?? 0) + deflated);
    }
  }
  return [...totals.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([month, netWorth]) => ({ month, netWorth }));
}
