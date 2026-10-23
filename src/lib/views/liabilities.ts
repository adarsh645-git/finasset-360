import {
  amortize,
  fractionPaid,
  fxRateOn,
  setTwelveMonthChange,
  staleness,
  weightedApr,
  type LiabilitySeries,
} from "@/lib/calc";
import { compact, DASH, inDuration, inr, monthLong, native, usd } from "@/lib/format";
import type { LiabilityData, PortfolioData } from "@/lib/read-model/types";
import { ageCue } from "@/lib/views/age-cue";
import { fxRatesOf, usableItems } from "@/lib/views/fx";
import { ADDING, EXISTING_ROUTES, hrefFor, type RouteFamily } from "@/lib/views/links";
import { addMonths } from "@/lib/views/projection";
import { calcCountry, historyItem } from "@/lib/views/shell";

/** Five loan colours, assigned by creation order and cycling (design D10). */
export const LOAN_COLOR_COUNT = 5;

export type LoanRow = {
  id: string;
  name: string;
  /** "US" or "IN". */
  badge: string;
  usd: string;
  /** Native balance of an India loan; blank for a US one. */
  native: string;
  /** Share of the principal paid off, 0 to 1, for the bar. */
  paidFraction: number;
  /** "10% paid · 8.5% · ₹33,000/mo". */
  meta: string;
  /** "· 47 days old" when Stale, otherwise null. */
  cue: string | null;
  /** "Secures Pune apartment · Paid off Jun 2039" or "No payoff at this payment". */
  secondary: string;
  /** CSS variable of the loan's colour, `--loan-1` … `--loan-5`. */
  colorVar: string;
  /** Loan detail, or null while that route doesn't exist. */
  href: string | null;
  /** USD balance, for sorting. */
  usdValue: number;
};

export type LoanStat = { label: string; value: string; sub: string };

export type LiabilitiesView = {
  header: { total: string; paidDown: string };
  stats: LoanStat[];
  rows: LoanRow[];
  empty: { message: string; addHref: string | null } | null;
  /** The "+ Add loan" button target; null while adding is off. */
  addHref: string | null;
};

const ADD_LOAN_HREF = "/liabilities?modal=add-liability";

/** Colour variable by creation order over every loan, archived included. */
export function loanColorVar(all: readonly { id: string; createdAt: string }[], id: string): string {
  const order = [...all].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  const index = Math.max(0, order.findIndex((l) => l.id === id));
  return `--loan-${(index % LOAN_COLOR_COUNT) + 1}`;
}

const aprText = (apr: number) => `${Number(apr.toFixed(2))}%`;

function cueOf(l: LiabilityData, today: string): string | null {
  const { ageDays } = staleness(
    {
      kind: "manual",
      valuations: l.valuations.map((v) => ({ date: v.date, source: v.source })),
    },
    new Date(`${today}T00:00:00Z`),
  );
  const age = ageCue("liability", ageDays);
  return age ? `· ${age}` : null;
}

export function buildLiabilities(
  data: PortfolioData,
  {
    existing = EXISTING_ROUTES,
    adding = ADDING,
  }: { existing?: ReadonlySet<RouteFamily>; adding?: boolean } = {},
): LiabilitiesView {
  const { today } = data;
  const rates = fxRatesOf(data);
  const fxRate = rates.length ? fxRateOn(rates, today).rate : 1;
  const addHref = adding ? ADD_LOAN_HREF : null;

  const usable = usableItems(data.liabilities, rates);
  const active = usable.filter((l) => l.archivedAt === null);
  const usdPer = (l: LiabilityData) => (l.country === "IN" ? 1 / fxRate : 1);

  const total = active.reduce((sum, l) => sum + l.currentBalance * usdPer(l), 0);
  const change = setTwelveMonthChange(usable.map(historyItem), { fxRates: rates, today }, "liabilities");
  const header = {
    total: usd(total),
    paidDown: `${change ? compact(change.amount) : DASH} paid down in 12 mo`,
  };

  const owing = active.filter((l) => l.currentBalance > 0);
  const series = amortize(
    active.map((l) => ({
      id: l.id,
      country: calcCountry(l.country),
      balance: l.currentBalance,
      apr: l.apr / 100,
      monthlyPayment: l.monthlyPayment,
    })),
    fxRate,
  );
  const seriesOf = (l: LiabilityData): LiabilitySeries => series.get(l.id)!;

  let debtFree = { value: DASH, sub: "If paid on schedule" };
  const stats: LoanStat[] = [
    { label: "Monthly payments", value: DASH, sub: "All EMIs, converted to USD" },
    { label: "Weighted rate", value: DASH, sub: "By current balance" },
    { label: "Debt-free", value: DASH, sub: "" },
    { label: "Interest remaining", value: DASH, sub: "If paid on schedule" },
  ];
  if (owing.length) {
    const stuck = owing.filter((l) => seriesOf(l).notOnTrack);
    if (stuck.length) {
      debtFree = { value: "Not on track", sub: "A payment doesn’t cover interest" };
    } else {
      const last = Math.max(...owing.map((l) => seriesOf(l).payoffMonth ?? 0));
      const duration = inDuration(last);
      debtFree = {
        value: monthLong(addMonths(today, last)),
        sub: `${duration[0]!.toUpperCase()}${duration.slice(1)} at current payments`,
      };
    }
    const interest = owing.reduce((sum, l) => sum + (seriesOf(l).interestRemaining ?? 0) * usdPer(l), 0);
    stats[0]!.value = usd(owing.reduce((sum, l) => sum + l.monthlyPayment * usdPer(l), 0));
    stats[1]!.value = `${weightedApr(
      owing.map((l) => ({ balance: l.currentBalance * usdPer(l), apr: l.apr })),
    )!.toFixed(2)}%`;
    stats[2]!.value = debtFree.value;
    stats[3]!.value = usd(interest);
    stats[3]!.sub = stuck.length
      ? `Excludes ${stuck.length} ${stuck.length === 1 ? "loan" : "loans"} not on track`
      : "If paid on schedule";
  }
  stats[2]!.sub = owing.length ? debtFree.sub : "At current payments";

  const rows: LoanRow[] = active
    .map((l): LoanRow => {
      const s = seriesOf(l);
      const holding = data.holdings.find((h) => h.id === l.linkedHoldingId && h.archivedAt === null);
      const payoff =
        s.payoffMonth === undefined
          ? "No payoff at this payment"
          : `Paid off ${monthLong(addMonths(today, s.payoffMonth))}`;
      const paid = fractionPaid(l.principal, l.currentBalance);
      return {
        id: l.id,
        name: l.name,
        badge: l.country,
        usd: usd(l.currentBalance * usdPer(l)),
        native: l.country === "IN" ? inr(l.currentBalance) : "",
        paidFraction: paid,
        meta: `${Math.round(paid * 100)}% paid · ${aprText(l.apr)} · ${native(l.monthlyPayment, calcCountry(l.country))}/mo`,
        cue: cueOf(l, today),
        secondary: holding ? `Secures ${holding.name} · ${payoff}` : payoff,
        colorVar: loanColorVar(data.liabilities, l.id),
        href: hrefFor({ kind: "liability", id: l.id }, existing),
        usdValue: l.currentBalance * usdPer(l),
      };
    })
    .sort((a, b) => b.usdValue - a.usdValue);

  return {
    header,
    stats,
    rows,
    empty: active.length ? null : { message: "No loans", addHref },
    addHref,
  };
}
