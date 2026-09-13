import { formatMoney } from "@/lib/currency/format";
import type { NetWorthTimelinePoint } from "@/lib/net-worth/timeline";
import type { ProjectedNetWorthPoint } from "@/lib/projection/engine";

const WIDTH = 320;
const HEIGHT = 64;

// The recorded-plus-projected Net Worth timeline (user story 55, extended by
// ticket 10's user stories 73, 77, 115, and ticket 12's 82-84): recorded
// history as a solid line, the projection continuing from it as two dashed
// ones — real (primary) and nominal (fainter reference) — meeting recorded
// history at a "Today" seam where the two coincide (deflator 1) before
// forking apart. `projected[0]` — always today's own actual totals, restated
// with today's date (see PortfolioShell) — *is* that seam, so the lines are
// drawn to share that one point rather than needing a separate marker
// reconciled against it.
export type ChartPayoffMarker = {
  /** Months from `projected[0]` (today) to the redirect boundary — the same
   * `ceil(payoff_months)` `projectPayoffMarkers` reports. */
  monthsFromToday: number;
  label: string;
};

export function NetWorthTimelineChart({
  homeCurrency,
  recorded,
  projected,
  payoffMarkers = [],
}: {
  homeCurrency: string;
  recorded: NetWorthTimelinePoint[];
  projected: ProjectedNetWorthPoint[];
  // One payoff marker per amortizing Liability inside the horizon (user
  // story 76) — a tick on the line plus its own label below, since this
  // 320×64 chart has no room for inline text without crowding the line
  // it's annotating.
  payoffMarkers?: ChartPayoffMarker[];
}) {
  const recordedValues = recorded.map((point) => point.netWorth);
  // Ticket 12: the projection forks into two lines at today — the real one
  // (deflated, primary) and the nominal one (the plain future-statement
  // number, now the fainter reference). Recorded history has no real/nominal
  // split of its own — it's never deflated (docs/SPEC.md) — so it stays the
  // single line it always was.
  const nominalValues = projected.map((point) => point.netWorth);
  const realValues = projected.map((point) => point.realNetWorth);
  const allValues = [...recordedValues, ...nominalValues, ...realValues];

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
  const totalPoints = anchorIndex + Math.max(nominalValues.length - 1, 0);

  function x(index: number): number {
    return totalPoints === 0 ? WIDTH / 2 : (index / totalPoints) * WIDTH;
  }
  function y(value: number): number {
    return range === 0 ? HEIGHT / 2 : HEIGHT - ((value - min) / range) * HEIGHT;
  }

  const recordedPoints = recordedValues.map((value, i) => `${x(i)},${y(value)}`).join(" ");
  const nominalPoints = nominalValues.map((value, i) => `${x(anchorIndex + i)},${y(value)}`).join(" ");
  const realPoints = realValues.map((value, i) => `${x(anchorIndex + i)},${y(value)}`).join(" ");
  const todayX = x(anchorIndex);

  // A marker's own index is fractional (a payoff rarely lands on a year
  // boundary) — the same `anchorIndex`-relative space as the projected
  // line, just not rounded to a sampled point.
  const visibleMarkers = payoffMarkers
    .map((marker) => ({ ...marker, index: anchorIndex + marker.monthsFromToday / 12 }))
    .filter((marker) => marker.index <= totalPoints);

  const first = recorded[0] ?? projected[0];
  const lastProjected = projected[projected.length - 1];
  const lastLabel = lastProjected ?? recorded[recorded.length - 1];
  // Suppressed at the Today seam (yearIndex 0), where the two coincide and a
  // "(nominal ...)" aside would just repeat the headline figure.
  const lastHasDiverged = lastProjected !== undefined && lastProjected.yearIndex > 0;

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
          {/* Nominal — the fainter reference (user story 84): the plain
              number a future statement would show. */}
          {nominalValues.length > 1 && (
            <polyline
              points={nominalPoints}
              stroke="currentColor"
              strokeWidth={1}
              strokeDasharray="2 2"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.35}
            />
          )}
          {/* Real — the primary line (user story 84): what the projected
              money would actually buy, in today's terms. */}
          {realValues.length > 1 && (
            <polyline
              points={realPoints}
              stroke="currentColor"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.85}
            />
          )}
          {projected.length > 0 && (
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
          {visibleMarkers.map((marker) => (
            <line
              key={marker.label}
              x1={x(marker.index)}
              y1={0}
              x2={x(marker.index)}
              y2={HEIGHT}
              stroke="currentColor"
              strokeWidth={1}
              strokeDasharray="1 2"
              opacity={0.5}
            />
          ))}
        </svg>
      </div>
      <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <span>
          {first.date} · {formatMoney(first.netWorth, homeCurrency)}
        </span>
        {projected.length > 0 && <span>Today</span>}
        <span>
          {lastLabel.date} ·{" "}
          {lastProjected
            ? formatMoney(lastProjected.realNetWorth, homeCurrency)
            : formatMoney(lastLabel.netWorth, homeCurrency)}
          {lastHasDiverged && ` (nominal ${formatMoney(lastProjected.netWorth, homeCurrency)})`}
        </span>
      </div>
      {visibleMarkers.length > 0 && (
        <ul className="flex flex-col gap-0.5 text-xs text-zinc-500 dark:text-zinc-400">
          {visibleMarkers.map((marker) => (
            <li key={marker.label}>{marker.label}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
