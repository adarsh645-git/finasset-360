// A linked Holding's Linked loan card, "Your equity" stat and "Value vs. loan" chart (design D18).
import { amortize, equity, equitySeries, fxRateOn, percentOwned, valueOn } from "@/lib/calc";
import type { Point } from "@/lib/chart";
import { DASH, native, usd } from "@/lib/format";
import type { PortfolioData } from "@/lib/read-model/types";
import { fxRatesOf } from "@/lib/views/fx";
import type { HoldingChart } from "@/lib/views/holding-history";
import { buildChart } from "@/lib/views/holding-history";
import { EXISTING_ROUTES, hrefFor, type RouteFamily } from "@/lib/views/links";
import { loanColorVar } from "@/lib/views/liabilities";
import { calcCountry, historyItem } from "@/lib/views/shell";

export type LinkedLoanCard = {
  label: string;
  name: string;
  /** "8.5% · ₹33,000/mo". */
  line: string;
  /** "$41,127 →". */
  balance: string;
  href: string | null;
};

export type HoldingEquity = {
  linkedLoan: LinkedLoanCard;
  stat: { label: string; value: string; sub: string };
  /** Null when an FX Rate is missing, so the page keeps its plain chart. */
  chart: HoldingChart | null;
};

const aprText = (apr: number) => `${Number(apr.toFixed(2))}%`;

/** Null when no active loan links to the Holding. */
export function buildHoldingEquity(
  data: PortfolioData,
  { holdingId, existing = EXISTING_ROUTES }: { holdingId: string; existing?: ReadonlySet<RouteFamily> },
): HoldingEquity | null {
  const holding = data.holdings.find((h) => h.id === holdingId && h.archivedAt === null);
  const loan = data.liabilities.find((l) => l.linkedHoldingId === holdingId && l.archivedAt === null);
  if (!holding || !loan) return null;
  const { today } = data;

  const rates = fxRatesOf(data);
  const holdingIndia = holding.country === "IN";
  const loanIndia = loan.country === "IN";
  const hasRate = (!holdingIndia && !loanIndia) || rates.length > 0;
  const fxNow = hasRate && rates.length > 0 ? fxRateOn(rates, today).rate : 1;
  const loanCountry = calcCountry(loan.country);

  const balanceUsd = hasRate ? (loanIndia ? loan.currentBalance / fxNow : loan.currentBalance) : null;
  const valueUsd = hasRate ? (holdingIndia ? holding.currentValue / fxNow : holding.currentValue) : null;

  const linkedLoan: LinkedLoanCard = {
    label: "Linked loan",
    name: loan.name,
    line: `${aprText(loan.apr)} · ${native(loan.monthlyPayment, loanCountry)}/mo`,
    balance: `${usd(balanceUsd)} →`,
    href: hrefFor({ kind: "liability", id: loan.id }, existing),
  };

  if (balanceUsd === null || valueUsd === null) {
    return { linkedLoan, stat: { label: "Your equity", value: DASH, sub: DASH }, chart: null };
  }

  const owned = percentOwned(valueUsd, balanceUsd);
  const stat = {
    label: "Your equity",
    value: usd(equity(valueUsd, balanceUsd)),
    sub: `${Math.round(owned * 100)}% owned outright`,
  };

  // The Holding's own chart supplies the Value points; the loan follows the same dates.
  const base = buildChart(data, holding, rates, true);
  const valuePoints = base.series[0]!.points;
  const history = historyItem(loan);
  const amortized = amortize(
    [
      {
        id: loan.id,
        country: loanCountry,
        balance: loan.currentBalance,
        apr: loan.apr / 100,
        monthlyPayment: loan.monthlyPayment,
      },
    ],
    fxNow,
  ).get(loan.id)!;
  let month = 0;
  const loanPoints: Point[] = valuePoints.map((p) => {
    if (p.date <= today) {
      const at = valueOn(history, p.date, today);
      return { date: p.date, value: loanIndia ? at / fxRateOn(rates, p.date).rate : at };
    }
    month += 1;
    return { date: p.date, value: amortized.usd[month] ?? 0 };
  });
  const equityPoints: Point[] = equitySeries(
    valuePoints.map((p) => p.value),
    loanPoints.map((p) => p.value),
  ).map((value, i) => ({ date: valuePoints[i]!.date, value }));

  const chart: HoldingChart = {
    ...base,
    title: "Value vs. loan",
    sub: "The shaded gap between the two lines is your equity",
    zero: true,
    series: [
      { ...base.series[0]!, areaOpacity: 0.12, base: loanPoints },
      {
        name: "Loan balance",
        color: `var(${loanColorVar(data.liabilities, loan.id)})`,
        points: loanPoints,
        width: 2,
        dot: true,
      },
      { name: "Equity", color: "var(--ink3)", points: equityPoints, line: false, scaled: false },
    ],
  };
  return { linkedLoan, stat, chart };
}
