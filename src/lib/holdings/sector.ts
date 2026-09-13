import { hasKey } from "@/lib/http/body";

export type SectorPatchResult = { ok: true; value: string | null | undefined } | { ok: false; error: string };

/** Reads `sector` from a Holding request body (ticket 18) — unlike
 * `price_lookup_symbol`/`quantity`, it isn't coupled to anything else, so
 * `undefined` here just means "key omitted" (POST: no Sector yet; PATCH:
 * leave the existing value as-is) rather than a validation failure. A
 * plain string success value is indistinguishable from an error by
 * `typeof` alone, which is why this returns a discriminated result instead
 * of `readPriceLookupPatch`'s "value or error string" shape. */
export function readSectorPatch(body: unknown): SectorPatchResult {
  if (!hasKey(body, "sector")) return { ok: true, value: undefined };

  const raw = (body as Record<string, unknown>).sector;
  if (raw === null) return { ok: true, value: null };

  if (typeof raw !== "string" || raw.trim().length === 0) {
    return { ok: false, error: "sector must be a non-empty string or null." };
  }

  return { ok: true, value: raw.trim() };
}
