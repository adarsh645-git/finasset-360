// A Holding's `quantity` only ever means "shares/units of a live-priced
// symbol", so it must be a real, positive number — shared by the server
// validator (price-lookup.ts, working from a JSON body) and the client-side
// mirror (price-lookup-input.ts, working from a parsed form field) so the
// rule can't drift between the two.
export function isPositiveFiniteQuantity(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
