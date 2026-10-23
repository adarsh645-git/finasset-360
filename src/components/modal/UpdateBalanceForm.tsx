"use client";

import { useState } from "react";
import type { ModalFormProps } from "@/components/modal/ModalHost";
import { saveBalance, updateBalanceView } from "@/lib/views/loan-writes";

// Update balance: one large pre-filled input. Saving always posts, so an
// unchanged balance still logs today's Valuation (LE-08).
export function UpdateBalanceForm({ match, data, formId, setBusy, setError, onSaved }: ModalFormProps) {
  const loan = match.liability!;
  const view = updateBalanceView(loan, data.today);
  const [raw, setRaw] = useState(view.initial);

  return (
    <form
      id={formId}
      className="flex flex-col gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        setBusy(true);
        const saved = await saveBalance(fetch, loan.id, raw);
        setBusy(false);
        if (saved.ok) onSaved(saved.result);
        else setError(saved.error);
      }}
    >
      <label className="flex flex-col gap-2 text-[13px] text-ink2">
        <span className="font-medium text-ink">{view.label}</span>
        <span className="flex h-12 items-center gap-2 rounded-lg border border-line bg-bg px-3">
          <span className="text-[20px] text-ink3">{view.prefix}</span>
          <input
            inputMode="decimal"
            autoComplete="off"
            aria-label={view.label}
            value={raw}
            onChange={(event) => setRaw(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-[20px] font-medium tabular-nums outline-none"
          />
        </span>
      </label>
      <p className="text-[13px] text-ink2">{view.was}</p>
    </form>
  );
}
