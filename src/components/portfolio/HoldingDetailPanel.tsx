"use client";

import { useState } from "react";
import { CurrencySelect } from "@/components/CurrencySelect";
import { formatMoney } from "@/lib/currency/format";
import { validatePriceLookupInput } from "@/lib/holdings/price-lookup-input";
import type { PriceCacheRow } from "@/lib/market-data/live-estimate";
import { projectHoldingValue } from "@/lib/projection/engine";
import { formatNetPositionLabel } from "@/lib/projection/net-position";
import { LiveEstimate } from "./LiveEstimate";
import { StockSymbolPicker } from "./StockSymbolPicker";
import { ValuationEditor } from "./ValuationEditor";
import { ValuationHistoryTable } from "./ValuationHistoryTable";
import type {
  AssetClass,
  Holding,
  HoldingPatch,
  HoldingValuation,
  Liability,
  ProjectionAssumptions,
} from "./types";

// The rightmost detail panel for a selected Holding — record a Valuation
// (user stories 22–26), see its full Valuation History (user story 27), see
// its Live Estimate against that history (user stories 32-35, ticket 07),
// edit its market symbol/quantity, name, Held at, Asset Class, and currency
// (user story 17), archive it (user story 18, the primary removal path), or
// fall back to a true delete for correcting a mistaken entry (user story
// 21). Market symbol/Quantity lead the edit form, ahead of Name (ticket
// 18): picking a suggestion from the stock-picker autofills Name and
// Sector. Held at (ticket 19) sits beside Name — both are "how do I label
// this Holding" — and is unrelated to the symbol/quantity pair, so it
// applies regardless of Asset Class.
export function HoldingDetailPanel({
  holding,
  assetClasses,
  latestValuation,
  history,
  priceCache,
  today,
  projectionAssumptions,
  linkedLiabilities,
  netPosition,
  onRecordValuation,
  onSave,
  onArchive,
  onDelete,
}: {
  holding: Holding;
  assetClasses: AssetClass[];
  latestValuation: HoldingValuation | null;
  history: HoldingValuation[];
  priceCache: PriceCacheRow | null;
  today: string;
  // `null` until the User has saved the Plan page's Projection form at
  // least once — the ad-hoc projection below has nothing to run on yet.
  projectionAssumptions: ProjectionAssumptions | null;
  // Every active Liability that names this Holding as `linked_holding_id`
  // (ticket 11, user stories 64-65) — usually one (a mortgage on a house),
  // but nothing stops a second loan financing the same Holding.
  linkedLiabilities: Liability[];
  netPosition: number | null;
  onRecordValuation: (amount: number, recordedAt: string) => Promise<string | null>;
  onSave: (patch: HoldingPatch) => Promise<string | null>;
  onArchive: () => Promise<string | null>;
  onDelete: () => Promise<string | null>;
}) {
  const [name, setName] = useState(holding.name);
  const [assetClassId, setAssetClassId] = useState(holding.asset_class_id);
  const [currency, setCurrency] = useState(holding.currency);
  const [symbol, setSymbol] = useState(holding.price_lookup_symbol ?? "");
  const [quantity, setQuantity] = useState(holding.quantity !== null ? String(holding.quantity) : "");
  const [sector, setSector] = useState(holding.sector);
  const [heldAt, setHeldAt] = useState(holding.held_at ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const priceLookup = validatePriceLookupInput(symbol, quantity);

  // Ad-hoc projection of this one Holding (user story 78) — no contribution
  // allocated to it, since contributions are portfolio-level; growth alone,
  // at the Portfolio's own assumption. `null` until both a Valuation and a
  // saved Projection assumption set exist.
  let projectedValue: number | null = null;
  if (projectionAssumptions && latestValuation) {
    const projectedPoints = projectHoldingValue({
      today,
      currentAmount: latestValuation.amount,
      growthRate: projectionAssumptions.growth_rate,
      horizonYears: projectionAssumptions.horizon_years,
    });
    projectedValue = projectedPoints[projectedPoints.length - 1].amount;
  }

  const isDirty =
    name !== holding.name ||
    assetClassId !== holding.asset_class_id ||
    currency !== holding.currency ||
    symbol !== (holding.price_lookup_symbol ?? "") ||
    quantity !== (holding.quantity !== null ? String(holding.quantity) : "") ||
    sector !== holding.sector ||
    heldAt !== (holding.held_at ?? "");

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || priceLookup.isMismatched || priceLookup.isInvalid) return;
    setIsSaving(true);
    setError(null);
    const failure = await onSave({
      name: name.trim(),
      asset_class_id: assetClassId,
      currency,
      price_lookup_symbol: priceLookup.value?.price_lookup_symbol ?? null,
      quantity: priceLookup.value?.quantity ?? null,
      sector: priceLookup.value ? sector : null,
      held_at: heldAt.trim() || null,
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
      key={holding.id}
    >
      <h1 className="text-lg font-semibold tracking-tight">{holding.name}</h1>

      <ValuationEditor
        currency={holding.currency}
        latestValuation={latestValuation}
        onRecord={onRecordValuation}
      />

      {holding.price_lookup_symbol && holding.quantity !== null && (
        <LiveEstimate
          quantity={holding.quantity}
          priceCache={priceCache}
          lastValuation={latestValuation}
          holdingCurrency={holding.currency}
          onUse={onRecordValuation}
        />
      )}

      {projectedValue !== null && projectionAssumptions && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Projected in {projectionAssumptions.horizon_years} years:{" "}
          {formatMoney(projectedValue, holding.currency)}
        </p>
      )}

      {netPosition !== null && linkedLiabilities.length > 0 && projectionAssumptions && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {formatNetPositionLabel(
            linkedLiabilities.map((l) => l.name).join(", "),
            projectionAssumptions.horizon_years,
            netPosition,
            holding.currency,
          )}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Valuation History</h2>
        <ValuationHistoryTable currency={holding.currency} history={history} />
      </div>

      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Market symbol
          <StockSymbolPicker
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
            placeholder="e.g. AAPL, XAU (optional)"
            className="rounded-md border border-hairline bg-transparent px-2 py-1.5 text-sm"
          />
          {sector && <span className="text-xs text-zinc-500 dark:text-zinc-400">Sector: {sector}</span>}
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Quantity
          <input
            type="text"
            inputMode="decimal"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="rounded-md border border-hairline bg-transparent px-2 py-1.5 text-sm"
          />
        </label>
        {priceLookup.isMismatched && (
          <p className="text-xs font-medium">Market symbol and quantity must be set together.</p>
        )}
        {priceLookup.isInvalid && <p className="text-xs font-medium">Quantity must be a positive number.</p>}

        <label className="flex flex-col gap-1 text-sm">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-hairline bg-transparent px-2 py-1.5 text-sm"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Held at
          <input
            value={heldAt}
            onChange={(e) => setHeldAt(e.target.value)}
            placeholder="e.g. Fidelity 401k (optional)"
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
          disabled={
            isSaving || !isDirty || !name.trim() || priceLookup.isMismatched || priceLookup.isInvalid
          }
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
