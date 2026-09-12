"use client";

import { useState } from "react";
import { CurrencySelect } from "@/components/CurrencySelect";
import { validatePriceLookupInput } from "@/lib/holdings/price-lookup-input";

// Add a Holding under the Asset Class the User is currently browsing (user
// story 12) — name and currency, plus an optional market symbol/quantity
// pair that gives it a Live Estimate (ticket 07). The Asset Class itself is
// implicit in which column this control lives in.
export function AddHoldingRow({
  onAdd,
}: {
  onAdd: (
    name: string,
    currency: string,
    priceLookup: { price_lookup_symbol: string; quantity: number } | null,
  ) => Promise<string | null>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [symbol, setSymbol] = useState("");
  const [quantity, setQuantity] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populated together or not at all (docs/SPEC.md's schema note) — a
  // symbol with no quantity, or vice versa, is neither "manual" nor
  // "live-priced" and would 400 at the route boundary anyway, so this
  // catches it before the round trip.
  const priceLookup = validatePriceLookupInput(symbol, quantity);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || priceLookup.isMismatched || priceLookup.isInvalid) return;
    setIsSaving(true);
    setError(null);
    const failure = await onAdd(name.trim(), currency, priceLookup.value);
    setIsSaving(false);
    if (failure) {
      setError(failure);
      return;
    }
    setName("");
    setSymbol("");
    setQuantity("");
    setIsOpen(false);
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="border-t border-hairline px-3 py-2.5 text-left text-sm text-zinc-500 hover:text-foreground dark:text-zinc-400"
      >
        + New Holding
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
        placeholder="Holding name"
        disabled={isSaving}
        className="rounded-md border border-hairline bg-transparent px-2 py-1.5 text-sm"
      />
      <CurrencySelect value={currency} onChange={setCurrency} disabled={isSaving} />
      <div className="flex gap-1.5">
        <input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          placeholder="Market symbol (optional)"
          disabled={isSaving}
          className="w-1/2 rounded-md border border-hairline bg-transparent px-2 py-1.5 text-sm"
        />
        <input
          type="number"
          inputMode="decimal"
          step="any"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="Quantity"
          disabled={isSaving}
          className="w-1/2 rounded-md border border-hairline bg-transparent px-2 py-1.5 text-sm"
        />
      </div>
      {priceLookup.isMismatched && (
        <p className="text-xs font-medium">Market symbol and quantity must be set together.</p>
      )}
      {priceLookup.isInvalid && <p className="text-xs font-medium">Quantity must be a positive number.</p>}
      {error && <p className="text-xs font-medium">{error}</p>}
      <div className="flex gap-1.5">
        <button
          type="submit"
          disabled={isSaving || !name.trim() || priceLookup.isMismatched || priceLookup.isInvalid}
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
