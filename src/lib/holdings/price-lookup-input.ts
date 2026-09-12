import { isPositiveFiniteQuantity } from "./quantity";

export type PriceLookupInput = {
  isMismatched: boolean;
  isInvalid: boolean;
  value: { price_lookup_symbol: string; quantity: number } | null;
};

/** The client-side mirror of readPriceLookupPatch's "populated together"
 * rule, applied to two raw form-field strings rather than a JSON body — so
 * AddHoldingRow and HoldingDetailPanel's edit form can both reject a
 * mismatched or non-numeric pair before the round trip to the route, which
 * would otherwise 400 on the exact same rule. */
export function validatePriceLookupInput(symbolInput: string, quantityInput: string): PriceLookupInput {
  const symbol = symbolInput.trim();
  const quantityText = quantityInput.trim();
  const isMismatched = (symbol !== "") !== (quantityText !== "");

  if (isMismatched || symbol === "") {
    return { isMismatched, isInvalid: false, value: null };
  }

  const quantity = Number(quantityText);
  if (!isPositiveFiniteQuantity(quantity)) {
    return { isMismatched: false, isInvalid: true, value: null };
  }

  return { isMismatched: false, isInvalid: false, value: { price_lookup_symbol: symbol, quantity } };
}
