"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/currency/format";
import {
  compareToLastValuation,
  computeLiveEstimate,
  priceAgeLabel,
  type PriceCacheRow,
} from "@/lib/market-data/live-estimate";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

// A Holding's Live Estimate — quantity × the latest cached price (user
// story 32) — rendered as a visually distinct, dashed-border block so it
// never reads as a recorded Valuation (user story 33; CONTEXT.md's own
// "avoid: current value, live price" note). Labelled with how it differs
// from the last Valuation (user story 34) and how stale the underlying
// price is (user story 37), with one click to record it as a Valuation
// (user story 35) — "Use this" hands the raw cached-currency figure to the
// same recording path a manual entry uses, which assumes (as this whole
// feature does) that the Holding's own currency matches its symbol's
// native quote currency. When they don't match, this disables "Use this"
// instead of recording a number in the wrong currency under the Holding's
// own — the same case `compareToLastValuation` already refuses to diff
// for the same reason: never fabricate an FX rate this feature doesn't
// otherwise capture. Renders nothing extra beyond a plain note when the
// Holding has a symbol but no cache row exists yet — a fetch that hasn't
// happened, or has never once succeeded, isn't an error state to alarm
// over.
export function LiveEstimate({
  quantity,
  priceCache,
  lastValuation,
  holdingCurrency,
  onUse,
}: {
  quantity: number;
  priceCache: PriceCacheRow | null;
  lastValuation: { amount: number } | null;
  holdingCurrency: string;
  onUse: (amount: number, recordedAt: string) => Promise<string | null>;
}) {
  const [isUsing, setIsUsing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const liveEstimate = computeLiveEstimate(quantity, priceCache);

  if (!liveEstimate) {
    return (
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Live Estimate not available yet — no price has been fetched for this symbol.
      </p>
    );
  }

  const diff = compareToLastValuation(liveEstimate, lastValuation, holdingCurrency);
  const currencyMismatch = liveEstimate.currency !== holdingCurrency;

  async function handleUse() {
    if (currencyMismatch) return;
    setIsUsing(true);
    setError(null);
    const failure = await onUse(liveEstimate!.amount, todayIsoDate());
    setIsUsing(false);
    if (failure) setError(failure);
  }

  return (
    <div className="flex flex-col gap-1 rounded-md border border-dashed border-hairline px-3 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium tracking-wide text-zinc-500 dark:text-zinc-400">
          Live Estimate
        </span>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {priceAgeLabel(liveEstimate.fetchedAt)}
        </span>
      </div>

      <span className="text-lg font-semibold tracking-tight">
        {formatMoney(liveEstimate.amount, liveEstimate.currency)}
      </span>

      {diff && (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {diff.amount >= 0 ? "+" : "−"}
          {formatMoney(Math.abs(diff.amount), liveEstimate.currency)}
          {diff.percent !== null
            ? ` (${diff.percent >= 0 ? "+" : "−"}${Math.abs(diff.percent).toFixed(1)}%)`
            : ""}{" "}
          vs last Valuation
        </span>
      )}

      {liveEstimate.hasRecentFailure && (
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          Last refresh failed — showing the last known price.
        </span>
      )}

      {currencyMismatch ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Priced in {liveEstimate.currency}, this Holding is in {holdingCurrency} — &ldquo;Use
          this&rdquo; is unavailable rather than recording the wrong currency&rsquo;s figure.
        </p>
      ) : (
        <button
          type="button"
          onClick={handleUse}
          disabled={isUsing}
          className="w-fit rounded-md border border-hairline px-2 py-1 text-xs disabled:opacity-60"
        >
          {isUsing ? "Recording…" : "Use this"}
        </button>
      )}

      {error && <p className="text-xs font-medium">{error}</p>}
    </div>
  );
}
