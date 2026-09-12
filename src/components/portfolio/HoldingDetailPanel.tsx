"use client";

import { useState } from "react";
import { CurrencySelect } from "@/components/CurrencySelect";
import { ValuationEditor } from "./ValuationEditor";
import { ValuationHistoryTable } from "./ValuationHistoryTable";
import type { AssetClass, Holding, HoldingPatch, HoldingValuation } from "./types";

// The rightmost detail panel for a selected Holding — record a Valuation
// (user stories 22–26), see its full Valuation History (user story 27),
// edit its name, Asset Class, and currency (user story 17), archive it
// (user story 18, the primary removal path), or fall back to a true delete
// for correcting a mistaken entry (user story 21).
export function HoldingDetailPanel({
  holding,
  assetClasses,
  latestValuation,
  history,
  onRecordValuation,
  onSave,
  onArchive,
  onDelete,
}: {
  holding: Holding;
  assetClasses: AssetClass[];
  latestValuation: HoldingValuation | null;
  history: HoldingValuation[];
  onRecordValuation: (amount: number, recordedAt: string) => Promise<string | null>;
  onSave: (patch: HoldingPatch) => Promise<string | null>;
  onArchive: () => Promise<string | null>;
  onDelete: () => Promise<string | null>;
}) {
  const [name, setName] = useState(holding.name);
  const [assetClassId, setAssetClassId] = useState(holding.asset_class_id);
  const [currency, setCurrency] = useState(holding.currency);
  const [isSaving, setIsSaving] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty = name !== holding.name || assetClassId !== holding.asset_class_id || currency !== holding.currency;

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    setError(null);
    const failure = await onSave({ name: name.trim(), asset_class_id: assetClassId, currency });
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
      key={holding.id}
    >
      <h1 className="text-lg font-semibold tracking-tight">{holding.name}</h1>

      <ValuationEditor
        currency={holding.currency}
        latestValuation={latestValuation}
        onRecord={onRecordValuation}
      />

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Valuation History</h2>
        <ValuationHistoryTable currency={holding.currency} history={history} />
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
          Asset Class
          <select
            value={assetClassId}
            onChange={(e) => setAssetClassId(e.target.value)}
            className="rounded-md border border-hairline bg-transparent px-2 py-1.5 text-sm"
          >
            {assetClasses.map((assetClass) => (
              <option key={assetClass.id} value={assetClass.id}>
                {assetClass.name}
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
