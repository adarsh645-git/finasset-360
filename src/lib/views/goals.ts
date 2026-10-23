import { DEFAULT_HORIZON_YEARS, goalStatus, netWorthOn, sampleDates, type NetWorthPoint } from "@/lib/calc";
import { compact, inDuration, monthLong } from "@/lib/format";
import type { PortfolioData } from "@/lib/read-model/types";
import { fxRatesOf, usableItems } from "@/lib/views/fx";
import { addMonths, projectFromToday } from "@/lib/views/overview";
import { historyItem } from "@/lib/views/shell";

export const GOALS_HEADING = "Net worth milestones";
export const GOALS_SUBTITLE =
  "Projected dates use the country-specific growth rates set on the Growth page, current loan payments and your monthly savings. Amounts are nominal.";

export type GoalRow = {
  id: string;
  /** The displayed name: the trimmed name, or "⟨compact target⟩ net worth". */
  name: string;
  target: number;
  status: {
    kind: "reached" | "projected" | "beyond";
    label: string;
    colour: "positive" | "secondary";
  };
  /** "$140K of $150K". */
  progressText: string;
  /** Whole percent, 0 to 100. */
  barPercent: number;
  barColour: "positive" | "ink";
};

/** A Goal's name as every surface shows it. */
export function displayName(goal: { name: string | null; targetUsd: number }): string {
  return goal.name?.trim() || `${compact(goal.targetUsd)} net worth`;
}

/** The all-Countries nominal Net Worth series: history from the earliest Valuation
 * to today, then the Projection over the horizon. Takes no view state. */
function netWorthSeries(data: PortfolioData, today: string) {
  const rates = fxRatesOf(data);
  const held = usableItems(data.holdings, rates).map(historyItem);
  const owed = usableItems(data.liabilities, rates).map(historyItem);
  const earliest = [...data.holdings, ...data.liabilities]
    .flatMap((i) => i.valuations.map((v) => v.date))
    .sort()[0];
  const dates = earliest === undefined ? [today] : sampleDates(earliest, earliest, today);
  const history: NetWorthPoint[] = dates.map((date) => ({
    month: date.slice(0, 7),
    netWorth: netWorthOn({ holdings: held, liabilities: owed }, rates, date, today),
  }));
  const projected: NetWorthPoint[] = projectFromToday(data).netWorth.map((netWorth, k) => ({
    month: addMonths(today, k + 1).slice(0, 7),
    netWorth,
  }));
  return { series: [...history, ...projected], todayIndex: history.length - 1 };
}

/** One row per Goal in the read model's order (target ascending). */
export function goalRows(data: PortfolioData, today: string = data.today): GoalRow[] {
  const { series, todayIndex } = netWorthSeries(data, today);
  const horizonYears = data.assumptions.horizonYears ?? DEFAULT_HORIZON_YEARS;
  const netNow = series[todayIndex]?.netWorth ?? 0;
  return data.goals.map((goal) => {
    const result = goalStatus({ series, todayIndex, target: goal.targetUsd, horizonYears });
    const when = result.month ? monthLong(`${result.month}-01`) : "";
    const label =
      result.status === "reached"
        ? `Reached ${when}`
        : result.status === "projected"
          ? `Projected ${when} · ${inDuration(result.monthsFromToday)}`
          : `Beyond the ${result.horizonYears}-year projection`;
    const barPercent = Math.round(result.progress * 100);
    return {
      id: goal.id,
      name: displayName(goal),
      target: goal.targetUsd,
      status: {
        kind: result.status,
        label,
        colour: result.status === "reached" ? "positive" : "secondary",
      },
      progressText: `${compact(netNow)} of ${compact(goal.targetUsd)}`,
      barPercent,
      barColour: barPercent >= 100 ? "positive" : "ink",
    };
  });
}

export type GoalsPage = {
  heading: string;
  subtitle: string;
  rows: GoalRow[];
  /** "No goals yet" shows in place of the cards. */
  empty: boolean;
};

export function buildGoalsPage(data: PortfolioData, today: string = data.today): GoalsPage {
  const rows = goalRows(data, today);
  return { heading: GOALS_HEADING, subtitle: GOALS_SUBTITLE, rows, empty: rows.length === 0 };
}
