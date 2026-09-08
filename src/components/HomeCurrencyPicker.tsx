"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ISO_4217_CODES } from "@/lib/currency/iso4217";

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
      <select
        id="home-currency"
        value={value}
        disabled={isSaving}
        onChange={(e) => handleChange(e.target.value)}
        className="w-40 rounded-md border border-zinc-300 bg-transparent px-2 py-1.5 text-sm disabled:opacity-60 dark:border-zinc-700"
      >
        {ISO_4217_CODES.map((code) => (
          <option key={code} value={code}>
            {code}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
