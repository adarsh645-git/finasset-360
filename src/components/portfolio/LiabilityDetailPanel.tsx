"use client";

import { useMemo, useState } from "react";
import { CurrencySelect } from "@/components/CurrencySelect";
import { formatMoney } from "@/lib/currency/format";
import { computeAmortizationSchedule, projectLiabilityBalance } from "@/lib/projection/engine";
import { formatNetPositionLabel } from "@/lib/projection/net-position";
import { Sparkline } from "./Sparkline";
import { ValuationEditor } from "./ValuationEditor";
import { ValuationHistoryTable } from "./ValuationHistoryTable";
import type {
  AmortizationAssumptions,
  Holding,
  Liability,
  LiabilityClass,
  LiabilityPatch,
  LiabilityValuation,
  ProjectionAssumptions,
} from "./types";

type AmortizationDrafts = {
  interestRatePercent: string;
  originalLoanAmount: string;
  termMonths: string;
  customMonthlyPayment: string;
  extraMonthlyPayment: string;
  escrowPortion: string;
  startDate: string;
  linkedHoldingId: string;
};

function toAmortizationDrafts(liability: Liability): AmortizationDrafts {
  return {
    interestRatePercent: liability.interest_rate === null ? "" : String(liability.interest_rate * 100),
    originalLoanAmount: liability.original_loan_amount === null ? "" : String(liability.original_loan_amount),
    termMonths: liability.term_months === null ? "" : String(liability.term_months),
    customMonthlyPayment:
      liability.custom_monthly_payment === null ? "" : String(liability.custom_monthly_payment),
    extraMonthlyPayment: String(liability.extra_monthly_payment),
    escrowPortion: String(liability.escrow_portion),
    startDate: liability.start_date ?? "",
    linkedHoldingId: liability.linked_holding_id ?? "",
  };
}

/** `undefined` when `text` isn't blank but doesn't parse as a finite
 * number — used to tell "leave blank" (valid, means `null`/0) apart from a
 * typo the Save button should block on. */
function parseOptionalNumber(text: string): number | null | undefined {
  if (text.trim() === "") return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : undefined;
}

function draftsAreValid(drafts: AmortizationDrafts): boolean {
  if (parseOptionalNumber(drafts.interestRatePercent) === undefined) return false;
  if (parseOptionalNumber(drafts.originalLoanAmount) === undefined) return false;
  if (parseOptionalNumber(drafts.customMonthlyPayment) === undefined) return false;
  if (drafts.extraMonthlyPayment.trim() !== "" && !Number.isFinite(Number(drafts.extraMonthlyPayment))) {
    return false;
  }
  if (drafts.escrowPortion.trim() !== "" && !Number.isFinite(Number(drafts.escrowPortion))) return false;
  if (drafts.termMonths.trim() !== "") {
    const months = Number(drafts.termMonths);
    if (!Number.isInteger(months) || months <= 0) return false;
  }
  return true;
}

/** Builds the full Amortization Assumptions slice of a `LiabilityPatch`
 * from validated drafts — assumes `draftsAreValid` already passed. Every
 * field is always present (never `undefined`), so callers needing the
 * engine's `AmortizationInput` shape (a strict subset of this one) can pass
 * this straight through rather than re-defaulting each field again.
 * Percent fields are stored as decimal fractions (0.06, not 6), matching
 * `ProjectionAssumptions`'s own convention. */
function draftsToPatch(drafts: AmortizationDrafts): AmortizationAssumptions {
  const interestRatePercent = parseOptionalNumber(drafts.interestRatePercent);
  return {
    interest_rate: interestRatePercent === null || interestRatePercent === undefined
      ? null
      : interestRatePercent / 100,
    original_loan_amount: parseOptionalNumber(drafts.originalLoanAmount) ?? null,
    term_months: drafts.termMonths.trim() === "" ? null : Number(drafts.termMonths),
    custom_monthly_payment: parseOptionalNumber(drafts.customMonthlyPayment) ?? null,
    extra_monthly_payment: drafts.extraMonthlyPayment.trim() === "" ? 0 : Number(drafts.extraMonthlyPayment),
    escrow_portion: drafts.escrowPortion.trim() === "" ? 0 : Number(drafts.escrowPortion),
    start_date: drafts.startDate.trim() === "" ? null : drafts.startDate,
    linked_holding_id: drafts.linkedHoldingId === "" ? null : drafts.linkedHoldingId,
  };
}

