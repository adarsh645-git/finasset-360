import {
  amortize,
  equity,
  fractionPaid,
  fxRateOn,
  percentOwned,
  project,
  resolveAssumptions,
  sampleDates,
  staleness,
  valueOn,
  type AssetClassId as CalcClassId,
  type FxRate,
} from "@/lib/calc";
import type { ChartSeries, Point } from "@/lib/chart";
import { dayMonth, DASH, inDuration, inr, monthLong, native, usd } from "@/lib/format";
import type { PortfolioData } from "@/lib/read-model/types";
import { updatedCue } from "@/lib/views/age-cue";
import { fxRatesOf } from "@/lib/views/fx";
import { EXISTING_ROUTES, hrefFor, type RouteFamily } from "@/lib/views/links";
import { loanColorVar } from "@/lib/views/liabilities";
import { addMonths, calcAssumptions } from "@/lib/views/projection";
import { calcClassId, calcCountry, historyItem } from "@/lib/views/shell";

export type LoanDetailStat = { label: string; value: string; sub: string };

export type LoanDetail = {
  id: string;
  name: string;
  breadcrumb: { label: string; href: string | null }[];
  badges: string[];
  usd: string;
  /** "₹34,30,000 at ₹83.40/$", or "Current balance" for a US loan, plus the Stale cue. */
  nativeLine: string;
  /** "10% of principal paid off", "₹38,00,000 borrowed in Apr 2022" and the fill, 0 to 1. */
  bar: { label: string; sub: string; fraction: number; colorVar: string };
  stats: LoanDetailStat[];
  /** Where Delete goes after archiving. */
  afterArchive: string;
  actions: { updateBalance: { href: string } };
  chart: {
    title: string;
    sub: string;
    today: string;
    height: number;
    zero: true;
    series: ChartSeries[];
  };
  /** Null for an unlinked loan, or one whose Holding is archived. */
  securedAgainst: { name: string; worth: string; equity: string; href: string | null } | null;
};

const DEFAULT_MONTHS_AFTER_PAYOFF = 6;
const aprText = (apr: number) => `${Number(apr.toFixed(2))}%`;

