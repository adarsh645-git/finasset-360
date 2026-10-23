import { staleness } from "@/lib/calc";
import { native } from "@/lib/format";
import type { CountryCode, PositionData } from "@/lib/read-model/types";
import { normalizeTicker } from "@/lib/market-data/ticker";
import { ageCue } from "@/lib/views/age-cue";
import { parseAmount } from "@/lib/views/holding-writes";
import { calcCountry } from "@/lib/views/shell";

// The Stocks positions editor as a pure reducer plus selectors (design.md D7).
// Everything HE-13...HE-21 checks is an output of this file; the component
// only dispatches and renders.

/** What `GET /api/tickers/lookup` answers. */
export type Lookup =
  | {
      known: true;
      ticker: string;
      name: string;
      sector: string;
      exchange: string | null;
      price: { amount: number; currency: string } | null;
    }
  | { known: false; ticker: string; name: string | null; exchange: string | null };

/** One listed Position. `hand` rows carry their own price, Sector and name to the route. */
export type PositionRow = {
  /** The stored key, e.g. `INFY.NS`. */
  ticker: string;
  shares: number;
  avgCost: number;
  price: number;
  hand: boolean;
  /** A Hand Price's date; null for a price entered in this session (today). */
  priceAsOf: string | null;
  sector: string;
  name: string;
};

export type Entry = { ticker: string; shares: string; avgCost: string; price: string; sector: string; name: string };
export type EntryField = Exclude<keyof Entry, "ticker">;

export type EditorState = {
  country: CountryCode;
  positions: PositionRow[];
  entry: Entry;
  /** The latest lookup answer, for the key it was asked about. */
  lookup: { key: string; result: Lookup } | null;
  /** Add was pressed while the lookup was still out. */
  addQueued: boolean;
  error: string | null;
};

export type EditorAction =
  | { type: "type"; value: string }
  | { type: "field"; name: EntryField; value: string }
  | { type: "lookupResolved"; key: string; result: Lookup }
  | { type: "add" }
  | { type: "remove"; ticker: string };

const DEFAULT_SECTOR = "Other";
const EMPTY_ENTRY: Entry = { ticker: "", shares: "", avgCost: "", price: "", sector: DEFAULT_SECTOR, name: "" };

/** Upper-cased and trimmed; India gets `.NS` when there is no `.`. Empty stays empty. */
export const tickerKey = (raw: string, country: CountryCode): string =>
  raw.trim() === "" ? "" : normalizeTicker(raw, country);

/** The display form: no `.NS` / `.BO`. */
export const shortTicker = (ticker: string): string => ticker.replace(/\.(NS|BO)$/i, "");

const toRow = (p: PositionData): PositionRow => ({
  ticker: p.ticker,
  shares: p.shares,
  avgCost: p.avgCost,
  price: p.price,
  hand: p.priceSource === "hand",
  priceAsOf: p.priceAsOf,
  sector: p.sector,
  name: p.name,
});

export const editorFromRows = (country: CountryCode, positions: PositionRow[]): EditorState => ({
  country,
  positions,
  entry: EMPTY_ENTRY,
  lookup: null,
  addQueued: false,
  error: null,
});

export const initialEditor = (country: CountryCode, positions: readonly PositionData[]): EditorState =>
  editorFromRows(country, positions.map(toRow));

export const entryKey = (state: EditorState): string => tickerKey(state.entry.ticker, state.country);

const listedRow = (state: EditorState, key: string) => state.positions.find((r) => r.ticker === key);

type Info = { kind: "none" } | { kind: "pending" } | { kind: "market"; name: string; sector: string; price: number; exchange: string | null } | { kind: "manual"; name: string | null };

/** What is known about the typed ticker: looked up, else the listed row's own kind, else pending. */
function info(state: EditorState): Info {
  const key = entryKey(state);
  if (!key) return { kind: "none" };
  if (state.lookup?.key === key) {
    const r = state.lookup.result;
    if (r.known && r.price) return { kind: "market", name: r.name, sector: r.sector, price: r.price.amount, exchange: r.exchange };
    return { kind: "manual", name: r.name };
  }
  const row = listedRow(state, key);
  if (row?.hand) return { kind: "manual", name: row.name };
  return { kind: "pending" };
}

/** True while the typed ticker has no answer yet (the component starts the debounced lookup). */
export const lookupWanted = (state: EditorState): boolean => {
  const key = entryKey(state);
  return key !== "" && state.lookup?.key !== key;
};

export const showManual = (state: EditorState): boolean => info(state).kind === "manual";

const HINTS: Record<CountryCode, string> = {
  US: "Try AAPL, GOOGL, META, V, CAT, TSLA",
  IN: "Try RELIANCE, INFY, TCS, ITC, LT",
};

/** The line under the ticker field (HE-13). */
export function preview(state: EditorState): string {
  const i = info(state);
  const shown = shortTicker(entryKey(state));
  const country = calcCountry(state.country);
  switch (i.kind) {
    case "none":
      return HINTS[state.country];
    case "pending":
      return `Looking up ${shown}…`;
    case "market":
      return [i.name, i.sector, native(i.price, country), i.exchange].filter(Boolean).join(" · ");
    case "manual":
      return i.name
        ? `${i.name} · no market price. Enter its price and Sector.`
        : `No market price for ${shown}. Enter its price and Sector.`;
  }
}

