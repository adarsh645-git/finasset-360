"use client";

import { useMemo, useState } from "react";
import { NetWorthTimelineChart } from "@/components/portfolio/NetWorthTimelineChart";
import type { NetWorthTimelinePoint } from "@/lib/net-worth/timeline";
import {
  projectNetWorth,
  projectPayoffMarkers,
  type ProjectedNetWorthPoint,
  type ProjectionLiabilityInput,
} from "@/lib/projection/engine";
import { toChartPayoffMarkers } from "@/lib/projection/payoff-marker-label";
import type { ProjectionAssumptions } from "@/components/portfolio/types";

// UI starting values for a User who has never saved the form — there is no
// database default for growth rate or horizon (docs/SPEC.md's schema
// section only mandates one for the escalation rate), so these exist only
// to seed a first-time edit rather than to mean anything before Save.
const STARTING_ASSUMPTIONS: ProjectionAssumptions = {
  growth_rate: 0.07,
  monthly_contribution: 0,
  contribution_escalation_rate: 0,
  horizon_years: 20,
};

type Drafts = {
  growthPercent: string;
  monthlyContribution: string;
  escalationPercent: string;
  horizonYears: string;
};

function toDrafts(assumptions: ProjectionAssumptions): Drafts {
  return {
    growthPercent: String(assumptions.growth_rate * 100),
    monthlyContribution: String(assumptions.monthly_contribution),
    escalationPercent: String(assumptions.contribution_escalation_rate * 100),
    horizonYears: String(assumptions.horizon_years),
  };
}

/** A finite parse of `value`, or `fallback` — used so a field mid-edit (or
 * briefly empty) degrades the live projection to a safe placeholder value
 * rather than propagating `NaN` into the chart and blanking the whole pane
 * (user story 79: "recomputed live... without blanking the pane"). */
