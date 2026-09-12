import { hasKey } from "@/lib/http/body";
import { isPositiveFiniteQuantity } from "./quantity";

export type PriceLookupPatch = { price_lookup_symbol: string | null; quantity: number | null };

/** Reads `price_lookup_symbol`/`quantity` from a Holding request body under
 * the "populated together" rule (docs/SPEC.md's schema note: `quantity`
 * exists solely to compute the Live Estimate, so it's meaningless without a
 * symbol and vice versa) — a Holding either tracks a market symbol (both
 * fields set) or doesn't (both `null`), never one without the other.
 *
 * Returns `undefined` when neither key is present in the body (POST: no
 * live pricing; PATCH: leave the existing pair as-is), a validation-error
 * string, or the validated pair to write. Both fields must be supplied
 * together on every write that touches either one — a PATCH can't set a
 * symbol while implicitly keeping whatever quantity the row already had,
 * which would let the two drift out of sync across two requests. */
export function readPriceLookupPatch(body: unknown): PriceLookupPatch | string | undefined {
  const hasSymbol = hasKey(body, "price_lookup_symbol");
  const hasQuantity = hasKey(body, "quantity");
  if (!hasSymbol && !hasQuantity) return undefined;
  if (hasSymbol !== hasQuantity) {
    return "price_lookup_symbol and quantity must be set together.";
  }

  const rawSymbol = (body as Record<string, unknown>).price_lookup_symbol;
  const rawQuantity = (body as Record<string, unknown>).quantity;

  if (rawSymbol === null && rawQuantity === null) {
    return { price_lookup_symbol: null, quantity: null };
  }

  if (typeof rawSymbol !== "string" || rawSymbol.trim().length === 0) {
    return "price_lookup_symbol must be a non-empty string.";
  }
  if (!isPositiveFiniteQuantity(rawQuantity)) {
    return "quantity must be a positive finite number.";
  }

  return { price_lookup_symbol: rawSymbol.trim().toUpperCase(), quantity: rawQuantity };
}
