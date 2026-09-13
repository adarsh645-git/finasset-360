import { formatMoney } from "@/lib/currency/format";
import type { NetWorthSummary } from "@/lib/net-worth/compute";
import type { NetWorthTimelinePoint } from "@/lib/net-worth/timeline";
import type { PayoffMarker, ProjectedNetWorthPoint } from "@/lib/projection/engine";
import { toChartPayoffMarkers } from "@/lib/projection/payoff-marker-label";
import { NetWorthTimelineChart } from "./NetWorthTimelineChart";

// The Net Worth figure, its Holdings/Liabilities breakdown with as-of date,
// and the recorded-plus-projected timeline (user stories 48–49, 55) — one
// block shared by the desktop dashboard (DashboardPanel, inside its
// two-column grid) and the narrow accordion's own first section (ticket 15:
// "Net Worth (figure, subline, timeline) → Portfolio outline → …"), so the
// two surfaces can't drift into showing different numbers for the same
// figure.
export function NetWorthHero({
  homeCurrency,
  netWorth,
  timeline,
  projected,
  payoffMarkers,
  liabilityNames,
  targetAmount,
}: {
  homeCurrency: string;
  netWorth: NetWorthSummary;
  timeline: NetWorthTimelinePoint[];
  projected: ProjectedNetWorthPoint[];
  payoffMarkers: PayoffMarker[];
  liabilityNames: Map<string, string>;
  targetAmount: number | null;
}) {
  const chartPayoffMarkers = toChartPayoffMarkers(payoffMarkers, liabilityNames, homeCurrency);

  return (
    <div>
      <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Net Worth</h2>
      <p className="text-3xl font-semibold tracking-tight">
        {formatMoney(netWorth.netWorth, homeCurrency)}
      </p>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Holdings {formatMoney(netWorth.holdingsTotal, homeCurrency)} · Liabilities{" "}
        {formatMoney(netWorth.liabilitiesTotal, homeCurrency)}
        {netWorth.asOfDate ? ` · as of ${netWorth.asOfDate}` : ""}
      </p>
      {/* The chart's viewBox is a fixed 320×64 (NetWorthTimelineChart's own
         WIDTH/HEIGHT) — comfortably inside any phone this ticket targets
         (verified at 390px, docs/SPEC.md's own reference width), but
         `overflow-x-auto` is a defensive floor rather than an active
         scrollbar: it only does anything on a viewport narrower than any
         device currently shipping, and "no horizontal scrolling anywhere"
         (ticket 15) should hold even there rather than silently break. */}
      <div className="mt-3 overflow-x-auto">
        <NetWorthTimelineChart
          homeCurrency={homeCurrency}
          recorded={timeline}
          projected={projected}
          payoffMarkers={chartPayoffMarkers}
          targetAmount={targetAmount}
        />
      </div>
    </div>
  );
}