function safeNumber(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function draftsToAssumptions(drafts: Drafts): ProjectionAssumptions {
  return {
    growth_rate: safeNumber(drafts.growthPercent, 0) / 100,
    monthly_contribution: safeNumber(drafts.monthlyContribution, 0),
    contribution_escalation_rate: safeNumber(drafts.escalationPercent, 0) / 100,
    horizon_years: Math.max(0, Math.trunc(safeNumber(drafts.horizonYears, 0))),
  };
}

/** Every field parses to a value the API will accept — used only to gate
 * Save; the live chart above already tolerates a mid-edit field via
 * `safeNumber`. */
function hasInvalidInput(drafts: Drafts): boolean {
  return (
    !Number.isFinite(Number(drafts.growthPercent)) ||
    !Number.isFinite(Number(drafts.monthlyContribution)) ||
    !Number.isFinite(Number(drafts.escalationPercent)) ||
    !Number.isInteger(Number(drafts.horizonYears)) ||
    Number(drafts.horizonYears) < 0
  );
}

function assumptionsEqual(a: ProjectionAssumptions, b: ProjectionAssumptions): boolean {
  return (
    a.growth_rate === b.growth_rate &&
    a.monthly_contribution === b.monthly_contribution &&
    a.contribution_escalation_rate === b.contribution_escalation_rate &&
    a.horizon_years === b.horizon_years
  );
}

// The Projection assumptions block and its recorded-plus-projected timeline
// (user stories 67-73, 77-79, 114-115), living together in one component so
// an edited-but-unsaved draft can drive the chart immediately — the chart is
// exactly PortfolioShell's dashboard one, fed the live draft instead of the
// last-saved assumptions.
export function ProjectionSection({
  today,
  homeCurrency,
  holdingsTotal,
  liabilities,
  liabilityNames,
  recordedTimeline,
  assumptions,
  onSave,
}: {
  today: string;
  homeCurrency: string;
  holdingsTotal: number;
  liabilities: ProjectionLiabilityInput[];
  liabilityNames: Map<string, string>;
  recordedTimeline: NetWorthTimelinePoint[];
  assumptions: ProjectionAssumptions | null;
  onSave: (assumptions: ProjectionAssumptions) => Promise<string | null>;
}) {
  const savedAssumptions = assumptions ?? STARTING_ASSUMPTIONS;
  const [drafts, setDrafts] = useState<Drafts>(() => toDrafts(savedAssumptions));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const liveAssumptions = useMemo(() => draftsToAssumptions(drafts), [drafts]);
  const projected: ProjectedNetWorthPoint[] = useMemo(
    () => projectNetWorth({ today, holdingsTotal, liabilities, assumptions: liveAssumptions }),
    [today, holdingsTotal, liabilities, liveAssumptions],
  );
  // Recomputed off the live draft too (user story 79: "recomputed live as I
  // edit an assumption") — an edited horizon or contribution can move a
  // payoff in or out of view just as much as it moves the line itself.
  const payoffMarkers = useMemo(
    () =>
      toChartPayoffMarkers(
        projectPayoffMarkers({ liabilities, today, horizonYears: liveAssumptions.horizon_years }),
        liabilityNames,
        homeCurrency,
      ),
    [liabilities, today, liveAssumptions.horizon_years, liabilityNames, homeCurrency],
  );

  const isDirty = !assumptionsEqual(liveAssumptions, savedAssumptions) || assumptions === null;
  const isInvalid = hasInvalidInput(drafts);

  function updateDraft(field: keyof Drafts, value: string) {
    setDrafts((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (isInvalid) return;
    setIsSaving(true);
    setError(null);
    const failure = await onSave(liveAssumptions);
    setIsSaving(false);
    if (failure) setError(failure);
  }

  return (
    <div className="flex flex-col gap-4">
      <NetWorthTimelineChart
        homeCurrency={homeCurrency}
        recorded={recordedTimeline}
        projected={projected}
        payoffMarkers={payoffMarkers}
      />

      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Annual growth rate
            <div className="flex items-center gap-1">
              <input
                type="number"
                inputMode="decimal"
                step="any"
                value={drafts.growthPercent}
                onChange={(e) => updateDraft("growthPercent", e.target.value)}
                className="w-full rounded-md border border-hairline bg-transparent px-2 py-1.5 text-sm"
              />
              %
            </div>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Horizon
            <div className="flex items-center gap-1">
              <input
                type="number"
                inputMode="numeric"
                step={1}
                min={0}
                value={drafts.horizonYears}
                onChange={(e) => updateDraft("horizonYears", e.target.value)}
                className="w-full rounded-md border border-hairline bg-transparent px-2 py-1.5 text-sm"
              />
              years
            </div>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Monthly contribution
            <input
              type="number"
              inputMode="decimal"
              step="any"
              value={drafts.monthlyContribution}
              onChange={(e) => updateDraft("monthlyContribution", e.target.value)}
              className="rounded-md border border-hairline bg-transparent px-2 py-1.5 text-sm"
            />
            {/* User story 69 — the single largest thing people forget. */}
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Include any employer match — it&apos;s easy to forget and it adds up.
            </span>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Annual contribution escalation
            <div className="flex items-center gap-1">
              <input
                type="number"
                inputMode="decimal"
                step="any"
                value={drafts.escalationPercent}
                onChange={(e) => updateDraft("escalationPercent", e.target.value)}
                className="w-full rounded-md border border-hairline bg-transparent px-2 py-1.5 text-sm"
              />
              %
            </div>
          </label>
        </div>

        {/* User story 77: the freed-payment redirect is always on, with no
            toggle, so it's disclosed here rather than left implicit. */}
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          When an amortizing Liability pays off, its payment (minus any escrow) is automatically added
          to your monthly contribution from that point on — there&apos;s no setting to turn this off.
        </p>

        {error && <p className="text-sm font-medium">{error}</p>}

        <button
          type="submit"
          disabled={isSaving || !isDirty || isInvalid}
          className="w-fit rounded-md border border-hairline px-3 py-1.5 text-sm disabled:opacity-60"
        >
          {isSaving ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}
