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
import {
  computeTargetGap,
  formatTargetAmountLabel,
  formatTargetDateLabel,
  passedTargetMessage,
} from "@/lib/projection/target-gap";
import { computeRequiredContribution, formatRequiredContributionLabel } from "@/lib/projection/required-contribution";
import type { ProjectionAssumptions } from "@/components/portfolio/types";

// UI starting values for a User who has never saved the form — there is no
// database default for growth rate or horizon (docs/SPEC.md's schema section
// only mandates one for escalation and inflation), so these exist only to
// seed a first-time edit rather than to mean anything before Save.
const STARTING_ASSUMPTIONS: ProjectionAssumptions = {
  growth_rate: 0.07,
  monthly_contribution: 0,
  contribution_escalation_rate: 0,
  horizon_years: 20,
  inflation_rate: 0.03,
  target_amount: null,
  target_date: null,
};

type Drafts = {
  growthPercent: string;
  monthlyContribution: string;
  escalationPercent: string;
  horizonYears: string;
  inflationPercent: string;
  targetAmount: string;
  targetDate: string;
};

function toDrafts(assumptions: ProjectionAssumptions): Drafts {
  return {
    growthPercent: String(assumptions.growth_rate * 100),
    monthlyContribution: String(assumptions.monthly_contribution),
    escalationPercent: String(assumptions.contribution_escalation_rate * 100),
    horizonYears: String(assumptions.horizon_years),
    inflationPercent: String(assumptions.inflation_rate * 100),
    targetAmount: assumptions.target_amount === null ? "" : String(assumptions.target_amount),
    targetDate: assumptions.target_date ?? "",
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

/** `target_amount`/`target_date` are nullable *together* (ticket 13) — both
 * blank means no Target, both filled means one is being set. Mid-edit (only
 * one filled) has no valid `ProjectionAssumptions` reading, so this falls
 * back to `null` the same way `safeNumber` falls back for a blank rate
 * field, leaving `hasInvalidInput` to catch and block Save on it. */
function draftsToTarget(drafts: Drafts): Pick<ProjectionAssumptions, "target_amount" | "target_date"> {
  const amount = drafts.targetAmount.trim() === "" ? null : Number(drafts.targetAmount);
  const date = drafts.targetDate.trim() === "" ? null : drafts.targetDate;
  if (amount === null || date === null || !Number.isFinite(amount)) {
    return { target_amount: null, target_date: null };
  }
  return { target_amount: amount, target_date: date };
}

function draftsToAssumptions(drafts: Drafts): ProjectionAssumptions {
  return {
    growth_rate: safeNumber(drafts.growthPercent, 0) / 100,
    monthly_contribution: safeNumber(drafts.monthlyContribution, 0),
    contribution_escalation_rate: safeNumber(drafts.escalationPercent, 0) / 100,
    horizon_years: Math.max(0, Math.trunc(safeNumber(drafts.horizonYears, 0))),
    inflation_rate: safeNumber(drafts.inflationPercent, 0) / 100,
    ...draftsToTarget(drafts),
  };
}

/** Whether exactly one of `targetAmount`/`targetDate` is filled — the one
 * shape `draftsToTarget` can't represent as a valid Target (ticket 13:
 * "nullable together"), so Save must be blocked on it explicitly rather
 * than silently dropping the half the User did fill in. */
function hasPartialTarget(drafts: Drafts): boolean {
  const amountFilled = drafts.targetAmount.trim() !== "";
  const dateFilled = drafts.targetDate.trim() !== "";
  return amountFilled !== dateFilled;
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
    Number(drafts.horizonYears) < 0 ||
    !Number.isFinite(Number(drafts.inflationPercent)) ||
    hasPartialTarget(drafts) ||
    (drafts.targetAmount.trim() !== "" && !Number.isFinite(Number(drafts.targetAmount)))
  );
}

function assumptionsEqual(a: ProjectionAssumptions, b: ProjectionAssumptions): boolean {
  return (
    a.growth_rate === b.growth_rate &&
    a.monthly_contribution === b.monthly_contribution &&
    a.contribution_escalation_rate === b.contribution_escalation_rate &&
    a.horizon_years === b.horizon_years &&
    a.inflation_rate === b.inflation_rate &&
    a.target_amount === b.target_amount &&
    a.target_date === b.target_date
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
  hasHoldings,
  holdingsTotal,
  liabilities,
  liabilityNames,
  recordedTimeline,
  assumptions,
  onSave,
}: {
  today: string;
  homeCurrency: string;
  hasHoldings: boolean;
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

  // The gap (user stories 87-89) reads off the live draft, same as the chart
  // above it — an edited target, growth rate or contribution should move
  // both together rather than one lagging a Save behind the other.
  const targetGap = useMemo(() => {
    if (liveAssumptions.target_amount === null || liveAssumptions.target_date === null) return null;
    return computeTargetGap({
      today,
      holdingsTotal,
      liabilities,
      assumptions: liveAssumptions,
      targetAmount: liveAssumptions.target_amount,
      targetDate: liveAssumptions.target_date,
    });
  }, [today, holdingsTotal, liabilities, liveAssumptions]);

  // The Required Contribution (user stories 91-95): reuses `targetGap`
  // rather than resolving the achievable date itself, so the figure and the
  // date beside it can never disagree. Recomputed off the same live draft
  // as the gap and chart above it.
  const requiredContribution = useMemo(() => {
    if (liveAssumptions.target_amount === null || liveAssumptions.target_date === null) return null;
    return computeRequiredContribution({
      today,
      holdingsTotal,
      liabilities,
      assumptions: liveAssumptions,
      targetAmount: liveAssumptions.target_amount,
      targetDate: liveAssumptions.target_date,
    });
  }, [today, holdingsTotal, liabilities, liveAssumptions]);

  // The passed-target-date prompt below (user story 90) reads the *saved*
  // Target, not an in-progress draft — this is about the server-recorded
  // plan going stale on its own, not something an unsaved edit should
  // trigger or dismiss. `projected[0]` is today's own actual totals restated
  // as the projection's first point (see NetWorthTimelineChart's own comment
  // on that point), so it's current Net Worth without re-summing liabilities
  // by hand.
  const passedTarget = passedTargetMessage({
    today,
    targetAmount: savedAssumptions.target_amount,
    targetDate: savedAssumptions.target_date,
    currentNetWorth: projected[0].netWorth,
    homeCurrency,
  });

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

  // User story 118: with neither a Holding nor a Liability, there is
  // nothing at all to run a Projection on — the chart above would just be a
  // flat line at 0, which isn't a projection, it's a Portfolio waiting for
  // its first Holding, so this explains that instead of charting it. Checked
  // together, not `!hasHoldings` alone: a Liability entered before any
  // Holding (a mortgage on a house not yet recorded) still has a real payoff
  // trajectory to project, and hiding it here would be the same mistake
  // DashboardPanel avoids for the same reason (user story 117: a real result
  // isn't an empty state). Mirrors TargetAllocationEditor's own
  // no-Asset-Classes-yet early return.
  if (!hasHoldings && liabilities.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Add a Holding and record its Valuation to start projecting your Net Worth forward.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* User story 90: a stale target quietly poisons every later
          projection view, so it's surfaced here rather than silently
          auto-archived. Reads the saved Target, not the live draft. */}
      {passedTarget && <p className="text-sm font-medium">{passedTarget}</p>}

      <NetWorthTimelineChart
        homeCurrency={homeCurrency}
        recorded={recordedTimeline}
        projected={projected}
        payoffMarkers={payoffMarkers}
        targetAmount={liveAssumptions.target_amount}
      />

      {/* The gap (user stories 88-89): a date first, the money figure
          beneath it. */}
      {targetGap && (
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium">{formatTargetDateLabel(targetGap)}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {formatTargetAmountLabel(targetGap, homeCurrency)}
          </p>
        </div>
      )}

      {/* Required Contribution (user stories 91-95): what this month's
          decision actually turns on, always paired with the achievable date
          above rather than shown as a bare figure. */}
      {targetGap && requiredContribution && (
        <p className="text-sm font-medium">
          {formatRequiredContributionLabel(requiredContribution, targetGap, homeCurrency)}
        </p>
      )}

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

          <label className="flex flex-col gap-1 text-sm">
            Expected inflation
            <div className="flex items-center gap-1">
              <input
                type="number"
                inputMode="decimal"
                step="any"
                value={drafts.inflationPercent}
                onChange={(e) => updateDraft("inflationPercent", e.target.value)}
                className="w-full rounded-md border border-hairline bg-transparent px-2 py-1.5 text-sm"
              />
              %
            </div>
          </label>
        </div>

        {/* Target Net Worth (ticket 13, user stories 85-86): amount and
            date entered together as one term, never a bare figure. */}
        <label className="flex flex-col gap-1 text-sm">
          Target Net Worth
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              inputMode="decimal"
              step="any"
              min={0}
              placeholder="Amount"
              value={drafts.targetAmount}
              onChange={(e) => updateDraft("targetAmount", e.target.value)}
              className="w-40 rounded-md border border-hairline bg-transparent px-2 py-1.5 text-sm"
            />
            <span className="text-zinc-500 dark:text-zinc-400">by</span>
            <input
              type="date"
              value={drafts.targetDate}
              onChange={(e) => updateDraft("targetDate", e.target.value)}
              className="rounded-md border border-hairline bg-transparent px-2 py-1.5 text-sm"
            />
          </div>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Stated in today&apos;s money — leave both blank to clear it.
          </span>
        </label>

        {/* User story 84: the real line is primary, with no toggle back to
            nominal — disclosed here rather than left for the chart to
            explain on its own. */}
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          The chart&apos;s solid figures are in today&apos;s money, deflated by this rate; the fainter
          line is the plain number a future statement would show.
        </p>

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
