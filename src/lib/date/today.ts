/** Today as `YYYY-MM-DD`, UTC — the recording date a Valuation gets when the
 * User doesn't backdate it. */
export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}
