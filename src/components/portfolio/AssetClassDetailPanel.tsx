"use client";

import { useState } from "react";
import { AssetClassIcon } from "@/components/icons/AssetClassIcon";
import type { AssetClass } from "./types";

// The rightmost detail panel for whatever Asset Class is currently
// selected, when no Holding within it is selected yet. A global default has
// no owner and so no delete affordance — RLS would refuse the delete
// anyway, but there's no reason to offer a control every attempt of which
// fails.
export function AssetClassDetailPanel({
  assetClass,
  isOwnedByCurrentUser,
  holdingCount,
  onDelete,
}: {
  assetClass: AssetClass;
  isOwnedByCurrentUser: boolean;
  holdingCount: number;
  onDelete: () => Promise<string | null>;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);
    const failure = await onDelete();
    setIsDeleting(false);
    if (failure) setError(failure);
  }

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-8 py-8">
      <header className="flex items-center gap-3">
        <AssetClassIcon assetClassId={assetClass.id} className="h-6 w-6 shrink-0" />
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{assetClass.name}</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {isOwnedByCurrentUser ? "Custom Asset Class" : "Default Asset Class"} ·{" "}
            {holdingCount} Holding{holdingCount === 1 ? "" : "s"}
          </p>
        </div>
      </header>

      {isOwnedByCurrentUser && (
        <div className="flex flex-col items-start gap-1.5">
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="rounded-md border border-hairline px-3 py-1.5 text-sm disabled:opacity-60"
          >
            {isDeleting ? "Deleting…" : "Delete Asset Class"}
          </button>
          {error && <p className="text-xs font-medium">{error}</p>}
        </div>
      )}
    </div>
  );
}
