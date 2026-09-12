"use client";

import { useState } from "react";
import type { AssetClassDistributionRow } from "@/lib/target-allocation/distribution";

const TOTAL_TOLERANCE = 0.05;

// Percent per Asset Class, actual shown beside it, with a running total
// (docs/SPEC.md, user stories 112–113) — the whole set is edited together
// and saved as one batch, mirroring HoldingDetailPanel's dirty-tracked
// single-Save form, since there's no meaningful way to save one row's
// target without the others.
export function TargetAllocationEditor({
  rows,
  onSave,
}: {
  rows: AssetClassDistributionRow[];
  onSave: (allocations: Array<{ asset_class_id: string; target_percent: number }>) => Promise<string | null>;
}) {
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((row) => [row.assetClassId, String(row.targetPercent)])),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function parsedDraft(assetClassId: string): number {
    return Number(drafts[assetClassId]);
  }

  const hasInvalidInput = rows.some((row) => {
    const value = parsedDraft(row.assetClassId);
    return !Number.isFinite(value) || value < 0;
  });

  // Compared as numbers, not strings — after a save, the row prop comes
  // back from the server as a number (e.g. 10), which wouldn't string-equal
  // a draft the User typed as "10.0", leaving Save wrongly enabled forever.
  const isDirty = rows.some((row) => parsedDraft(row.assetClassId) !== row.targetPercent);

  const runningTotal = rows.reduce((sum, row) => {
    const value = parsedDraft(row.assetClassId);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);
  const roundedTotal = Math.round(runningTotal * 10) / 10;
  const isOffTarget = Math.abs(roundedTotal - 100) > TOTAL_TOLERANCE;

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (hasInvalidInput) return;
    setIsSaving(true);
    setError(null);
    const allocations = rows.map((row) => ({
      asset_class_id: row.assetClassId,
      target_percent: parsedDraft(row.assetClassId),
    }));
    const failure = await onSave(allocations);
    setIsSaving(false);
    if (failure) setError(failure);
  }

  if (rows.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Add an Asset Class first.</p>;
  }

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4">
      <div className="flex flex-col divide-y divide-hairline">
        {rows.map((row) => (
          <div key={row.assetClassId} className="flex items-center justify-between gap-4 py-2">
            <span className="flex-1 truncate text-sm">{row.assetClassName}</span>
            <span className="w-20 shrink-0 text-right text-xs text-zinc-500 dark:text-zinc-400">
              {row.actualPercent.toFixed(1)}% actual
            </span>
            <label className="flex shrink-0 items-center gap-1 text-sm">
              <input
                type="number"
                inputMode="decimal"
                step="any"
                min={0}
                value={drafts[row.assetClassId] ?? ""}
                onChange={(e) =>
                  setDrafts((prev) => ({ ...prev, [row.assetClassId]: e.target.value }))
                }
                className="w-16 rounded-md border border-hairline bg-transparent px-2 py-1 text-right text-sm"
              />
              %
            </label>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-hairline pt-3 text-sm font-medium">
        <span>Total</span>
        {/* Doesn't sum to 100 is shown plainly, not silently normalised
           away (user story 113) — and, per this app's visual system, never
           in red: the number and the word "short"/"over" carry the meaning
           on their own. */}
        <span>
          {roundedTotal.toFixed(1)}%
          {isOffTarget ? (roundedTotal < 100 ? " — short of 100%" : " — over 100%") : ""}
        </span>
      </div>

      {error && <p className="text-sm font-medium">{error}</p>}

      <button
        type="submit"
        disabled={isSaving || !isDirty || hasInvalidInput}
        className="w-fit rounded-md border border-hairline px-3 py-1.5 text-sm disabled:opacity-60"
      >
        {isSaving ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
