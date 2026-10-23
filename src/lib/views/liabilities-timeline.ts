import { fxRateOn, netWorthOn, project, sampleDates, type FxRate } from "@/lib/calc";
import { stackSeries, type ChartSeries, type Point } from "@/lib/chart";
import type { LiabilityData, PortfolioData } from "@/lib/read-model/types";
import { calcAssumptions, addMonths } from "@/lib/views/projection";
import { calcCountry, historyItem } from "@/lib/views/shell";

export type PayoffTimeline = {
  series: ChartSeries[];
  today: string;
  height: number;
  zero: true;
  legend: { name: string; color: string }[];
};

const HEIGHT = 260;

/**
 * Payoff timeline (design D11): every Liability's USD balance stacked, largest
 * current balance at the bottom. History from the first Liability Valuation at the
 * shared sample dates, then the month-by-month Projection. Archived loans count
 * while held. All points are returned; the chart trims at today with the
 * projection off. Null when `loans` (the usable Liabilities) has no active loan.
 */
export function buildPayoffTimeline(
  data: PortfolioData,
  loans: readonly LiabilityData[],
  rates: readonly FxRate[],
  colorOf: (id: string) => string,
): PayoffTimeline | null {
  const { today } = data;
  const active = loans.filter((l) => l.archivedAt === null);
  if (active.length === 0) return null;

  const earliest = loans.flatMap((l) => l.valuations.map((v) => v.date)).sort()[0] ?? today;
  const dates = sampleDates(earliest, earliest, today);

  const fxRate = rates.length ? fxRateOn(rates, today).rate : 1;
  const projection = project({
    holdings: [],
    liabilities: active.map((l) => ({
      id: l.id,
      country: calcCountry(l.country),
      balance: l.currentBalance,
      apr: l.apr / 100,
      monthlyPayment: l.monthlyPayment,
    })),
    assumptions: calcAssumptions(data),
    fxRate,
  });
  const months = projection.totalLiabilitiesUsd.length - 1;
  const projected = Array.from({ length: months }, (_, k) => addMonths(today, k + 1));
  const all = [...dates, ...projected];

  const layers = [...loans]
    .map((l) => {
      const item = historyItem(l);
      const past = dates.map((d) => 0 - netWorthOn({ holdings: [], liabilities: [item] }, rates, d, today));
      const own = projection.liabilities.find((s) => s.id === l.id);
      const future = projected.map((_, k) => (own ? own.usd[k + 1]! : 0));
      return { loan: l, values: [...past, ...future], now: past[past.length - 1]! };
    })
    .sort((a, b) => b.now - a.now || a.loan.id.localeCompare(b.loan.id));

  const series = stackSeries(
    layers.map(({ loan, values }) => ({
      name: loan.name,
      color: `var(${colorOf(loan.id)})`,
      points: all.map((date, i): Point => ({ date, value: values[i]! })),
      areaOpacity: 0.35,
      width: 1,
    })),
  );

  return {
    series,
    today,
    height: HEIGHT,
    zero: true,
    legend: series.map((s) => ({ name: s.name!, color: s.color })),
  };
}
