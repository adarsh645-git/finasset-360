import { HomeCurrencyPicker } from "@/components/HomeCurrencyPicker";
import { SignOutButton } from "@/components/SignOutButton";
import { DistributionBar } from "@/components/plan/DistributionBar";
import { formatMoney } from "@/lib/currency/format";
import type { NetWorthSummary } from "@/lib/net-worth/compute";
import type { NetWorthTimelinePoint } from "@/lib/net-worth/timeline";
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
// two-column grid, with staleness stacking full-width below both (ticket
// 09's checklist). The spec's own layout note also stacks "Start Check-in"
// into that same below-the-grid row — that's ticket 08's button, not yet
// built as of this ticket, so it isn't rendered here; whichever of the two
// tickets lands second should slot it into this section rather than
// restructure the grid.
export function DashboardPanel({
  homeCurrency,
  netWorth,
  timeline,
  staleItems,
  distribution,
}: {
  homeCurrency: string;
  netWorth: NetWorthSummary;
  timeline: NetWorthTimelinePoint[];
  staleItems: StaleItem[];
  distribution: AssetClassDistributionRow[];
}) {
  return (
    <div className="flex flex-1 flex-col gap-8 overflow-y-auto px-8 py-8">
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
          <NetWorthTimelineChart homeCurrency={homeCurrency} timeline={timeline} />
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
