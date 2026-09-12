"use client";

import { useState } from "react";
import { CurrencySelect } from "@/components/CurrencySelect";
import type { AssetClass, Holding, HoldingPatch } from "./types";

// The rightmost detail panel for a selected Holding — edit its name, Asset
// Class, and currency (user story 17), or delete it. Ticket 03 has no
// archive column yet (that lands in ticket 06), so delete here is a true
// delete.
export function HoldingDetailPanel({
  holding,
  assetClasses,
  onSave,
  onDelete,
}: {
  holding: Holding;
  assetClasses: AssetClass[];
  onSave: (patch: HoldingPatch) => Promise<string | null>;
  onDelete: () => Promise<string | null>;
}) {
  const [name, setName] = useState(holding.name);
  const [assetClassId, setAssetClassId] = useState(holding.asset_class_id);
  const [currency, setCurrency] = useState(holding.currency);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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

  async function handleDelete() {
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
          onClick={handleDelete}
          disabled={isDeleting}
          className="rounded-md border border-hairline px-3 py-1.5 text-sm disabled:opacity-60"
        >
          {isDeleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </form>
  );
}
