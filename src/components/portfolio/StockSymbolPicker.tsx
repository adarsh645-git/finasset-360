"use client";

import { useEffect, useId, useRef, useState } from "react";

export type StockSymbolMatch = {
  symbol: string;
  name: string;
  type: string;
  sector: string | null;
};

/** The type-ahead stock/ETF picker (ticket 18) shared by AddHoldingRow and
 * HoldingDetailPanel's "Market symbol" field — queries the locally-cached
 * `stock_symbol` table per keystroke (no external call in the request
 * path; a fresh request cancels the previous one via AbortController so a
 * slow early response can't clobber a later one). Selecting a suggestion
 * hands the caller its Sector immediately if already cached, and again
 * once resolved if it wasn't — the lazy, once-per-symbol Finnhub lookup
 * (ticket 18) happens here so both call sites get it for free. Typing
 * without ever selecting a suggestion is unaffected: it's still just a
 * plain text field, so a freeform, unmatched symbol keeps working exactly
 * as before. */
export function StockSymbolPicker({
  value,
  onChangeText,
  onSelect,
  disabled,
  placeholder,
  className,
  autoFocus,
}: {
  value: string;
  onChangeText: (text: string) => void;
  onSelect: (match: { symbol: string; name: string; sector: string | null }) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  const [suggestions, setSuggestions] = useState<StockSymbolMatch[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const listboxId = useId();

  useEffect(() => {
    const query = value.trim();
    if (!isOpen || query.length === 0) {
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    fetch(`/api/stock-symbols?q=${encodeURIComponent(query)}`, { signal: controller.signal })
      .then((response) => (response.ok ? (response.json() as Promise<StockSymbolMatch[]>) : []))
      .then(setSuggestions)
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setSuggestions([]);
      });

    return () => controller.abort();
  }, [value, isOpen]);

  const visibleSuggestions = isOpen && value.trim().length > 0 ? suggestions : [];

  async function handleSelect(match: StockSymbolMatch) {
    setIsOpen(false);
    setSuggestions([]);
    onChangeText(match.symbol);
    onSelect({ symbol: match.symbol, name: match.name, sector: match.sector });

    if (match.sector !== null) return;

    try {
      const response = await fetch(`/api/stock-symbols/${encodeURIComponent(match.symbol)}/sector`);
      if (!response.ok) return;
      const resolved = (await response.json()) as { sector: string | null };
      onSelect({ symbol: match.symbol, name: match.name, sector: resolved.sector });
    } catch {
      // Sector stays unset — a display-only annotation, not worth
      // surfacing as a form error.
    }
  }

  return (
    <div className="relative w-full">
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => {
          onChangeText(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        placeholder={placeholder}
        disabled={disabled}
        role="combobox"
        aria-expanded={visibleSuggestions.length > 0}
        aria-controls={listboxId}
        aria-autocomplete="list"
        autoComplete="off"
        className={className}
      />
      {visibleSuggestions.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border border-hairline bg-background shadow-md"
        >
          {visibleSuggestions.map((match) => (
            <li key={match.symbol} role="option" aria-selected={false}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(match)}
                className="flex min-h-11 w-full flex-col justify-center gap-0.5 px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <span className="flex items-baseline gap-2">
                  <span className="font-medium">{match.symbol}</span>
                  <span className="truncate text-zinc-500 dark:text-zinc-400">{match.name}</span>
                </span>
                {match.sector && (
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">{match.sector}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
