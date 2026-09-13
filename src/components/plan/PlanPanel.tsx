import type { NetWorthTimelinePoint } from "@/lib/net-worth/timeline";
import type { ProjectionLiabilityInput } from "@/lib/projection/engine";
import type { AssetClassDistributionRow } from "@/lib/target-allocation/distribution";
import type { ProjectionAssumptions } from "@/components/portfolio/types";
import { ProjectionSection } from "./ProjectionSection";
import { TargetAllocationEditor } from "./TargetAllocationEditor";

// The Plan page (docs/SPEC.md's second breadcrumb root) — ticket 09 built
// the Target Allocation editor; ticket 10 adds the Projection assumptions
// and its recorded-plus-projected timeline (user stories 114-115). Target
// Net Worth (ticket 13) is a later section still to land here.
export function PlanPanel({
  rows,
  onSaveTargets,
  today,
  homeCurrency,
  holdingsTotal,
  liabilities,
  liabilityNames,
  recordedTimeline,
  projectionAssumptions,
  onSaveProjection,
}: {
  rows: AssetClassDistributionRow[];
  onSaveTargets: (
    allocations: Array<{ asset_class_id: string; target_percent: number }>,
  ) => Promise<string | null>;
  today: string;
  homeCurrency: string;
  holdingsTotal: number;
  liabilities: ProjectionLiabilityInput[];
  liabilityNames: Map<string, string>;
  recordedTimeline: NetWorthTimelinePoint[];
  projectionAssumptions: ProjectionAssumptions | null;
  onSaveProjection: (assumptions: ProjectionAssumptions) => Promise<string | null>;
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

      <section className="flex flex-col gap-3 rounded-lg border border-hairline p-6">
        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Projection</h2>
        <ProjectionSection
          today={today}
          homeCurrency={homeCurrency}
          holdingsTotal={holdingsTotal}
          liabilities={liabilities}
          liabilityNames={liabilityNames}
          recordedTimeline={recordedTimeline}
          assumptions={projectionAssumptions}
          onSave={onSaveProjection}
        />
      </section>
    </div>
  );
}
