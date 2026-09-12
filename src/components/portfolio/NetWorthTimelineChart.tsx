import { formatMoney } from "@/lib/currency/format";
import type { NetWorthTimelinePoint } from "@/lib/net-worth/timeline";
import type { ProjectedNetWorthPoint } from "@/lib/projection/engine";

const WIDTH = 320;
const HEIGHT = 64;

// The recorded-plus-projected Net Worth timeline (user story 55, extended by
// ticket 10's user stories 73, 77, 115): recorded history as a solid line,
// the projection continuing from it as a dashed one, meeting at a "Today"
// seam. `projected[0]` — always today's own actual totals, restated with
// today's date (see PortfolioShell) — *is* that seam, so the two lines are
// drawn to share that one point rather than needing a separate marker
// reconciled against it.
export function NetWorthTimelineChart({
  homeCurrency,
  recorded,
  projected,
}: {
  homeCurrency: string;
  recorded: NetWorthTimelinePoint[];
  projected: ProjectedNetWorthPoint[];
}) {
  const recordedValues = recorded.map((point) => point.netWorth);
  const projectedValues = projected.map((point) => point.netWorth);
  const allValues = [...recordedValues, ...projectedValues];

  if (allValues.length < 2) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Record a Valuation on a second day to start seeing a trend here.
      </p>
    );
  }

  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min;

  // One shared index space: recorded points occupy 0..R-1, and the
  // projection continues from the same index its first point (today)
  // shares with the last recorded one — index-based spacing, same
  // simplification Sparkline already makes, rather than a true date scale.
  const anchorIndex = Math.max(recordedValues.length - 1, 0);
  const totalPoints = anchorIndex + Math.max(projectedValues.length - 1, 0);

  function x(index: number): number {
    return totalPoints === 0 ? WIDTH / 2 : (index / totalPoints) * WIDTH;
  }
  function y(value: number): number {
    return range === 0 ? HEIGHT / 2 : HEIGHT - ((value - min) / range) * HEIGHT;
  }

  const recordedPoints = recordedValues.map((value, i) => `${x(i)},${y(value)}`).join(" ");
  const projectedPoints = projectedValues
    .map((value, i) => `${x(anchorIndex + i)},${y(value)}`)
    .join(" ");
  const todayX = x(anchorIndex);

  const first = recorded[0] ?? projected[0];
  const lastLabel = projected[projected.length - 1] ?? recorded[recorded.length - 1];

  return (
    <div className="flex flex-col gap-2">
      <div className="text-accent">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          width={WIDTH}
          height={HEIGHT}
          fill="none"
          aria-hidden="true"
        >
          {recordedValues.length > 1 && (
            <polyline
              points={recordedPoints}
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {projectedValues.length > 1 && (
            <polyline
              points={projectedPoints}
              stroke="currentColor"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.7}
            />
          )}
          {projectedValues.length > 0 && (
            <line
              x1={todayX}
              y1={0}
              x2={todayX}
              y2={HEIGHT}
              stroke="currentColor"
              strokeWidth={1}
              opacity={0.3}
            />
          )}
        </svg>
      </div>
      <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <span>
          {first.date} · {formatMoney(first.netWorth, homeCurrency)}
        </span>
        {projectedValues.length > 0 && <span>Today</span>}
        <span>
          {lastLabel.date} · {formatMoney(lastLabel.netWorth, homeCurrency)}
        </span>
      </div>
    </div>
  );
}
