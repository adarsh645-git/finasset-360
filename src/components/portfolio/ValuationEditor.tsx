"use client";

import { useRef, useState } from "react";
import { formatMoney } from "@/lib/currency/format";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Only the fields this editor actually reads — both HoldingValuation and
 * LiabilityValuation satisfy this structurally, since recording a
 * Liability's balance works identically to recording a Holding's value
 * (ticket 05). */
type RecordedValuation = { amount: number; recorded_at: string };

// Click-to-edit recording of a Holding's or Liability's Valuation — the
// value itself is the control (user stories 22–24, 28): click it, type a
// number, Enter or blur records a Valuation dated today. The "as of" line
// beneath doubles as the backdating affordance — click it to swap in a date
// picker before typing the amount — so the common case (today, no
// backdating) never shows a date field at all.
export function ValuationEditor({
  currency,
  latestValuation,
  onRecord,
}: {
  currency: string;
  latestValuation: RecordedValuation | null;
  onRecord: (amount: number, recordedAt: string) => Promise<string | null>;
}) {
  const today = todayIsoDate();

  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [draftAmount, setDraftAmount] = useState("");
  const [recordedAt, setRecordedAt] = useState(today);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Enter commits by blurring the input (one commit path for both — see
  // handleKeyDown) — Escape must cancel instead, so this flag tells the
  // blur handler "this blur was a cancel, not a commit" for the one render
  // where both could otherwise fire.
  const skipBlurRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  function startEditing() {
    skipBlurRef.current = false;
    setDraftAmount(latestValuation ? String(latestValuation.amount) : "");
    setError(null);
    setIsEditingAmount(true);
  }

  function cancelEditing() {
    skipBlurRef.current = true;
    setIsEditingAmount(false);
    setRecordedAt(today);
  }

  async function commit() {
    const parsed = Number(draftAmount);
    if (draftAmount.trim() === "" || !Number.isFinite(parsed)) {
      cancelEditing();
      return;
    }
    setIsSaving(true);
    setError(null);
    const failure = await onRecord(parsed, recordedAt);
    setIsSaving(false);
    if (failure) {
      setError(failure);
      return;
    }
    setIsEditingAmount(false);
    setRecordedAt(today);
  }

  function handleBlur(event: React.FocusEvent<HTMLInputElement>) {
    if (skipBlurRef.current) {
      skipBlurRef.current = false;
      return;
    }
    // Focus moving to the backdate toggle is still "within this editor",
    // not the user stepping away from it — committing here would record
    // whatever's typed so far under today's date, a beat before the User
    // ever reaches the date picker they just clicked.
    if (event.relatedTarget instanceof Node && containerRef.current?.contains(event.relatedTarget)) {
      return;
    }
    void commit();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancelEditing();
    }
  }

  const asOfLabel =
    recordedAt !== today
      ? `Recording for ${recordedAt}`
      : latestValuation
        ? `as of ${latestValuation.recorded_at === today ? "today" : latestValuation.recorded_at}`
        : "No Valuation yet";

  return (
    <div ref={containerRef} className="flex flex-col gap-1">
      {isEditingAmount ? (
        <input
          autoFocus
          type="number"
          inputMode="decimal"
          step="any"
          value={draftAmount}
          disabled={isSaving}
          onChange={(e) => setDraftAmount(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          onFocus={(e) => e.currentTarget.select()}
          className="w-48 rounded-md border border-hairline bg-transparent px-2 py-1 text-2xl font-semibold tracking-tight"
        />
      ) : (
        <button
          type="button"
          onClick={startEditing}
          className="w-fit text-2xl font-semibold tracking-tight hover:opacity-70"
        >
          {latestValuation ? formatMoney(latestValuation.amount, currency) : "Click to record a value"}
        </button>
      )}

      {isEditingDate ? (
        <input
          autoFocus
          type="date"
          max={today}
          value={recordedAt}
          onChange={(e) => setRecordedAt(e.target.value)}
          onBlur={() => setIsEditingDate(false)}
          className="w-fit rounded-md border border-hairline bg-transparent px-1.5 py-0.5 text-xs"
        />
      ) : (
        <button
          type="button"
          onClick={() => setIsEditingDate(true)}
          className="w-fit text-left text-xs text-zinc-500 hover:text-foreground dark:text-zinc-400"
        >
          {asOfLabel} ▾
        </button>
      )}

      {error && <p className="text-xs font-medium">{error}</p>}
    </div>
  );
}
