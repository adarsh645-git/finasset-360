import { formatMoney } from "@/lib/currency/format";
import type { NetWorthSummary } from "@/lib/net-worth/compute";

// Persistent Net Worth readout in the top strip (user story 50) — rendered
// above the Miller columns in PortfolioShell so it stays visible no matter
// how deep the User has navigated, since Miller columns scroll column 1 out
// of view in a way a sidebar never would.
export function NetWorthStrip({
  homeCurrency,
  netWorth,
}: {
  homeCurrency: string;
  netWorth: NetWorthSummary;
}) {
  return (
    <div className="flex items-baseline justify-between border-b border-hairline px-4 py-2">
      <span className="text-sm font-semibold tracking-tight">
        {formatMoney(netWorth.netWorth, homeCurrency)}
      </span>
      <span className="text-xs text-zinc-500 dark:text-zinc-400">
        {netWorth.asOfDate ? `as of ${netWorth.asOfDate}` : "No Valuations recorded yet"}
      </span>
    </div>
  );
}