const withoutRow = (rows: PositionRow[], key: string) => rows.filter((r) => r.ticker !== key);

function tryAdd(state: EditorState): EditorState {
  const key = entryKey(state);
  const fail = (error: string): EditorState => ({ ...state, addQueued: false, error });
  if (!key) return fail("Enter a ticker");
  const shares = parseAmount(state.entry.shares);
  if (shares === null || shares <= 0) return fail("Enter number of shares");
  const i = info(state);
  if (i.kind === "pending") return { ...state, addQueued: true, error: null };
  if (i.kind === "none") return fail("Enter a ticker");

  const shown = shortTicker(key);
  let row: PositionRow;
  let price: number;
  if (i.kind === "market") {
    price = i.price;
    row = { ticker: key, shares, avgCost: price, price, hand: false, priceAsOf: null, sector: i.sector, name: i.name };
  } else {
    const typed = parseAmount(state.entry.price);
    if (typed === null || typed <= 0) return fail(`Enter a price for ${shown}`);
    price = typed;
    const existing = listedRow(state, key);
    row = {
      ticker: key,
      shares,
      avgCost: price,
      price,
      hand: true,
      // Only a changed price is re-dated.
      priceAsOf: existing?.hand && existing.price === price ? existing.priceAsOf : null,
      sector: state.entry.sector || DEFAULT_SECTOR,
      name: state.entry.name.trim(),
    };
  }
  if (state.entry.avgCost.trim() !== "") {
    const cost = parseAmount(state.entry.avgCost);
    if (cost === null || cost <= 0) return fail(`Enter an average cost above 0 for ${shown}`);
    row.avgCost = cost;
  }
  return { ...state, positions: [...withoutRow(state.positions, key), row], entry: EMPTY_ENTRY, addQueued: false, error: null };
}

export function positionsReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "type": {
      const next = tickerKey(action.value, state.country);
      const entry = { ...state.entry, ticker: action.value };
      if (next === entryKey(state)) return { ...state, entry, error: null };
      const row = listedRow(state, next);
      return {
        ...state,
        addQueued: false,
        error: null,
        entry: row
          ? {
              ticker: action.value,
              shares: String(row.shares),
              avgCost: String(row.avgCost),
              price: String(row.price),
              sector: row.sector,
              name: row.name,
            }
          : { ...EMPTY_ENTRY, ticker: action.value, shares: state.entry.shares, avgCost: state.entry.avgCost },
      };
    }
    case "field":
      return { ...state, entry: { ...state.entry, [action.name]: action.value }, error: null };
    case "lookupResolved": {
      if (action.key !== entryKey(state)) return state;
      let next: EditorState = { ...state, lookup: { key: action.key, result: action.result } };
      const r = action.result;
      const manual = !(r.known && r.price);
      // A listed row keeps the values the User saved; a new unknown ticker takes the looked-up name.
      if (manual && !listedRow(state, action.key)) next = { ...next, entry: { ...next.entry, name: r.name ?? "" } };
      return next.addQueued ? tryAdd(next) : next;
    }
    case "add":
      return tryAdd(state);
    case "remove":
      return { ...state, positions: withoutRow(state.positions, action.ticker), error: null };
  }
}

const asOfDate = (today: string) => new Date(`${today}T00:00:00Z`);

/** "⟨shares⟩ sh · avg ⟨avg⟩ · now ⟨price⟩ · ⟨Sector⟩", plus "· price N days old" for a stale Hand Price (HE-20, HE-21). */
export function rowLine(row: PositionRow, today?: string, country: CountryCode = "US"): string {
  const c = calcCountry(country);
  const base = `${row.shares} sh · avg ${native(row.avgCost, c)} · now ${native(row.price, c)} · ${row.sector}`;
  if (!today || !row.hand || !row.priceAsOf) return base;
  const { ageDays } = staleness({ kind: "stocks", positions: [{ handPriceDate: row.priceAsOf }] }, asOfDate(today));
  const cue = ageCue("position", ageDays);
  return cue ? `${base} · ${cue}` : base;
}

export const rowValue = (row: PositionRow, country: CountryCode = "US"): string =>
  native(row.shares * row.price, calcCountry(country));

export const total = (state: EditorState): string =>
  native(state.positions.reduce((sum, r) => sum + r.shares * r.price, 0), calcCountry(state.country));

/** What the form keeps of the editor: the list, its count, and a typed-but-unadded ticker (HE-08). */
export const formPatch = (state: EditorState) => ({
  positions: state.positions,
  positionCount: state.positions.length,
  pendingTicker: state.entry.ticker.trim(),
});

/** One Position as the route takes it; Hand Price, Sector and name only for tickers without market data (HE-25). */
export function toPositionBody(row: PositionRow): Record<string, unknown> {
  const body: Record<string, unknown> = { ticker: row.ticker, shares: row.shares, avg_cost: row.avgCost };
  if (row.hand) {
    body.hand_price = row.price;
    body.sector = row.sector;
    if (row.name) body.name = row.name;
  }
  return body;
}