// The rightmost detail panel for a selected Liability — record a balance
// (user story 28), see its full Valuation History (user story 27), edit its
// name, Liability Class, currency (user story 17) and Amortization
// Assumptions (ticket 11, user stories 57–61, 64), archive it (the primary
// removal path), or fall back to a true delete for correcting a mistake —
// mirrors HoldingDetailPanel.tsx. Reuses ValuationEditor as-is: it only
// knows about a currency, a "latest valuation" shape, and an onRecord
// callback, none of which differ between a Holding's value and a
// Liability's balance.
export function LiabilityDetailPanel({
  liability,
  liabilityClasses,
  latestValuation,
  history,
  today,
  projectionAssumptions,
  linkableHoldings,
  linkedHolding,
  netPosition,
  onRecordValuation,
  onSave,
  onArchive,
  onDelete,
}: {
  liability: Liability;
  liabilityClasses: LiabilityClass[];
  latestValuation: LiabilityValuation | null;
  history: LiabilityValuation[];
  today: string;
  // `null` until the User has saved the Plan page's Projection form at
  // least once — the payoff curve and Projected Net Position below have no
  // horizon to run on yet, mirroring HoldingDetailPanel's ad-hoc projection.
  projectionAssumptions: ProjectionAssumptions | null;
  linkableHoldings: Holding[];
  linkedHolding: Holding | null;
  netPosition: number | null;
  onRecordValuation: (amount: number, recordedAt: string) => Promise<string | null>;
  onSave: (patch: LiabilityPatch) => Promise<string | null>;
  onArchive: () => Promise<string | null>;
  onDelete: () => Promise<string | null>;
}) {
  const [name, setName] = useState(liability.name);
  const [liabilityClassId, setLiabilityClassId] = useState(liability.liability_class_id);
  const [currency, setCurrency] = useState(liability.currency);
  const [amortizationDrafts, setAmortizationDrafts] = useState<AmortizationDrafts>(() =>
    toAmortizationDrafts(liability),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateAmortizationDraft(field: keyof AmortizationDrafts, value: string) {
    setAmortizationDrafts((prev) => ({ ...prev, [field]: value }));
  }

  const savedDrafts = useMemo(() => toAmortizationDrafts(liability), [liability]);
  const isDirty =
    name !== liability.name ||
    liabilityClassId !== liability.liability_class_id ||
    currency !== liability.currency ||
    JSON.stringify(amortizationDrafts) !== JSON.stringify(savedDrafts);
  const isAmortizationValid = draftsAreValid(amortizationDrafts);

  // Entry-time warning (user story 63): a payment that won't cover the
  // month's interest never reaches zero — `computeAmortizationSchedule`'s
  // `payoffMonths === Infinity` is exactly that condition, checked against
  // the draft the User is currently typing, before Save.
  const entryTimeWarning = useMemo(() => {
    if (!isAmortizationValid) return null;
    const schedule = computeAmortizationSchedule(
      latestValuation?.amount ?? 0,
      draftsToPatch(amortizationDrafts),
    );
    return schedule && schedule.payoffMonths === Infinity
      ? "This payment won't cover the month's interest — the balance will grow instead of paying off."
      : null;
  }, [amortizationDrafts, isAmortizationValid, latestValuation]);

  // The payoff curve (user story 66) reads the *saved* Liability, not the
  // in-progress draft — it's a record of the schedule currently in effect,
  // not a live preview of an unsaved edit.
  const payoffCurve = useMemo(() => {
    if (!projectionAssumptions || !latestValuation) return null;
    return projectLiabilityBalance({
      today,
      currentAmount: latestValuation.amount,
      amortization: {
        interest_rate: liability.interest_rate,
        original_loan_amount: liability.original_loan_amount,
        term_months: liability.term_months,
        custom_monthly_payment: liability.custom_monthly_payment,
        extra_monthly_payment: liability.extra_monthly_payment,
        escrow_portion: liability.escrow_portion,
      },
      horizonYears: projectionAssumptions.horizon_years,
    });
  }, [projectionAssumptions, latestValuation, today, liability]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || !isAmortizationValid) return;
    setIsSaving(true);
    setError(null);
    const failure = await onSave({
      name: name.trim(),
      liability_class_id: liabilityClassId,
      currency,
      ...draftsToPatch(amortizationDrafts),
    });
    setIsSaving(false);
    if (failure) setError(failure);
  }

  async function handleArchive() {
    setIsArchiving(true);
    setError(null);
    const failure = await onArchive();
    setIsArchiving(false);
    if (failure) setError(failure);
  }

  async function handleDelete() {
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      return;
    }
    setIsDeleting(true);
    setError(null);
    const failure = await onDelete();
    setIsDeleting(false);
    if (failure) setError(failure);
  }

  return (
    <form
      onSubmit={handleSave}
      className="flex flex-1 flex-col gap-6 overflow-y-auto px-8 py-8"
      key={liability.id}
    >
      <h1 className="text-lg font-semibold tracking-tight">{liability.name}</h1>

      <ValuationEditor
        currency={liability.currency}
        latestValuation={latestValuation}
        onRecord={onRecordValuation}
      />

      {payoffCurve && payoffCurve.some((p) => p.amount > 0) && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Payoff curve</h2>
          <Sparkline values={payoffCurve.map((p) => p.amount)} />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {formatMoney(payoffCurve[0].amount, liability.currency)} today ·{" "}
            {formatMoney(payoffCurve[payoffCurve.length - 1].amount, liability.currency)} in{" "}
            {payoffCurve.length - 1} years
          </p>
        </div>
      )}

      {netPosition !== null && linkedHolding && projectionAssumptions && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {formatNetPositionLabel(
            linkedHolding.name,
            projectionAssumptions.horizon_years,
            netPosition,
            liability.currency,
          )}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Valuation History</h2>
        <ValuationHistoryTable currency={liability.currency} history={history} />
      </div>

      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-hairline bg-transparent px-2 py-1.5 text-sm"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Liability Class
          <select
            value={liabilityClassId}
            onChange={(e) => setLiabilityClassId(e.target.value)}
            className="rounded-md border border-hairline bg-transparent px-2 py-1.5 text-sm"
          >
            {liabilityClasses.map((liabilityClass) => (
              <option key={liabilityClass.id} value={liabilityClass.id}>
                {liabilityClass.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Currency
          <CurrencySelect value={currency} onChange={setCurrency} />
        </label>
      </div>

      <div className="flex flex-col gap-4 border-t border-hairline pt-4">
        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Amortization Assumptions
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Optional — any Liability can carry these, not only a Mortgage. Leave a field blank to hold this
          Liability flat instead of projecting a payoff.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Interest rate
            <div className="flex items-center gap-1">
              <input
                type="number"
                inputMode="decimal"
                step="any"
                value={amortizationDrafts.interestRatePercent}
                onChange={(e) => updateAmortizationDraft("interestRatePercent", e.target.value)}
                className="w-full rounded-md border border-hairline bg-transparent px-2 py-1.5 text-sm"
              />
              %
            </div>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Term (months)
            <input
              type="number"
              inputMode="numeric"
              step={1}
              min={1}
              value={amortizationDrafts.termMonths}
              onChange={(e) => updateAmortizationDraft("termMonths", e.target.value)}
              className="rounded-md border border-hairline bg-transparent px-2 py-1.5 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Original loan amount
            <input
              type="number"
              inputMode="decimal"
              step="any"
              value={amortizationDrafts.originalLoanAmount}
              onChange={(e) => updateAmortizationDraft("originalLoanAmount", e.target.value)}
              className="rounded-md border border-hairline bg-transparent px-2 py-1.5 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Custom monthly payment
            <input
              type="number"
              inputMode="decimal"
              step="any"
              value={amortizationDrafts.customMonthlyPayment}
              onChange={(e) => updateAmortizationDraft("customMonthlyPayment", e.target.value)}
              placeholder="Derived from amount, rate, term"
              className="rounded-md border border-hairline bg-transparent px-2 py-1.5 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Extra monthly payment
            <input
              type="number"
              inputMode="decimal"
              step="any"
              value={amortizationDrafts.extraMonthlyPayment}
              onChange={(e) => updateAmortizationDraft("extraMonthlyPayment", e.target.value)}
              className="rounded-md border border-hairline bg-transparent px-2 py-1.5 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Escrow portion
            <input
              type="number"
              inputMode="decimal"
              step="any"
              value={amortizationDrafts.escrowPortion}
              onChange={(e) => updateAmortizationDraft("escrowPortion", e.target.value)}
              className="rounded-md border border-hairline bg-transparent px-2 py-1.5 text-sm"
            />
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Property tax/insurance baked into the payment — excluded when the freed payment redirects.
            </span>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Start date
            <input
              type="date"
              value={amortizationDrafts.startDate}
              onChange={(e) => updateAmortizationDraft("startDate", e.target.value)}
              className="rounded-md border border-hairline bg-transparent px-2 py-1.5 text-sm"
            />
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Display only.</span>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Linked Holding
            <select
              value={amortizationDrafts.linkedHoldingId}
              onChange={(e) => updateAmortizationDraft("linkedHoldingId", e.target.value)}
              className="rounded-md border border-hairline bg-transparent px-2 py-1.5 text-sm"
            >
              <option value="">None</option>
              {linkableHoldings.map((holding) => (
                <option key={holding.id} value={holding.id}>
                  {holding.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {!isAmortizationValid && (
          <p className="text-xs font-medium">Amortization fields must be valid numbers.</p>
        )}
        {entryTimeWarning && <p className="text-xs font-medium">{entryTimeWarning}</p>}
      </div>

      {error && <p className="text-sm font-medium">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSaving || !isDirty || !name.trim() || !isAmortizationValid}
          className="rounded-md border border-hairline px-3 py-1.5 text-sm disabled:opacity-60"
        >
          {isSaving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={handleArchive}
          disabled={isArchiving}
          className="rounded-md border border-hairline px-3 py-1.5 text-sm disabled:opacity-60"
        >
          {isArchiving ? "Archiving…" : "Archive"}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="rounded-md border border-hairline px-3 py-1.5 text-sm text-zinc-500 disabled:opacity-60 dark:text-zinc-400"
        >
          {isDeleting
            ? "Deleting…"
            : isConfirmingDelete
              ? "Click again to permanently delete"
              : "Delete permanently"}
        </button>
      </div>
    </form>
  );
}
