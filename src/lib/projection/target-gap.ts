import { formatMoney } from "@/lib/currency/format";
import type { ProjectionAssumptions } from "@/components/portfolio/types";
import { projectNetWorth, type ProjectionLiabilityInput } from "./engine";

// How far past the target date to keep searching for a crossing before
// giving up (ticket 13) — the achievable date isn't gated by whatever
// horizon the User happens to have typed into the chart, so this runs its
// own projection sized to reach comfortably past the target rather than
// reusing `assumptions.horizon_years`.
const CROSSING_SEARCH_BUFFER_YEARS = 50;

/** Whole calendar years from `from` to `to`, floored — e.g. one day short of
 * a year counts as 0, not 1. Mirrors `engine.ts`'s `addMonths` in reading
 * `YYYY-MM-DD` fields directly rather than trusting `Date`'s local
 * timezone. */
function wholeCalendarYearsBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  let years = ty - fy;
  if (tm < fm || (tm === fm && td < fd)) years -= 1;
  return years;
}

export type TargetGap = {
  targetAmount: number;
  targetDate: string;
  /** Whole years from `today` to `targetDate` — the same granularity
   * `projectNetWorth` samples at, so the two line up exactly. */
  targetYearIndex: number;
  /** `targetAmount` minus the real Net Worth projected to `targetDate` —
   * positive is short, negative is over, mirroring
   * `target-allocation/distribution.ts`'s own `gapAmount` sign. */
  gapAtTargetDate: number;
  /** The first year the real line reaches (or already sits at/above) the
   * target, or `null` if it doesn't within `targetYearIndex +
   * CROSSING_SEARCH_BUFFER_YEARS` years at the current assumptions — the
   * target is never mathematically unreachable (ticket 14 can always solve
   * for a contribution that gets there), but the *current* contribution
   * genuinely might not. */
  crossingYearIndex: number | null;
  crossingDate: string | null;
  /** `crossingYearIndex - targetYearIndex` — positive late, negative early,
   * `null` alongside `crossingYearIndex`. */
  yearsLate: number | null;
};

/** The Target Net Worth gap (user stories 87-89): where the real line sits
 * relative to the target on its own date, and when the real line actually
 * gets there. Read entirely off `realNetWorth` (ticket 12) — the target is
 * stated in today's purchasing power (docs/SPEC.md), never the nominal
 * line. Pure: runs its own `projectNetWorth` call, sized independently of
 * whatever horizon the caller's chart happens to be showing. */
export function computeTargetGap({
  today,
  holdingsTotal,
  liabilities,
  assumptions,
  targetAmount,
  targetDate,
}: {
  today: string;
  holdingsTotal: number;
  liabilities: ProjectionLiabilityInput[];
  assumptions: ProjectionAssumptions;
  targetAmount: number;
  targetDate: string;
}): TargetGap {
  const targetYearIndex = Math.max(0, wholeCalendarYearsBetween(today, targetDate));
  const searchHorizonYears = targetYearIndex + CROSSING_SEARCH_BUFFER_YEARS;

  const points = projectNetWorth({
    today,
    holdingsTotal,
    liabilities,
    assumptions: { ...assumptions, horizon_years: searchHorizonYears },
  });

  const atTargetDate = points[Math.min(targetYearIndex, points.length - 1)];
  const crossing = points.find((point) => point.realNetWorth >= targetAmount) ?? null;

  return {
    targetAmount,
    targetDate,
    targetYearIndex,
    gapAtTargetDate: targetAmount - atTargetDate.realNetWorth,
    crossingYearIndex: crossing ? crossing.yearIndex : null,
    crossingDate: crossing ? crossing.date : null,
    yearsLate: crossing ? crossing.yearIndex - targetYearIndex : null,
  };
}

/** "2051 — 5 years late" (user story 88: the date leads). Degrades to a
 * plain miss, rather than a bare "never", when the real line doesn't cross
 * within the search window at the current contribution. */
export function formatTargetDateLabel(gap: TargetGap): string {
  if (gap.crossingDate === null || gap.yearsLate === null) {
    return `Not reached within ${gap.targetYearIndex + CROSSING_SEARCH_BUFFER_YEARS} years at your current plan`;
  }
  const year = gap.crossingDate.slice(0, 4);
  if (gap.yearsLate === 0) return `${year} — on track`;
  const lateYears = Math.abs(gap.yearsLate);
  const noun = lateYears === 1 ? "year" : "years";
  return gap.yearsLate > 0 ? `${year} — ${lateYears} ${noun} late` : `${year} — ${lateYears} ${noun} early`;
}

/** The money figure shown beneath the date (user story 89) — the magnitude,
 * available once the direction is already clear from the date above it. */
export function formatTargetAmountLabel(gap: TargetGap, homeCurrency: string): string {
  if (Math.abs(gap.gapAtTargetDate) < 0.005) return "On target";
  return gap.gapAtTargetDate > 0
    ? `${formatMoney(gap.gapAtTargetDate, homeCurrency)} short at your target date`
    : `${formatMoney(-gap.gapAtTargetDate, homeCurrency)} over at your target date`;
}

/** "Your 2046 target has passed; you reached 5.2M against 6M. Set a new
 * one?" (user story 90) — `null` when there's no Target, or its date hasn't
 * passed yet. Shared by every screen that can be a User's "next visit"
 * after a target date passes (the Dashboard and the Plan page both render
 * this rather than only one of them), so the wording can't drift between
 * them. Reads whatever Net Worth is handed in directly — the Dashboard's
 * own current total and the Plan page's projected-today point are the same
 * number, just already computed differently by each caller. */
export function passedTargetMessage({
  today,
  targetAmount,
  targetDate,
  currentNetWorth,
  homeCurrency,
}: {
  today: string;
  targetAmount: number | null;
  targetDate: string | null;
  currentNetWorth: number;
  homeCurrency: string;
}): string | null {
  if (targetAmount === null || targetDate === null || targetDate >= today) return null;
  const year = targetDate.slice(0, 4);
  return `Your ${year} target has passed; you reached ${formatMoney(currentNetWorth, homeCurrency)} against ${formatMoney(targetAmount, homeCurrency)}. Set a new one?`;
}
