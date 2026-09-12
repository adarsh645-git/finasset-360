import { formatMoney } from "@/lib/currency/format";
import type { AssetClassDistributionRow } from "@/lib/target-allocation/distribution";

// One row of the dashboard's distribution chart (docs/SPEC.md, user stories
// 52–54): actual allocation as a filled horizontal bar, Target Allocation
// as a tick on that same track, and the gap restated in home-currency money
// — the actionable figure, not just the percent. Deliberately a bar with a
// tick rather than a pie/donut/treemap: none of those can draw a target,
// all need a legend, and all ask the reader to compare angles instead of
// reading two points on one line (ticket 09's brief).
export function DistributionBar({
  row,
  homeCurrency,
}: {
  row: AssetClassDistributionRow;
  homeCurrency: string;
}) {
  const actualFill = Math.min(100, Math.max(0, row.actualPercent));
  // Inset from both edges and centered (via -translate-x-1/2 below) rather
  // than clamped flush to 0/100 — a target entered over 100% (allowed;
  // "not silently normalised") would otherwise pin the tick to the track's
  // own right edge, where it can sit invisibly inside a similarly-high
  // actual fill. That's the same failure ticket 09 already warns about for
  // a squeezed track, just reached through an extreme value instead.
  const targetTick = Math.min(99, Math.max(1, row.targetPercent));
  const gapLabel =
    Math.abs(row.gapAmount) < 0.005
      ? "on target"
      : row.gapAmount > 0
        ? `${formatMoney(row.gapAmount, homeCurrency)} to reach target`
        : `${formatMoney(-row.gapAmount, homeCurrency)} over target`;

  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 truncate text-sm" title={row.assetClassName}>
        {row.assetClassName}
      </span>
      {/* min-w keeps the target tick visible even when the label and money
         columns are wide — this regressed once in prototyping and defeated
         the chart's purpose (ticket 09's checklist), so the track must
         never be squeezed toward zero width by its flex siblings. Neutral
         zinc tones throughout: the app's one accent colour is reserved for
         selection (globals.css), not for this chart. */}
      <div className="relative h-2.5 min-w-[96px] flex-1 rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div
          className="h-full rounded-full bg-zinc-500 dark:bg-zinc-400"
          style={{ width: `${actualFill}%` }}
        />
        <div
          className="absolute top-1/2 h-4 w-px -translate-x-1/2 -translate-y-1/2 bg-foreground"
          style={{ left: `${targetTick}%` }}
          aria-hidden="true"
        />
      </div>
      <span className="w-12 shrink-0 text-right text-xs text-zinc-500 dark:text-zinc-400">
        {row.actualPercent.toFixed(0)}%
      </span>
      <span className="w-36 shrink-0 text-right text-xs text-zinc-500 dark:text-zinc-400">
        {gapLabel}
      </span>
    </div>
  );
}
