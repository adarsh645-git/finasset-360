import { formatMoney } from "@/lib/currency/format";
import type { NetWorthSummary } from "@/lib/net-worth/compute";

// Persistent Net Worth readout in the top strip (user story 50) — rendered
// above the Miller columns in PortfolioShell so it stays visible no matter
// how deep the User has navigated, since Miller columns scroll column 1 out
// of view in a way a sidebar never would. `sticky` below 900px specifically
// (ticket 15): the narrow accordion is one long page that scrolls as a
// whole, unlike the Miller shell where only individual columns scroll — a
// plain `top-0` position has no effect above 900px, where nothing ever
// scrolls past this strip.
export function NetWorthStrip({
  homeCurrency,
  netWorth,
  userName,
}: {
  homeCurrency: string;
  netWorth: NetWorthSummary;
  userName: string;
}) {
  return (
    <div className="sticky top-0 z-10 flex items-baseline justify-between border-b border-hairline bg-background px-4 py-2">
      <span className="text-sm font-semibold tracking-tight">
        {/* Nothing recorded yet reads as exactly that, never as a computed
           $0.00 (user story 117) — the same `asOfDate` null check
           NetWorthHero makes for its own copy of this figure. */}
        {netWorth.asOfDate === null ? "Nothing recorded yet" : formatMoney(netWorth.netWorth, homeCurrency)}
      </span>
      <span className="text-sm font-semibold tracking-tight">{userName}</span>
    </div>
  );
}
