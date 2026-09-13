import { hasKey } from "@/lib/http/body";

export type HeldAtPatchResult = { ok: true; value: string | null | undefined } | { ok: false; error: string };

/** Reads `held_at` from a Holding request body (ticket 19) — a freeform
 * "where is this held" label (a brokerage, a bank, an exchange), unrelated
 * to `price_lookup_symbol`/`quantity` and to `sector`, so it applies to
 * every Asset Class rather than only market-symbol Holdings. `undefined`
 * means "key omitted" (POST: none yet; PATCH: leave the existing value as
 * is). Mirrors `readSectorPatch`'s shape rather than sharing code with it —
 * two occurrences of the same small shape isn't yet the "same knowledge,
 * 3+ times" bar for extracting a shared helper. */
export function readHeldAtPatch(body: unknown): HeldAtPatchResult {
  if (!hasKey(body, "held_at")) return { ok: true, value: undefined };

  const raw = (body as Record<string, unknown>).held_at;
  if (raw === null) return { ok: true, value: null };

  if (typeof raw !== "string" || raw.trim().length === 0) {
    return { ok: false, error: "held_at must be a non-empty string or null." };
  }

  return { ok: true, value: raw.trim() };
}