/** The page's model, or null (→ not-found) for an archived, unknown or foreign loan. */
export function buildLoanDetail(
  data: PortfolioData,
  { loanId, existing = EXISTING_ROUTES }: { loanId: string; existing?: ReadonlySet<RouteFamily> },
): LoanDetail | null {
  const loan = data.liabilities.find((l) => l.id === loanId && l.archivedAt === null);
  if (!loan) return null;
  const { today } = data;
  const india = loan.country === "IN";
  const country = calcCountry(loan.country);

  const rates = fxRatesOf(data);
  const hasRate = !india || rates.length > 0;
  const rateNow = india && hasRate ? fxRateOn(rates, today) : null;
  const fxNow = rateNow?.rate ?? 1;
  const toUsd = (amount: number) => amount / fxNow;
  const usdOf = (amount: number) => (hasRate ? toUsd(amount) : null);

  // Native line: rate, or "Current balance", then the Stale cue.
  let nativeLine: string;
  if (india) {
    if (rateNow) {
      const asOf = rateNow.asOf < today ? ` as of ${dayMonth(rateNow.asOf)}` : "";
      nativeLine = `${inr(loan.currentBalance)} at ₹${rateNow.rate.toFixed(2)}/$${asOf}`;
    } else {
      nativeLine = inr(loan.currentBalance);
    }
  } else {
    nativeLine = "Current balance";
  }
  const { ageDays } = staleness(
    { kind: "manual", valuations: loan.valuations.map((v) => ({ date: v.date, source: v.source })) },
    new Date(`${today}T00:00:00Z`),
  );
  const cue = updatedCue(ageDays);
  if (cue) nativeLine = `${nativeLine} ${cue}`;

  const paid = fractionPaid(loan.principal, loan.currentBalance);
  const colorVar = loanColorVar(data.liabilities, loan.id);

  const series = amortize(
    [
      {
        id: loan.id,
        country,
        balance: loan.currentBalance,
        apr: loan.apr / 100,
        monthlyPayment: loan.monthlyPayment,
      },
    ],
    fxNow,
  ).get(loan.id)!;

  const stats: LoanDetailStat[] = [
    {
      label: "Interest rate",
      value: aprText(loan.apr),
      sub: loan.revolving ? "Revolving credit" : "Fixed APR",
    },
    {
      label: "Monthly payment",
      value: native(loan.monthlyPayment, country),
      sub: india ? `≈ ${usd(usdOf(loan.monthlyPayment))}` : loan.revolving ? "Your planned payment" : "EMI",
    },
    payoffStat(),
    interestStat(),
  ];

  function payoffStat(): LoanDetailStat {
    if (loan!.currentBalance <= 0) return { label: "Projected payoff", value: "Paid off", sub: "Balance is 0" };
    if (series.notOnTrack || series.payoffMonth === undefined) {
      return { label: "Projected payoff", value: "Never", sub: "Payment doesn’t cover interest" };
    }
    const duration = inDuration(series.payoffMonth);
    const term = loan!.termYears ? ` · ${loan!.termYears}-yr term` : "";
    return {
      label: "Projected payoff",
      value: monthLong(addMonths(today, series.payoffMonth)),
      sub: `${duration[0]!.toUpperCase()}${duration.slice(1)}${term}`,
    };
  }

  function interestStat(): LoanDetailStat {
    if (loan!.currentBalance <= 0) {
      return { label: "Interest remaining", value: native(0, country), sub: "If paid on schedule" };
    }
    if (series.interestRemaining === undefined) {
      return { label: "Interest remaining", value: DASH, sub: "If paid on schedule" };
    }
    return {
      label: "Interest remaining",
      value: native(series.interestRemaining, country),
      sub: "If paid on schedule",
    };
  }

  const linked = data.holdings.find((h) => h.id === loan.linkedHoldingId && h.archivedAt === null);

  return {
    id: loan.id,
    name: loan.name,
    breadcrumb: [
      { label: "Liabilities", href: hrefFor({ kind: "liabilities" }, existing) },
      { label: loan.name, href: null },
    ],
    badges: india ? ["India", "INR"] : ["United States", "USD"],
    usd: usd(usdOf(loan.currentBalance)),
    nativeLine,
    bar: {
      label: `${Math.round(paid * 100)}% of principal paid off`,
      sub: `${native(loan.principal, country)} borrowed in ${monthLong(`${loan.startMonth}-01`)}`,
      fraction: paid,
      colorVar,
    },
    stats,
    afterArchive: hrefFor({ kind: "liabilities" }, existing) ?? "/",
    actions: { updateBalance: { href: `/liabilities/${loan.id}?modal=update-balance&liability=${loan.id}` } },
    chart: buildChart(),
    securedAgainst: linked ? card() : null,
  };

  function card(): LoanDetail["securedAgainst"] {
    const h = linked!;
    const hIndia = h.country === "IN";
    const valueUsd = hIndia ? (rateNow ? h.currentValue / fxNow : null) : h.currentValue;
    if (valueUsd === null || !hasRate) {
      return { name: h.name, worth: `Worth ${DASH}`, equity: `${DASH} equity →`, href: hrefFor({ kind: "holding", id: h.id }, existing) };
    }
    const balanceUsd = toUsd(loan!.currentBalance);
    const owned = percentOwned(valueUsd, balanceUsd);
    return {
      name: h.name,
      worth: `Worth ${usd(valueUsd)} · ${Math.round(owned * 100)}% owned`,
      equity: `${usd(equity(valueUsd, balanceUsd))} equity →`,
      href: hrefFor({ kind: "holding", id: h.id }, existing),
    };
  }

  function buildChart(): LoanDetail["chart"] {
    const horizonMonths = resolveAssumptions(calcAssumptions(data)).horizonYears * 12;
    const afterPayoff =
      series.notOnTrack || series.payoffMonth === undefined
        ? horizonMonths
        : Math.min(series.payoffMonth + DEFAULT_MONTHS_AFTER_PAYOFF, horizonMonths);

    const first = [...loan!.valuations.map((v) => v.date)].sort()[0] ?? loan!.createdAt.slice(0, 10);
    const dates = sampleDates(first, first, today);
    const futureDates = Array.from({ length: afterPayoff }, (_, k) => addMonths(today, k + 1));

    const toUsdOn = (amount: number, date: string, rs: readonly FxRate[], isIndia: boolean) =>
      isIndia ? amount / fxRateOn(rs, date).rate : amount;

    const balanceHistory = historyItem(loan!);
    const balance: Point[] = hasRate
      ? [
          ...dates.map((date) => ({ date, value: toUsdOn(valueOn(balanceHistory, date, today), date, rates, india) })),
          ...futureDates.map((date, k) => ({ date, value: series.usd[k + 1] ?? 0 })),
        ]
      : [];

    const out: ChartSeries[] = [
      {
        name: "Balance",
        color: `var(${colorVar})`,
        points: balance,
        area: true,
        areaOpacity: 0.08,
        width: 2,
        dot: true,
        bold: true,
      },
    ];

    if (linked && hasRate) {
      const hIndia = linked.country === "IN";
      if (!hIndia || rates.length > 0) {
        const item = historyItem(linked);
        const past = dates.map((date) => ({
          date,
          value: toUsdOn(valueOn(item, date, today), date, rates, hIndia),
        }));
        const { holdings } = project({
          holdings: [
            {
              id: linked.id,
              country: calcCountry(linked.country),
              assetClass: calcClassId(linked.assetClass) as CalcClassId,
              currentValue: linked.currentValue,
            },
          ],
          liabilities: [],
          assumptions: calcAssumptions(data),
          fxRate: hIndia ? fxNow : 1,
        });
        const future = futureDates.map((date, k) => ({ date, value: holdings[0]!.usd[k + 1] ?? 0 }));
        out.push({
          name: linked.name,
          color: "var(--ink3)",
          points: [...past, ...future],
          width: 1.5,
        });
      }
    }

    return {
      title: "Balance over time",
      sub: linked ? `Against the value of ${linked.name}` : "History and payoff projection",
      today,
      height: 240,
      zero: true,
      series: out,
    };
  }
}

