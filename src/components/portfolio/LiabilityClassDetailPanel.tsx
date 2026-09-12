"use client";

import { useState } from "react";
import { LiabilityClassIcon } from "@/components/icons/LiabilityClassIcon";
import type { LiabilityClass } from "./types";

// The rightmost detail panel for whatever Liability Class is currently
// selected, when no Liability within it is selected yet — mirrors
// AssetClassDetailPanel.tsx.
export function LiabilityClassDetailPanel({
  liabilityClass,
  isOwnedByCurrentUser,
  liabilityCount,
  onDelete,
}: {
  liabilityClass: LiabilityClass;
  isOwnedByCurrentUser: boolean;
  liabilityCount: number;
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
        <LiabilityClassIcon liabilityClassId={liabilityClass.id} className="h-6 w-6 shrink-0" />
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{liabilityClass.name}</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {isOwnedByCurrentUser ? "Custom Liability Class" : "Default Liability Class"} ·{" "}
            {liabilityCount} Liabilit{liabilityCount === 1 ? "y" : "ies"}
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
            {isDeleting ? "Deleting…" : "Delete Liability Class"}
          </button>
          {error && <p className="text-xs font-medium">{error}</p>}
        </div>
      )}
    </div>
  );
}
