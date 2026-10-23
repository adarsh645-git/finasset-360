import { netWorthOn } from "@/lib/calc";
import { signed, usd } from "@/lib/format";
import type { PortfolioData } from "@/lib/read-model/types";
import { fxRatesOf, usableItems } from "@/lib/views/fx";
import { historyItem } from "@/lib/views/shell";
import { buildStaleList, type StaleRow } from "@/lib/views/stale-list";

// The guided update pass (design.md D1-D9): a pure view-model over the live
// Stale list. The URL is the pass's only memory; nothing here is stored.

export type PassCurrent = { kind: StaleRow["kind"]; id: string };

/** The form a step opens; the ids are the modal host's own form ids. */
export type PassForm = "update-value" | "edit-positions" | "update-balance";

export type PassStepView = {
  form: PassForm;
  /** The item's name. */
  title: string;
  /** "i of N". */
  counter: string;
  nextHref: string;
  skipHref: string;
};

/** Today's Net Worth in whole dollars, as the Overview header values it. */
export function netWorthNow(data: PortfolioData): number {
  const rates = fxRatesOf(data);
  const held = usableItems(data.holdings, rates).map(historyItem);
  const owed = usableItems(data.liabilities, rates).map(historyItem);
  return Math.round(netWorthOn({ holdings: held, liabilities: owed }, rates, data.today, data.today));
}

const joinQuery = (base: string, query: string) => `${base}${base.includes("?") ? "&" : "?"}${query}`;

function stepQuery(row: PassCurrent | StaleRow, i: number, from: number | null): string {
  const target =
    row.kind === "liability"
      ? `modal=update&liability=${row.id}`
      : `modal=update&holding=${row.id}`;
  return `${target}&pass=${i}${from === null ? "" : `&from=${from}`}`;
}

const summaryQuery = (from: number | null) => `modal=pass-summary${from === null ? "" : `&from=${from}`}`;

/** The card's button: "Update all (N)", linking to step 1 on its first item; null when nothing is Stale. */
export function updateAllEntry(
  data: PortfolioData,
  today: string,
  base = "/",
  rows: StaleRow[] = buildStaleList(data, today),
): { label: string; href: string } | null {
  if (rows.length === 0) return null;
  return {
    label: `Update all (${rows.length})`,
    href: joinQuery(base, stepQuery(rows[0]!, 1, netWorthNow(data))),
  };
}

/** A `from` param: a whole number, else null. */
export function parseFrom(value: string | null): number | null {
  return value !== null && /^-?\d+$/.test(value) ? Number(value) : null;
}

/** `pass` (a positive integer) and `from` (a whole number) from the URL; null without a valid `pass`. */
export function parsePass(params: URLSearchParams): { i: number; from: number | null } | null {
  const pass = params.get("pass");
  if (pass === null || !/^[1-9]\d*$/.test(pass)) return null;
  return { i: Number(pass), from: parseFrom(params.get("from")) };
}

const FORMS: Record<"holding" | "stocks" | "liability", PassForm> = {
  holding: "update-value",
  stocks: "edit-positions",
  liability: "update-balance",
};

/**
 * One step's chrome, from the live list and the cursor rule (D4): next and skip
 * are the Stale item after the current one, or the summary; N counts the steps
 * taken plus the Stale items from the current one on.
 */
export function passStep(
  data: PortfolioData,
  { current, i, from }: { current: PassCurrent; i: number; from: number | null },
  today: string,
  base = "/",
): PassStepView {
  const list = buildStaleList(data, today);
  const c = list.findIndex((r) => r.kind === current.kind && r.id === current.id);
  const found = c >= 0;
  const total = found ? i - 1 + (list.length - c) : i + list.length;
  const next = list[found ? c + 1 : 0];
  const nextHref = joinQuery(base, next ? stepQuery(next, i + 1, from) : summaryQuery(from));
  const row = found ? list[c]! : null;
  const item =
    current.kind === "liability"
      ? data.liabilities.find((l) => l.id === current.id)
      : data.holdings.find((h) => h.id === current.id);
  const stocks = row ? row.stocks : item !== undefined && "assetClass" in item && item.assetClass === "stocks";
  return {
    form: FORMS[current.kind === "liability" ? "liability" : stocks ? "stocks" : "holding"],
    title: item?.name ?? "",
    counter: `${i} of ${total}`,
    nextHref,
    skipHref: nextHref,
  };
}

/**
 * How a step's save differs inside a pass (design.md D5): only Edit positions
 * confirms its Hand Prices, and only in a pass. Outside one the flag is never sent.
 */
export function stepSaveOptions(form: PassForm | string, inPass: boolean): { confirmPrices: boolean } {
  return { confirmPrices: inPass && form === "edit-positions" };
}

/** Where focus lands when a step opens (design.md D6): Edit positions on Save & next, the summary on Done (Enter confirms), the rest on the first input. */
export function stepFocus(form: PassForm | string, inPass: boolean): "save" | "input" {
  return form === "pass-summary" || (inPass && form === "edit-positions") ? "save" : "input";
}

/**
 * The summary step (D8), computed and never stored: the Net Worth line from the
 * starting figure the pass carried to today's, and the live Stale count. X, Y and
 * Z are whole dollars and Z = Y - X, so they reconcile. Without a valid `from`
 * the line is just today's Net Worth.
 */
export function passSummary(
  data: PortfolioData,
  from: number | null,
  today: string,
): { line: string; stillStale: string | null } {
  const now = netWorthNow(data);
  const line =
    from === null ? `Net worth ${usd(now)}` : `Net worth ${usd(from)} → ${usd(now)} (${signed(now - from)})`;
  const n = buildStaleList(data, today).length;
  return {
    line,
    stillStale: n === 0 ? null : n === 1 ? "1 item still needs updating" : `${n} items still need updating`,
  };
}
