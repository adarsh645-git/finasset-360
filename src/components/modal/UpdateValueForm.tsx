"use client";

import { useState } from "react";
import { saveValue, updateValueView } from "@/lib/views/holding-writes";
import type { ModalFormProps } from "@/components/modal/ModalHost";

// Update value: one large pre-filled input. Saving always posts, so an
// unchanged value still logs today's Valuation (HE-22, HE-23).
export function UpdateValueForm({ match, data, formId, setBusy, setError, onSaved, confirmPrices }: ModalFormProps) {
  const holding = match.holding!;
  const view = updateValueView(holding, data.today);
  const [raw, setRaw] = useState(view.initial);

  return (
    <form
      id={formId}
      className="flex flex-col gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        setBusy(true);
        const saved = await saveValue(fetch, holding.id, raw, { confirmPrices });
        setBusy(false);
        if (saved.ok) onSaved(saved.result);
        else setError(saved.error);
      }}
    >
      <label className="flex flex-col gap-2 text-[13px] text-ink2">
        <span className="font-medium text-ink">{holding.name}</span>
        <span className="flex h-12 items-center gap-2 rounded-lg border border-line bg-bg px-3">
          <span className="text-[20px] text-ink3">{view.prefix}</span>
          <input
            inputMode="decimal"
            autoComplete="off"
            aria-label="Current value"
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
