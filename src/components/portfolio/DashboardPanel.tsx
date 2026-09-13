import { HomeCurrencyPicker } from "@/components/HomeCurrencyPicker";
import { SignOutButton } from "@/components/SignOutButton";
import { DistributionBar } from "@/components/plan/DistributionBar";
import { formatMoney } from "@/lib/currency/format";
import type { CheckInScope } from "@/lib/check-in/queue";
import type { NetWorthSummary } from "@/lib/net-worth/compute";
import type { NetWorthTimelinePoint } from "@/lib/net-worth/timeline";
import type { PayoffMarker, ProjectedNetWorthPoint } from "@/lib/projection/engine";
import { toChartPayoffMarkers } from "@/lib/projection/payoff-marker-label";
import { passedTargetMessage } from "@/lib/projection/target-gap";
import type { AssetClassDistributionRow } from "@/lib/target-allocation/distribution";
import { NetWorthTimelineChart } from "./NetWorthTimelineChart";
import { StalenessList, type StaleItem } from "./StalenessList";

// Shown in the rightmost column when nothing is selected (user story 98) —
// the ticket 01 dashboard content, the Net Worth headline with its
// component breakdown and as-of date (user stories 48–49), the recorded Net
// Worth timeline (user story 55), the Target Allocation distribution bars
// (user stories 52–54), and the staleness list (user story 31).
//
// Above ~1200px, headline+timeline sit beside the distribution bars in a
// two-column grid, with staleness and Start Check-in stacking full-width
// below both (ticket 09's checklist and the spec's own layout note).
export function DashboardPanel({
  today,
  homeCurrency,
  netWorth,
  timeline,
  projected,
  payoffMarkers,
  liabilityNames,
  staleItems,
  distribution,
  targetAmount,
  targetDate,
  onStartCheckIn,
}: {
  today: string;
  homeCurrency: string;
  netWorth: NetWorthSummary;
  timeline: NetWorthTimelinePoint[];
  projected: ProjectedNetWorthPoint[];
  payoffMarkers: PayoffMarker[];
  liabilityNames: Map<string, string>;
  staleItems: StaleItem[];
  distribution: AssetClassDistributionRow[];
  // The Target Net Worth (ticket 13), drawn on this hero timeline too, not
  // only the Plan page's own copy of this same chart.
  targetAmount: number | null;
  // Paired with `targetAmount` so this, the actual landing view on a
  // fresh visit, can carry the passed-target-date prompt (user story 90)
  // rather than that prompt only ever surfacing on the Plan page.
  targetDate: string | null;
  // Starts the guided monthly pass (ticket 08, user story 39-40) — owned by
  // PortfolioShell, which is what suspends column browsing for it.
  onStartCheckIn: (scope: CheckInScope) => void;
}) {
  const chartPayoffMarkers = toChartPayoffMarkers(payoffMarkers, liabilityNames, homeCurrency);
  const passedTarget = passedTargetMessage({
    today,
    targetAmount,
    targetDate,
    currentNetWorth: netWorth.netWorth,
    homeCurrency,
  });

  return (
    <div className="flex flex-1 flex-col gap-8 overflow-y-auto px-8 py-8">
      {passedTarget && <p className="text-sm font-medium">{passedTarget}</p>}

      <div className="grid grid-cols-1 gap-8 min-[1200px]:grid-cols-2">
        <section className="flex flex-col gap-3 rounded-lg border border-hairline p-6">
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
          </div>
          <NetWorthTimelineChart
            homeCurrency={homeCurrency}
            recorded={timeline}
            projected={projected}
            payoffMarkers={chartPayoffMarkers}
            targetAmount={targetAmount}
          />
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-hairline p-6">
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Target Allocation
          </h2>
          {distribution.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Add a Holding to see your distribution.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {distribution.map((row) => (
                <DistributionBar key={row.assetClassId} row={row} homeCurrency={homeCurrency} />
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="flex flex-col gap-3 rounded-lg border border-hairline p-6">
        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Needs an update</h2>
        <StalenessList items={staleItems} />
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => onStartCheckIn("all")}
            className="rounded-md border border-hairline px-3 py-1.5 text-sm font-medium"
          >
            Start Check-in
          </button>
          <button
            type="button"
            onClick={() => onStartCheckIn("stale")}
            disabled={staleItems.length === 0}
            className="rounded-md border border-hairline px-3 py-1.5 text-sm text-zinc-500 disabled:opacity-50 dark:text-zinc-400"
          >
            Check in on what&rsquo;s stale
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-6 rounded-lg border border-hairline p-6">
        <div>
          <h2 className="text-lg font-medium">Your Portfolio</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Select an Asset Class or Liabilities on the left to browse, or add one to get started.
          </p>
        </div>
        <HomeCurrencyPicker currentCurrency={homeCurrency} />
      </section>

      <SignOutButton />
    </div>
  );
}
