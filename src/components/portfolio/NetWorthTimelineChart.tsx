import { formatMoney } from "@/lib/currency/format";
import type { NetWorthTimelinePoint } from "@/lib/net-worth/timeline";
import { Sparkline } from "./Sparkline";

// The recorded Net Worth timeline on the dashboard (user story 55), built
// from Valuation History — every recorded point, including the periods an
// since-archived Holding or Liability contributed to (ticket 06).
export function NetWorthTimelineChart({
  homeCurrency,
  timeline,
}: {
  homeCurrency: string;
  timeline: NetWorthTimelinePoint[];
}) {
  if (timeline.length < 2) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Record a Valuation on a second day to start seeing a trend here.
      </p>
    );
  }

  const first = timeline[0];
  const last = timeline[timeline.length - 1];

  return (
    <div className="flex flex-col gap-2">
      <div className="text-accent">
        <Sparkline values={timeline.map((point) => point.netWorth)} width={320} height={64} />
      </div>
      <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <span>
          {first.date} · {formatMoney(first.netWorth, homeCurrency)}
        </span>
        <span>
          {last.date} · {formatMoney(last.netWorth, homeCurrency)}
        </span>
      </div>
    </div>
  );
}
