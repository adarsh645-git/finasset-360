"use client";

import { useState } from "react";

// The "add my own custom Liability Class" affordance (user story 8) — mirrors
// AddAssetClassRow.tsx.
export function AddLiabilityClassRow({
  onAdd,
}: {
  onAdd: (name: string) => Promise<string | null>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    setError(null);
    const failure = await onAdd(name.trim());
    setIsSaving(false);
    if (failure) {
      setError(failure);
      return;
    }
    setName("");
    setIsOpen(false);
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="border-t border-hairline px-3 py-2.5 text-left text-sm text-zinc-500 hover:text-foreground dark:text-zinc-400"
      >
        + New Liability Class
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1.5 border-t border-hairline p-2.5">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setIsOpen(false);
        }}
        placeholder="Class name"
        disabled={isSaving}
        className="rounded-md border border-hairline bg-transparent px-2 py-1.5 text-sm"
      />
      {error && <p className="text-xs font-medium">{error}</p>}
      <div className="flex gap-1.5">
        <button
          type="submit"
          disabled={isSaving || !name.trim()}
          className="rounded-md border border-hairline px-2.5 py-1 text-xs font-medium disabled:opacity-60"
        >
          {isSaving ? "Adding…" : "Add"}
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="rounded-md px-2.5 py-1 text-xs text-zinc-500 dark:text-zinc-400"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
