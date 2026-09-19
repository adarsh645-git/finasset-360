"use client";

import { useState } from "react";
import { CurrencySelect } from "@/components/CurrencySelect";
import { validatePriceLookupInput } from "@/lib/holdings/price-lookup-input";
import { StockSymbolPicker } from "./StockSymbolPicker";

// Add a Holding under the Asset Class the User is currently browsing (user
// story 12) — name and currency, plus an optional market symbol/quantity
// pair that gives it a Live Estimate (ticket 07). The Asset Class itself is
// implicit in which column this control lives in. Market symbol leads the
// form, ahead of Name: it's the stock-picker (ticket 18), and selecting a
// suggestion autofills Name and Sector, so by the time a User reaches Name
// it's often already filled in. A freeform symbol with no match still
// works — Name stays required, since a manually-entered Holding (Real
// Estate, Cash) has no symbol to autofill it from. Held at (ticket 19) is a
// separate, freeform "where is this held" label — independent of the
// symbol/quantity pair, so it applies to every Asset Class, not just
// market-symbol Holdings. In the Cash Asset Class (ticket 22) neither Market
// symbol nor Quantity means anything, so both are hidden and the form is
// just Name, Held at and currency.
export function AddHoldingRow({
  isCash,
  onAdd,
}: {
  isCash: boolean;
  onAdd: (
    name: string,
    currency: string,
    priceLookup: { price_lookup_symbol: string; quantity: number } | null,
    sector: string | null,
    heldAt: string | null,
  ) => Promise<string | null>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [symbol, setSymbol] = useState("");
  const [quantity, setQuantity] = useState("");
  const [sector, setSector] = useState<string | null>(null);
  const [heldAt, setHeldAt] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populated together or not at all (docs/SPEC.md's schema note) — a
  // symbol with no quantity, or vice versa, is neither "manual" nor
  // "live-priced" and would 400 at the route boundary anyway, so this
  // catches it before the round trip.
  const priceLookup = validatePriceLookupInput(symbol, quantity);
  // Field values a User typed before switching to Cash are hidden, not
  // cleared, so they must neither block the submit nor be sent.
  const isPriceLookupBlocked = !isCash && (priceLookup.isMismatched || priceLookup.isInvalid);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || isPriceLookupBlocked) return;
    setIsSaving(true);
    setError(null);
    const failure = await onAdd(
      name.trim(),
      currency,
      isCash ? null : priceLookup.value,
      isCash ? null : sector,
      heldAt.trim() || null,
    );
    setIsSaving(false);
    if (failure) {
      setError(failure);
      return;
    }
    setName("");
    setSymbol("");
    setQuantity("");
    setSector(null);
    setHeldAt("");
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
    <form
      onSubmit={handleSubmit}
      onKeyDown={(e) => {
        if (e.key === "Escape") setIsOpen(false);
      }}
      className="flex flex-col gap-1.5 border-t border-hairline p-2.5"
    >
      {!isCash && (
        <>
          <StockSymbolPicker
            autoFocus
            value={symbol}
            onChangeText={(text) => {
              setSymbol(text);
              setSector(null);
            }}
            onSelect={(match) => {
              setSymbol(match.symbol);
              setSector(match.sector);
              setName(match.name);
            }}
            disabled={isSaving}
            placeholder="Market symbol (optional)"
            className="w-full rounded-md border border-hairline bg-transparent px-2 py-1.5 text-sm"
          />
          {sector && <p className="text-xs text-zinc-500 dark:text-zinc-400">Sector: {sector}</p>}
          <input
            type="text"
            inputMode="decimal"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Quantity"
            disabled={isSaving}
            className="rounded-md border border-hairline bg-transparent px-2 py-1.5 text-sm"
          />
          {priceLookup.isMismatched && (
            <p className="text-xs font-medium">Market symbol and quantity must be set together.</p>
          )}
          {priceLookup.isInvalid && (
            <p className="text-xs font-medium">Quantity must be a positive number.</p>
          )}
        </>
      )}
      <input
        autoFocus={isCash}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Holding name"
        disabled={isSaving}
        className="rounded-md border border-hairline bg-transparent px-2 py-1.5 text-sm"
      />
      <input
        value={heldAt}
        onChange={(e) => setHeldAt(e.target.value)}
        placeholder="Held at (optional)"
        disabled={isSaving}
        className="rounded-md border border-hairline bg-transparent px-2 py-1.5 text-sm"
      />
      <CurrencySelect value={currency} onChange={setCurrency} disabled={isSaving} />
      {error && <p className="text-xs font-medium">{error}</p>}
      <div className="flex gap-1.5">
        <button
          type="submit"
          disabled={isSaving || !name.trim() || isPriceLookupBlocked}
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
