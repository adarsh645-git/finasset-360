import {
  project,
  type AssetClassId as CalcClassId,
  type ProjectionAssumptionsInput,
} from "@/lib/calc";
import type { PortfolioData } from "@/lib/read-model/types";
import { calcClassId, calcCountry } from "@/lib/views/shell";

/** The date `months` calendar months after `date`, clamped to the month's last day. */
export function addMonths(date: string, months: number): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const total = y * 12 + (m - 1) + months;
  const ty = Math.floor(total / 12);
  const tm = total % 12;
  const last = new Date(Date.UTC(ty, tm + 1, 0)).getUTCDate();
  return new Date(Date.UTC(ty, tm, Math.min(d, last))).toISOString().slice(0, 10);
}

const fraction = (v: number | null) => (v === null ? null : v / 100);

/** The read model's stored assumptions as calc's Projection input. */
export function calcAssumptions(data: PortfolioData): ProjectionAssumptionsInput {
  const a = data.assumptions;
  const country = (c: "US" | "IN") => {
    const x = a.byCountry[c];
    return {
      inflation: fraction(x.inflation),
      realEstate: fraction(x.realestate),
      stocks: fraction(x.stocks),
      cash: fraction(x.cash),
      monthlySavings: x.monthlySavings,
    };
  };
  return {
    countries: { US: country("US"), India: country("IN") },
    shared: {
      crypto: fraction(a.shared.crypto),
      metals: fraction(a.shared.metals),
      vehiclesAndOther: fraction(a.shared.other),
    },
    savingsGrowth: fraction(a.savingsGrowth),
    horizonYears: a.horizonYears,
  };
}

const rollup = (c: { assetsUsd: number[]; liabilitiesUsd: number[]; netUsd: number[] }) => ({
  netWorth: c.netUsd.slice(1),
  assets: c.assetsUsd.slice(1),
  liabilities: c.liabilitiesUsd.slice(1),
});

/** The Projection of current items from month 1 on, in USD. */
export function projectFromToday(data: PortfolioData) {
  const assumptions = calcAssumptions(data);
  const fxRate = data.fx.today?.rate ?? data.fx.history.at(-1)?.rate ?? 1;
  const hasRate = data.fx.today !== null || data.fx.history.length > 0;
  const usable = <T extends { country: "US" | "IN" }>(items: T[]) =>
    items.filter((i) => hasRate || i.country === "US");
  const result = project({
    holdings: usable(data.holdings.filter((h) => h.archivedAt === null)).map((h) => ({
      id: h.id,
      country: calcCountry(h.country),
      assetClass: calcClassId(h.assetClass) as CalcClassId,
      currentValue: h.currentValue,
    })),
    liabilities: usable(data.liabilities.filter((l) => l.archivedAt === null)).map((l) => ({
      id: l.id,
      country: calcCountry(l.country),
      balance: l.currentBalance,
      apr: l.apr / 100,
      monthlyPayment: l.monthlyPayment,
    })),
    assumptions,
    fxRate,
  });
  return {
    netWorth: result.netWorthUsd.slice(1),
    assets: result.totalAssetsUsd.slice(1),
    liabilities: result.totalLiabilitiesUsd.slice(1),
    /** Each Country's rollup from month 1 on (savings count as assets). */
    countries: {
      US: rollup(result.countries.US),
      India: rollup(result.countries.India),
    },
  };
}
