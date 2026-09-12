import type { AssetClassDistributionRow } from "@/lib/target-allocation/distribution";
import { TargetAllocationEditor } from "./TargetAllocationEditor";

// The Plan page (docs/SPEC.md's second breadcrumb root) — ticket 09 builds
// only the Target Allocation editor; Projection assumptions, Target Net
// Worth, and the recorded-plus-projected timeline are later tickets (10,
// 13) that add further sections to this same page.
export function PlanPanel({
  rows,
  onSaveTargets,
}: {
  rows: AssetClassDistributionRow[];
  onSaveTargets: (
    allocations: Array<{ asset_class_id: string; target_percent: number }>,
  ) => Promise<string | null>;
}) {
  return (
    <div className="flex flex-1 flex-col gap-8 overflow-y-auto px-8 py-8">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">Plan</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Set a goal percent per Asset Class and see it against your actual distribution.
        </p>
      </header>

      <section className="flex flex-col gap-3 rounded-lg border border-hairline p-6">
        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Target Allocation</h2>
        <TargetAllocationEditor rows={rows} onSave={onSaveTargets} />
      </section>
    </div>
  );
}
