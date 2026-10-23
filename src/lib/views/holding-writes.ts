import { formatDay, native } from "@/lib/format";
import type { HoldingData } from "@/lib/read-model/types";
import { calcCountry } from "@/lib/views/shell";

// What the client sends to the existing routes, and what it does with the
// answer. Kept free of React so each step is a plain test.

export type FetchFn = (url: string, init: RequestInit) => Promise<Response>;
export type SaveResult =
  | { ok: true; result: Record<string, unknown> }
  | { ok: false; error: string };

/** Update value's input: its prefix, pre-filled value and the "Was ..." line (HE-22). */
export function updateValueView(holding: HoldingData, today: string) {
  return {
    prefix: holding.country === "IN" ? "₹" : "$",
    initial: String(holding.currentValue),
    was: `Was ${native(holding.currentValue, calcCountry(holding.country))} · logged as today's value, ${formatDay(today)}`,
  };
}

/** A typed amount without `$`, `₹`, commas or spaces; null when it isn't a number of 0 or more. */
export function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[$₹,\s]/g, "");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** The route's one-sentence `{ error }`, or a plain fallback. */
async function errorOf(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    const error = (body as { error?: unknown } | null)?.error;
    if (typeof error === "string" && error) return error;
  } catch {
    // fall through
  }
  return "Something went wrong. Try again.";
}

/** Sends a JSON request and turns the answer into a SaveResult. */
export async function send(fetchFn: FetchFn, method: string, url: string, body?: unknown): Promise<SaveResult> {
  try {
    const response = await fetchFn(url, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    if (!response.ok) return { ok: false, error: await errorOf(response) };
    return { ok: true, result: ((await response.json().catch(() => ({}))) ?? {}) as Record<string, unknown> };
  } catch {
    return { ok: false, error: "Couldn't reach the server. Try again." };
  }
}

const post = (fetchFn: FetchFn, url: string, body?: unknown) => send(fetchFn, "POST", url, body);

/**
 * Update value: always posts, so an unchanged value still records today's
 * Valuation (HE-23). `confirm_prices` goes out only when a caller opts in.
 */
export async function saveValue(
  fetchFn: FetchFn,
  holdingId: string,
  raw: string,
  { confirmPrices = false }: { confirmPrices?: boolean } = {},
): Promise<SaveResult> {
  const value = parseAmount(raw);
  if (value === null) return { ok: false, error: "Enter the current value" };
  return post(fetchFn, `/api/holdings/${holdingId}/valuations`, {
    value,
    ...(confirmPrices ? { confirm_prices: true } : {}),
  });
}

export type DeleteStep = "idle" | "confirm" | "archive";

/** The click that follows `step`: the first asks to confirm, the second archives. */
export const nextDeleteStep = (step: DeleteStep): DeleteStep => (step === "idle" ? "confirm" : "archive");
export const deleteLabel = (step: DeleteStep): string => (step === "idle" ? "Delete" : "Confirm delete");

/** Archives, then leaves the page and refreshes. Returns the error sentence, or null on success (HD-07). */
export async function archiveThenLeave({
  fetchFn,
  url,
  to,
  push,
  refresh,
}: {
  fetchFn: FetchFn;
  url: string;
  to: string;
  push: (to: string) => void;
  refresh: () => void;
}): Promise<string | null> {
  const saved = await post(fetchFn, url);
  if (!saved.ok) return saved.error;
  push(to);
  refresh();
  return null;
}
