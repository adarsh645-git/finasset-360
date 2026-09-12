import { HomeCurrencyPicker } from "@/components/HomeCurrencyPicker";
import { SignOutButton } from "@/components/SignOutButton";
import { formatMoney } from "@/lib/currency/format";
import type { NetWorthSummary } from "@/lib/net-worth/compute";
import type { NetWorthTimelinePoint } from "@/lib/net-worth/timeline";
import { NetWorthTimelineChart } from "./NetWorthTimelineChart";
import { StalenessList, type StaleItem } from "./StalenessList";

// Shown in the rightmost column when nothing is selected (user story 98) —
// the ticket 01 dashboard content, the Net Worth headline with its
// component breakdown and as-of date (user stories 48–49), the recorded Net
// Worth timeline (user story 55), and the staleness list (user story 31).
export function DashboardPanel({
  userEmail,
  homeCurrency,
  netWorth,
  timeline,
  staleItems,
}: {
  userEmail: string;
  homeCurrency: string;
  netWorth: NetWorthSummary;
  timeline: NetWorthTimelinePoint[];
  staleItems: StaleItem[];
}) {
  return (
    <div className="flex flex-1 flex-col gap-8 overflow-y-auto px-8 py-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">FinAsset 360</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{userEmail}</p>
      </header>

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
