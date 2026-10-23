"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { send } from "@/lib/views/holding-writes";
import {
  planSave,
  RESET_PATCH,
  type AssumptionField,
  type Assumptions,
  type Footer,
} from "@/lib/views/projection-assumptions";

const FAILED = "Couldn't save. Try again.";

// One input. A commit (blur, or Enter which blurs) sends a one-field patch, then
// refreshes the page; it remounts on a new saved value, so a failed save keeps its text.
function Field({ field }: { field: AssumptionField }) {
  const router = useRouter();
  const [text, setText] = useState(field.value);
  const [error, setError] = useState<string | null>(null);

  async function commit() {
    const plan = planSave(field, text, field.saved);
    if (plan.kind === "none") return setError(null);
    if (plan.kind === "error") return setError(plan.message);
    setError(null);
    const saved = await send(fetch, "PATCH", "/api/projection-assumptions", plan.patch);
    if (saved.ok) router.refresh();
    else setError(saved.error === "Could not save." || !saved.error ? FAILED : saved.error);
  }

  return (
    <label className="flex min-w-0 flex-col gap-1 text-[12.5px] text-ink2">
      {field.label}
      <span
        className={`flex h-10 items-center gap-1.5 rounded-lg border bg-bg px-3 ${error ? "border-neg" : "border-line"}`}
      >
        {field.unit !== "%" && field.unit !== "yrs" && <span className="text-ink3">{field.unit}</span>}
        <input
          aria-label={field.label}
          aria-invalid={error ? true : undefined}
          inputMode="decimal"
          autoComplete="off"
          value={text}
          placeholder={field.placeholder}
          onChange={(event) => setText(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
          className="min-w-0 flex-1 bg-transparent text-[16px] tabular-nums text-ink outline-none sm:text-[14px]"
        />
        {field.unit === "%" && <span className="text-ink3">%/yr</span>}
        {field.unit === "yrs" && <span className="text-ink3">yrs</span>}
      </span>
      {error ? (
        <span role="alert" className="text-[11.5px] text-neg">
          {error}
        </span>
      ) : (
        field.hint && <span className="text-[11.5px] text-ink3">{field.hint}</span>
      )}
    </label>
  );
}

// One request blanks every field; the page refreshes to show the defaults.
function ResetDefaults() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  async function reset() {
    setError(null);
    const saved = await send(fetch, "PATCH", "/api/projection-assumptions", RESET_PATCH);
    if (saved.ok) router.refresh();
    else setError(FAILED);
  }
  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={reset}
        className="h-10 rounded-lg border border-line2 px-3 text-[12.5px] text-ink2 hover:bg-hover sm:h-9"
      >
        Reset defaults
      </button>
      {error && (
        <span role="alert" className="text-[11.5px] text-neg">
          {error}
        </span>
      )}
    </div>
  );
}

function FooterRow({ footer }: { footer: Footer }) {
  const stats = [
    [`Net worth by ${footer.month}`, footer.nominal],
    ["In today's dollars", footer.real],
    ["Lost to inflation", footer.lost],
  ];
  return (
    <footer className="flex flex-col gap-2 border-t border-line pt-4">
      <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-ink3">{footer.label}</h3>
      <dl className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]">
        {stats.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-0.5">
            <dt className="text-[12.5px] text-ink2">{label}</dt>
            <dd className="text-[18px] font-medium tabular-nums text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </footer>
  );
}

const GRID = "grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]";

export function AssumptionsCard({ assumptions }: { assumptions: Assumptions }) {
  const { tabs, tab, fields, shared, horizon, footer } = assumptions;
  return (
    <section className="flex flex-col gap-4 rounded-[14px] border border-line bg-panel p-5 shadow-[var(--shadow)]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-[15px] font-semibold">Projection assumptions</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-32">
            <Field key={`${horizon.label}-${horizon.value}`} field={horizon} />
          </div>
          <ResetDefaults />
        </div>
      </div>
      <nav aria-label="Assumptions country" className="flex w-fit gap-0.5 rounded-[10px] bg-hover p-[3px]">
        {tabs.map((t) => (
          <Link
            key={t.value}
            href={t.href}
            replace
            scroll={false}
            aria-current={t.selected ? "true" : undefined}
            className={`flex h-10 items-center rounded-[7px] px-[11px] text-[12.5px] sm:h-9 ${
              t.selected ? "bg-panel text-ink shadow-sm" : "text-ink2"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <div className={GRID}>
        {fields.map((f) => (
          <Field key={`${tab}-${f.label}-${f.value}`} field={f} />
        ))}
      </div>
      <h3 className="font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-ink3">
        Shared across countries
      </h3>
      <div className={GRID}>
        {shared.map((f) => (
          <Field key={`${f.label}-${f.value}`} field={f} />
        ))}
      </div>
      <FooterRow footer={footer} />
    </section>
  );
}
