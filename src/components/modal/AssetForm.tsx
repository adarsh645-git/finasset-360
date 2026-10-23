"use client";

import { useRef, useState, type ReactNode } from "react";
import type { ModalFormProps } from "@/components/modal/ModalHost";
import { PositionsEditor } from "@/components/modal/PositionsEditor";
import {
  CLASS_LABEL,
  CLASS_ORDER,
  COUNTRIES,
  METAL_UNITS,
  PROPERTY_TYPES,
  formFor,
  initialAdd,
  initialEdit,
  prefixFor,
  saveHolding,
  switchClass,
  type EntryForm,
} from "@/lib/views/holding-entry";

const INPUT =
  "h-10 w-full min-w-0 rounded-lg border border-line bg-bg px-3 text-[16px] text-ink outline-none focus:border-ink3 sm:text-[14px]";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-[13px] font-medium text-ink2">
      {label}
      {children}
    </label>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`h-10 rounded-full border px-3.5 text-[13.5px] ${
        on ? "border-ink bg-ink text-bg" : "border-line bg-panel text-ink2 hover:bg-hover"
      }`}
    >
      {children}
    </button>
  );
}

function Amount({ label, prefix, value, onChange }: { label: string; prefix: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
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

// Add (class chips, Held in) and edit (pre-filled, class and Country fixed)
// share this form; all rules live in views/holding-entry.ts (design.md D3, D5).
export function AssetForm({ match, data, formId, setBusy, setError, onSaved, confirmPrices }: ModalFormProps) {
  const holding = match.holding;
  const [form, setForm] = useState<EntryForm>(() => (holding ? initialEdit(holding) : initialAdd(match.classId ?? "stocks")));
  const sending = useRef(false);
  const set = (patch: Partial<EntryForm>) => setForm((f) => ({ ...f, ...patch }));
  const { nameLabel, placeholder } = formFor(form.classId);
  const prefix = prefixFor(form.country);

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
        const saved = await saveHolding(fetch, form, holding?.id, { confirmPrices });
        setBusy(false);
        sending.current = false;
        if (saved.ok) onSaved(saved.result);
        else setError(saved.error);
      }}
    >
      {!holding && (
        <div role="group" aria-label="Asset class" className="flex flex-wrap gap-2">
          {CLASS_ORDER.map((id) => (
            <Chip key={id} on={form.classId === id} onClick={() => setForm((f) => switchClass(f, id))}>
              {CLASS_LABEL[id]}
            </Chip>
          ))}
        </div>
      )}

      <Field label={nameLabel}>
        <input
          autoComplete="off"
          value={form.name}
          placeholder={placeholder}
          onChange={(event) => set({ name: event.target.value })}
          className={INPUT}
        />
      </Field>

      {!holding && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium text-ink2">Held in</span>
          <div role="group" aria-label="Held in" className="flex flex-wrap gap-2">
            {COUNTRIES.map((c) => (
              <Chip key={c.code} on={form.country === c.code} onClick={() => set({ country: c.code })}>
                {c.label}
              </Chip>
            ))}
          </div>
        </div>
      )}

      <Field label="Description (optional)">
        <input
          autoComplete="off"
          value={form.description}
          onChange={(event) => set({ description: event.target.value })}
          className={INPUT}
        />
      </Field>

      {form.classId === "realestate" && (
        <>
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-ink2">Property type</span>
            <div role="group" aria-label="Property type" className="flex flex-wrap gap-2">
              {PROPERTY_TYPES.map((t) => (
                <Chip key={t} on={form.propertyType === t} onClick={() => set({ propertyType: t })}>
                  {t}
                </Chip>
              ))}
            </div>
          </div>
          <Field label="City / location">
            <input autoComplete="off" value={form.city} onChange={(event) => set({ city: event.target.value })} className={INPUT} />
          </Field>
        </>
      )}

      {form.classId === "stocks" ? (
        <PositionsEditor
          key={form.country}
          country={form.country}
          rows={form.positions}
          today={data.today}
          onChange={set}
          setError={setError}
        />
      ) : (
        <>
          <Amount label="Current value" prefix={prefix} value={form.value} onChange={(value) => set({ value })} />
          <Amount label="Cost basis (optional)" prefix={prefix} value={form.costBasis} onChange={(costBasis) => set({ costBasis })} />
        </>
      )}

      {form.classId === "metals" && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantity">
            <input
              inputMode="decimal"
              autoComplete="off"
              value={form.quantity}
              onChange={(event) => set({ quantity: event.target.value })}
              className={INPUT}
            />
          </Field>
          <Field label="Unit">
            <select
              value={form.unit}
              onChange={(event) => set({ unit: event.target.value as EntryForm["unit"] })}
              className={INPUT}
            >
              {METAL_UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}
    </form>
  );
}
