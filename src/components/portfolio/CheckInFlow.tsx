"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/currency/format";
import { todayIsoDate } from "@/lib/date/today";
import { completeCheckIn, type CheckInResult } from "@/lib/check-in/api";
import { computeLiveEstimate, type PriceCacheRow } from "@/lib/market-data/live-estimate";
import { daysAgoLabel } from "@/lib/valuations/staleness";
import type { Holding, HoldingValuation } from "./types";

type RecordValuation = (holdingId: string, amount: number, recordedAt: string) => Promise<string | null>;

// The guided monthly pass (ticket 08, user stories 39-46) — one Holding per
// step, pre-filled with its last recorded value, rendered by PortfolioShell
// in place of the Miller columns while active (suspends column browsing for
// this linear queue, per the ticket). Desktop drives it by keyboard
// (Enter/L/Esc); ticket 15's narrow-viewport Keep/Use estimate/Done tap
// targets call the exact same `keep`/`acceptLiveEstimate`/`recordDraft`
// functions inside CheckInStep below that Enter/L already dispatch to,
// never a second implementation of the same decision.
export function CheckInFlow({
  queue,
  latestByHolding,
  priceCacheBySymbol,
  homeCurrency,
  onRecordValuation,
  onExit,
}: {
  queue: Holding[];
  latestByHolding: Map<string, HoldingValuation>;
  priceCacheBySymbol: Map<string, PriceCacheRow>;
  homeCurrency: string;
  onRecordValuation: RecordValuation;
  onExit: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const [result, setResult] = useState<CheckInResult | { error: string } | null>(null);

  const holding = queue[index] ?? null;

  async function finish() {
    setIsCompleting(true);
    setResult(await completeCheckIn());
    setIsCompleting(false);
  }

  function advance() {
    if (index + 1 < queue.length) {
      setIndex(index + 1);
      return;
    }
    void finish();
  }

  if (queue.length === 0) {
    return (
      <CheckInMessage onExit={onExit}>
        Nothing to check in on right now.
      </CheckInMessage>
    );
  }

  if (result) {
    return <CheckInSummary result={result} homeCurrency={homeCurrency} onDone={onExit} />;
  }

  if (isCompleting || !holding) {
    return <CheckInMessage>Finishing up…</CheckInMessage>;
  }

  return (
    <CheckInStep
      key={holding.id}
      holding={holding}
      position={index + 1}
      total={queue.length}
      latestValuation={latestByHolding.get(holding.id) ?? null}
      priceCache={
        holding.price_lookup_symbol ? (priceCacheBySymbol.get(holding.price_lookup_symbol) ?? null) : null
      }
      onRecordValuation={onRecordValuation}
      onAdvance={advance}
      onExit={onExit}
    />
  );
}

function CheckInStep({
  holding,
  position,
  total,
  latestValuation,
  priceCache,
  onRecordValuation,
  onAdvance,
  onExit,
}: {
  holding: Holding;
  position: number;
  total: number;
  latestValuation: HoldingValuation | null;
  priceCache: PriceCacheRow | null;
  onRecordValuation: RecordValuation;
  onAdvance: () => void;
  onExit: () => void;
}) {
  const [draftAmount, setDraftAmount] = useState(
    latestValuation ? String(latestValuation.amount) : "",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const liveEstimate =
    holding.price_lookup_symbol && holding.quantity !== null
      ? computeLiveEstimate(holding.quantity, priceCache)
      : null;

  async function recordAndAdvance(amount: number) {
    setIsSaving(true);
    setError(null);
    const failure = await onRecordValuation(holding.id, amount, todayIsoDate());
    setIsSaving(false);
    if (failure) {
      setError(failure);
      return;
    }
    onAdvance();
  }

  // Confirming an unchanged figure (user story 42) — advances with no
  // network call at all, so confirming can never write a duplicate
  // same-value Valuation under today's date. This is the one function both
  // Enter-on-an-unchanged-draft and the narrow "Keep" tap target call
  // (ticket 15's "routed through one shared action" requirement) — neither
  // ever records anything on its own.
  function keep() {
    onAdvance();
  }

  // Explicitly commits whatever's in the draft, even if it happens to equal
  // the pre-filled figure — distinct from `keep`, which never records.
  // Shared by Enter-on-a-changed-draft and the narrow "Done" tap target.
  function recordDraft() {
    const trimmed = draftAmount.trim();
    const parsed = Number(trimmed);
    if (trimmed === "" || !Number.isFinite(parsed)) {
      setError("Enter a valid number.");
      return;
    }
    void recordAndAdvance(parsed);
  }

  // Enter's own behaviour: dispatch to `keep` or `recordDraft` depending on
  // whether the draft actually differs from the pre-filled figure — the
  // "Keep"/"Done" split doesn't exist for a keyboard User, who just presses
  // one key either way.
  function submitDraft() {
    const trimmed = draftAmount.trim();
    if (trimmed === "") {
      keep();
      return;
    }
    const parsed = Number(trimmed);
    if (latestValuation && Number.isFinite(parsed) && parsed === latestValuation.amount) {
      keep();
      return;
    }
    recordDraft();
  }

  // Shared by the "L" key and the narrow "Use estimate" tap target.
  function acceptLiveEstimate() {
    if (liveEstimate) void recordAndAdvance(liveEstimate.amount);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      submitDraft();
    } else if (event.key === "Escape") {
      event.preventDefault();
      onExit();
    } else if ((event.key === "l" || event.key === "L") && liveEstimate) {
      event.preventDefault();
      acceptLiveEstimate();
    }
  }

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center gap-6 p-8">
      {/* Esc has no equivalent on a touchscreen, so this stays visible at
         every width rather than joining the narrow-only tap targets below —
         without it, a touch User pressing "Keep" through every remaining
         step just to escape would be exactly the trap ticket 08 exists to
         prevent. */}
      <button
        type="button"
        onClick={onExit}
        className="absolute top-2 right-2 min-h-11 min-w-11 text-sm text-zinc-500 dark:text-zinc-400"
      >
        Leave
      </button>

      <p className="text-xs font-medium tracking-wide text-zinc-500 dark:text-zinc-400">
        {position} of {total}
      </p>

      <div className="flex w-full max-w-sm flex-col gap-3 rounded-lg border border-hairline p-6">
        <h2 className="text-lg font-medium">{holding.name}</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {latestValuation
            ? `Last recorded ${formatMoney(latestValuation.amount, holding.currency)} · ${daysAgoLabel(latestValuation.recorded_at)}`
            : "No Valuation recorded yet"}
        </p>

        <input
          autoFocus
          type="number"
          inputMode="decimal"
          step="any"
          value={draftAmount}
          disabled={isSaving}
          onChange={(e) => setDraftAmount(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={(e) => e.currentTarget.select()}
          className="rounded-md border border-hairline bg-transparent px-2 py-1.5 text-2xl font-semibold tracking-tight"
        />

        {liveEstimate && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 max-[899px]:hidden">
            Live Estimate {formatMoney(liveEstimate.amount, liveEstimate.currency)} — press L to accept
          </p>
        )}

        {error && <p className="text-xs font-medium">{error}</p>}

        {/* Desktop: keyboard hints only. Below 900px there's no keyboard to
           hint at, so Keep/Use estimate/Done tap targets take over instead
           (ticket 15, user story 47) — calling the exact same
           `keep`/`acceptLiveEstimate`/`recordDraft` functions Enter/L
           already use, never a second implementation. The key bindings
           themselves stay live at every width (ticket 15: "retained"). */}
        <p className="text-xs text-zinc-400 max-[899px]:hidden dark:text-zinc-600">
          Enter to confirm{liveEstimate ? " · L for Live Estimate" : ""} · Esc to leave
        </p>

        <div className="hidden gap-2 max-[899px]:flex">
          <button
            type="button"
            onClick={keep}
            disabled={isSaving}
            className="min-h-11 flex-1 rounded-md border border-hairline px-3 text-sm disabled:opacity-60"
          >
            Keep
          </button>
          {liveEstimate && (
            <button
              type="button"
              onClick={acceptLiveEstimate}
              disabled={isSaving}
              className="min-h-11 flex-1 rounded-md border border-hairline px-3 text-sm disabled:opacity-60"
            >
              Use estimate
            </button>
          )}
          <button
            type="button"
            onClick={recordDraft}
            disabled={isSaving}
            className="min-h-11 flex-1 rounded-md border border-hairline px-3 text-sm font-medium disabled:opacity-60"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function CheckInMessage({ children, onExit }: { children: React.ReactNode; onExit?: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{children}</p>
      {onExit && (
        <button
          type="button"
          onClick={onExit}
          className="rounded-md border border-hairline px-3 py-1.5 text-sm"
        >
          Back to dashboard
        </button>
      )}
    </div>
  );
}

function CheckInSummary({
  result,
  homeCurrency,
  onDone,
}: {
  result: CheckInResult | { error: string };
  homeCurrency: string;
  onDone: () => void;
}) {
  if ("error" in result) {
    return <CheckInMessage onExit={onDone}>{result.error}</CheckInMessage>;
  }

  const { delta, netWorth } = result;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Check-in complete</p>
      <p className="text-3xl font-semibold tracking-tight">{formatMoney(netWorth, homeCurrency)}</p>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        {delta === null
          ? "This is your first Check-in — nothing to compare yet."
          : delta === 0
            ? "No change since your last Check-in."
            : `${delta > 0 ? "+" : "−"}${formatMoney(Math.abs(delta), homeCurrency)} since your last Check-in`}
      </p>
      <button type="button" onClick={onDone} className="rounded-md border border-hairline px-3 py-1.5 text-sm">
        Done
      </button>
    </div>
  );
}
