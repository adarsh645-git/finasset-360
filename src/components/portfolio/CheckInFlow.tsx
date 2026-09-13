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
// (Enter/L/Esc); ticket 15's narrow-viewport tap targets call the exact same
// `submitDraft`/`acceptLiveEstimate`/`onExit` paths inside CheckInStep below,
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

  // Enter's behaviour branches on whether the draft differs from the
  // pre-filled figure (user story 42): unchanged (or left blank, when
  // there's nothing to compare against anyway) advances with no network
  // call at all, so confirming can never write a duplicate same-value
  // Valuation under today's date.
  function submitDraft() {
    const trimmed = draftAmount.trim();
    if (trimmed === "") {
      onAdvance();
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      setError("Enter a valid number.");
      return;
    }
    if (latestValuation && parsed === latestValuation.amount) {
      onAdvance();
      return;
    }
    void recordAndAdvance(parsed);
  }

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
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
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
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Live Estimate {formatMoney(liveEstimate.amount, liveEstimate.currency)} — press L to accept
          </p>
        )}

        {error && <p className="text-xs font-medium">{error}</p>}

        <p className="text-xs text-zinc-400 dark:text-zinc-600">
          Enter to confirm{liveEstimate ? " · L for Live Estimate" : ""} · Esc to leave
        </p>
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
