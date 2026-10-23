"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ModalFormProps } from "@/components/modal/ModalHost";
import { COUNTRIES, prefixFor } from "@/lib/views/holding-entry";
import {
  LOAN_COPY,
  initialLoan,
  initialLoanEdit,
  linkOptions,
  saveLoan,
  type LoanForm as LoanFormState,
} from "@/lib/views/loan-form";

const INPUT =
  "h-10 w-full min-w-0 rounded-lg border border-line bg-bg px-3 text-[16px] text-ink outline-none focus:border-ink3 sm:text-[14px]";

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-[13px] font-medium text-ink2">
      {label}
      {children}
      {hint && <span className="text-[12.5px] font-normal text-ink3">{hint}</span>}
    </label>
  );
}

function Amount({
  label,
  prefix,
  value,
  hint,
  onChange,
}: {
  label: string;
  prefix: string;
  value: string;
  hint?: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label} hint={hint}>
      <span className="flex h-10 items-center gap-2 rounded-lg border border-line bg-bg px-3">
        <span className="text-ink3">{prefix}</span>
        <input
          inputMode="decimal"
          autoComplete="off"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent text-[16px] tabular-nums outline-none sm:text-[14px]"
        />
      </span>
    </Field>
  );
}

// Add and edit share this form; the rules live in views/loan-form.ts (design.md D3, D13, D14).
export function LoanForm({ match, data, formId, setBusy, setError, onSaved, carry, setCarry }: ModalFormProps) {
  const loan = match.liability ?? null;
  const [form, setForm] = useState<LoanFormState>(() => (loan ? initialLoanEdit(loan) : initialLoan(data.today, carry)));
  const sending = useRef(false);
  const set = (patch: Partial<LoanFormState>) => setForm((f) => ({ ...f, ...patch }));
  const prefix = prefixFor(form.country);

  useEffect(() => {
    setCarry?.({ name: form.name, country: form.country });
  }, [form.name, form.country, setCarry]);

  return (
    <form
      id={formId}
      className="flex flex-col gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (sending.current) return;
        sending.current = true;
        setError(null);
        setBusy(true);
        const saved = await saveLoan(fetch, form, loan?.id, data.today);
        setBusy(false);
        sending.current = false;
        if (saved.ok) onSaved(saved.result);
        else setError(saved.error);
      }}
    >
      <Field label="Loan name">
        <input
          autoComplete="off"
          value={form.name}
          placeholder="e.g. Auto loan · Honda Financial"
          onChange={(event) => set({ name: event.target.value })}
          className={INPUT}
        />
      </Field>

      <div className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-ink2">Held in</span>
        <div role="group" aria-label="Held in" className="flex flex-wrap gap-2">
          {COUNTRIES.map((c) => (
            <button
              key={c.code}
              type="button"
              disabled={loan !== null}
              onClick={() => set({ country: c.code })}
              aria-pressed={form.country === c.code}
              className={`h-10 rounded-full border px-3.5 text-[13.5px] disabled:opacity-60 ${
                form.country === c.code ? "border-ink bg-ink text-bg" : "border-line bg-panel text-ink2 hover:bg-hover"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <Amount label="Current balance" prefix={prefix} value={form.balance} onChange={(balance) => set({ balance })} />
      <Amount
        label="Original principal (optional)"
        prefix={prefix}
        value={form.principal}
        onChange={(principal) => set({ principal })}
      />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Interest rate (% APR)">
          <input
            inputMode="decimal"
            autoComplete="off"
            value={form.apr}
            onChange={(event) => set({ apr: event.target.value })}
            className={INPUT}
          />
        </Field>
        <Field label="Term (years, optional)">
          <input
            inputMode="decimal"
            autoComplete="off"
            value={form.term}
            onChange={(event) => set({ term: event.target.value })}
            className={INPUT}
          />
        </Field>
      </div>

      <Amount
        label="Monthly payment / EMI"
        prefix={prefix}
        value={form.payment}
        hint={LOAN_COPY.paymentHint}
        onChange={(payment) => set({ payment })}
      />

      <Field label="Borrowed in">
        <input
          type="month"
          value={form.borrowedIn}
          max={data.today.slice(0, 7)}
          onChange={(event) => set({ borrowedIn: event.target.value })}
          className={INPUT}
        />
      </Field>

      <Field label="Linked asset (optional)">
        <select value={form.linkedId} onChange={(event) => set({ linkedId: event.target.value })} className={INPUT}>
          {linkOptions(data, loan?.id).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>

      <label className="flex items-center gap-2 text-[13.5px] text-ink2">
        <input
          type="checkbox"
          checked={form.revolving}
          onChange={(event) => set({ revolving: event.target.checked })}
          className="h-4 w-4"
        />
        Credit card (revolving)
      </label>

      <p className="text-[12.5px] text-ink3">{LOAN_COPY.linkHint}</p>
    </form>
  );
}
