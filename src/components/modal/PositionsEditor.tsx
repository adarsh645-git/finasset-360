"use client";

import { useEffect, useReducer, useRef, type KeyboardEvent } from "react";
import { SECTORS } from "@/lib/market-data/sector";
import type { CountryCode } from "@/lib/read-model/types";
import {
  editorFromRows,
  entryKey,
  formPatch,
  lookupWanted,
  positionsReducer,
  preview,
  rowLine,
  rowValue,
  shortTicker,
  showManual,
  total,
  type EntryField,
  type Lookup,
  type PositionRow,
} from "@/lib/views/positions-editor";

const INPUT =
  "h-10 w-full min-w-0 rounded-lg border border-line bg-bg px-3 text-[16px] text-ink outline-none focus:border-ink3 sm:text-[14px]";

const LOOKUP_DELAY_MS = 300;

type Patch = ReturnType<typeof formPatch>;

// The Stocks positions editor (design.md D7): all rules are in
// views/positions-editor.ts; this renders the state, runs the debounced
// lookup and reports the list and any unadded ticker to the form.
export function PositionsEditor({
  country,
  rows,
  today,
  onChange,
  setError,
}: {
  country: CountryCode;
  rows: PositionRow[];
  today: string;
  onChange: (patch: Patch) => void;
  setError: (error: string | null) => void;
}) {
  const [state, dispatch] = useReducer(positionsReducer, undefined, () => editorFromRows(country, rows));
  const onChangeRef = useRef(onChange);
  const setErrorRef = useRef(setError);
  useEffect(() => {
    onChangeRef.current = onChange;
    setErrorRef.current = setError;
  });

  useEffect(() => {
    onChangeRef.current(formPatch(state));
    // The form needs only the list and the typed ticker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.positions, state.entry.ticker]);

  useEffect(() => {
    setErrorRef.current(state.error);
  }, [state.error]);

  const wanted = lookupWanted(state);
  const key = entryKey(state);
  useEffect(() => {
    if (!wanted) return;
    let current = true;
    const timer = setTimeout(async () => {
      let result: Lookup;
      try {
        const response = await fetch(`/api/tickers/lookup?ticker=${encodeURIComponent(key)}&country=${country}`);
        if (!response.ok) throw new Error("lookup failed");
        result = (await response.json()) as Lookup;
      } catch {
        // No answer: fall back to the Hand Price path rather than blocking the User.
        result = { known: false, ticker: key, name: null, exchange: null };
      }
      if (current) dispatch({ type: "lookupResolved", key, result });
    }, LOOKUP_DELAY_MS);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [wanted, key, country]);

  const field = (name: EntryField) => ({
    value: state.entry[name],
    onChange: (event: { target: { value: string } }) => dispatch({ type: "field", name, value: event.target.value }),
    onKeyDown,
  });
  function onKeyDown(event: KeyboardEvent) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    dispatch({ type: "add" });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-medium text-ink2">Positions</span>
        <span className="text-[13px] tabular-nums text-ink2">{total(state)}</span>
      </div>

      {state.positions.length > 0 && (
        <ul className="flex flex-col divide-y divide-line rounded-lg border border-line">
          {state.positions.map((row) => (
            <li key={row.ticker} className="flex items-center gap-3 px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-medium text-ink">
                  {shortTicker(row.ticker)}
                  {row.name && row.name !== row.ticker && <span className="ml-2 font-normal text-ink3">{row.name}</span>}
                </div>
                <div className="text-[12.5px] text-ink3">{rowLine(row, today, country)}</div>
              </div>
              <span className="text-[14px] tabular-nums text-ink">{rowValue(row, country)}</span>
              <button
                type="button"
                aria-label={`Remove ${shortTicker(row.ticker)}`}
                onClick={() => dispatch({ type: "remove", ticker: row.ticker })}
                className="h-8 w-8 rounded-full text-ink3 hover:bg-hover"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2 rounded-lg border border-line p-3">
        <div className="grid grid-cols-[1fr_1fr_1fr] gap-2">
          <input
            aria-label="Ticker"
            placeholder="Ticker"
            autoComplete="off"
            autoCapitalize="characters"
            value={state.entry.ticker}
            onChange={(event) => dispatch({ type: "type", value: event.target.value })}
            onKeyDown={onKeyDown}
            className={INPUT}
          />
          <input aria-label="Shares" placeholder="Shares" inputMode="decimal" autoComplete="off" {...field("shares")} className={INPUT} />
          <input aria-label="Avg cost" placeholder="Avg cost" inputMode="decimal" autoComplete="off" {...field("avgCost")} className={INPUT} />
        </div>
        <p className="text-[12.5px] text-ink3">{preview(state)}</p>

        {showManual(state) && (
          <div className="grid grid-cols-2 gap-2">
            <input aria-label="Current price" placeholder="Current price" inputMode="decimal" autoComplete="off" {...field("price")} className={INPUT} />
            <select aria-label="Sector" {...field("sector")} className={INPUT}>
              {SECTORS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <input aria-label="Name" placeholder="Name" autoComplete="off" {...field("name")} className={`${INPUT} col-span-2`} />
          </div>
        )}

        <button
          type="button"
          onClick={() => dispatch({ type: "add" })}
          className="h-10 self-start rounded-lg border border-line bg-panel px-4 text-[13.5px] text-ink hover:bg-hover"
        >
          Add position
        </button>
      </div>

      <p className="text-[12px] text-ink3">
        Price, name and Sector are looked up from the ticker. Tickers without market data take the price you enter.
      </p>
    </div>
  );
}
