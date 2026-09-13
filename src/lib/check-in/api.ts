export type CheckInResult = {
  netWorth: number;
  previousNetWorth: number | null;
  delta: number | null;
};

/** Completes a Check-in pass (user story 46) — the one network call a pass
 * makes beyond the per-Holding record-Valuation endpoint every step already
 * reuses. Only the server can say what Net Worth is after this pass's edits
 * and what the previous pass's figure was, so the delta shown at the end is
 * never a number the client itself derived. */
export async function completeCheckIn(): Promise<CheckInResult | { error: string }> {
  let response: Response;
  try {
    response = await fetch("/api/check-in", { method: "POST" });
  } catch {
    return { error: "Could not reach the server. Check your connection and try again." };
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    return { error: body?.error ?? "Something went wrong. Please try again." };
  }
  return body as CheckInResult;
}
