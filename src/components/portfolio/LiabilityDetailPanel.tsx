"use client";

import { useState } from "react";
import { CurrencySelect } from "@/components/CurrencySelect";
import { ValuationEditor } from "./ValuationEditor";
import { ValuationHistoryTable } from "./ValuationHistoryTable";
import type { Liability, LiabilityClass, LiabilityPatch, LiabilityValuation } from "./types";

// The rightmost detail panel for a selected Liability — record a balance
// (user story 28), see its full Valuation History (user story 27), edit its
// name, Liability Class, and currency (user story 17), archive it (the
// primary removal path), or fall back to a true delete for correcting a
// mistake — mirrors HoldingDetailPanel.tsx. Reuses ValuationEditor as-is: it
// only knows about a currency, a "latest valuation" shape, and an onRecord
// callback, none of which differ between a Holding's value and a
// Liability's balance.
export function LiabilityDetailPanel({
  liability,
  liabilityClasses,
  latestValuation,
  history,
  onRecordValuation,
  onSave,
  onArchive,
  onDelete,
}: {
  liability: Liability;
  liabilityClasses: LiabilityClass[];
  latestValuation: LiabilityValuation | null;
  history: LiabilityValuation[];
  onRecordValuation: (amount: number, recordedAt: string) => Promise<string | null>;
  onSave: (patch: LiabilityPatch) => Promise<string | null>;
  onArchive: () => Promise<string | null>;
  onDelete: () => Promise<string | null>;
}) {
  const [name, setName] = useState(liability.name);
  const [liabilityClassId, setLiabilityClassId] = useState(liability.liability_class_id);
  const [currency, setCurrency] = useState(liability.currency);
  const [isSaving, setIsSaving] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty =
    name !== liability.name ||
    liabilityClassId !== liability.liability_class_id ||
    currency !== liability.currency;

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    setError(null);
    const failure = await onSave({ name: name.trim(), liability_class_id: liabilityClassId, currency });
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

      {error && <p className="text-sm font-medium">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSaving || !isDirty || !name.trim()}
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
