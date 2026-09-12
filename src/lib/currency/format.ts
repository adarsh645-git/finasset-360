// The one place a raw number and an ISO code become display text, so a
// Valuation shown in a Miller row, a detail panel, and the Net Worth strip
// all format identically. `Number(...)` guards the boundary in case a
// `numeric` column ever comes back from PostgREST as a string.
export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(amount));
}
