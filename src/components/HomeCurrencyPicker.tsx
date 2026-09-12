"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CurrencySelect } from "@/components/CurrencySelect";

// A plain <select> against the full ISO 4217 list, per user story 3 ("choose
// my home/display currency") and the "no setup wizard" requirement in
// ticket 01 — this is reachable any time from the dashboard, not a blocking
// step before the Portfolio exists (the Portfolio already exists, defaulted
// to USD, by the time this renders).
export function HomeCurrencyPicker({ currentCurrency }: { currentCurrency: string }) {
  const router = useRouter();
  const [value, setValue] = useState(currentCurrency);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(nextCurrency: string) {
    setValue(nextCurrency);
    setError(null);
    setIsSaving(true);
    try {
      const response = await fetch("/api/portfolio", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ home_currency: nextCurrency }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Could not update home currency.");
      }
      router.refresh();
    } catch (err) {
      setValue(currentCurrency);
      setError(err instanceof Error ? err.message : "Could not update home currency.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor="home-currency" className="text-sm text-zinc-600 dark:text-zinc-400">
        Home currency
      </label>
      <CurrencySelect id="home-currency" value={value} onChange={handleChange} disabled={isSaving} />
      {error && <p className="text-sm font-medium">{error}</p>}
    </div>
  );
}
