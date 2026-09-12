// Every mutation PortfolioShell makes (add/edit/delete an Asset Class or
// Holding) needs the same two things: treat a non-2xx response's `error`
// body as the failure message, and — unlike a bare `response.ok` check —
// also catch `fetch` itself throwing (offline, aborted), so a network
// failure surfaces as a message instead of leaving the caller's "Saving…"
// state stuck forever on an unhandled rejection.
export async function submitJson(url: string, init: RequestInit): Promise<string | null> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    return "Could not reach the server. Check your connection and try again.";
  }
  if (response.ok) return null;
  const body = await response.json().catch(() => null);
  return body?.error ?? "Something went wrong. Please try again.";
}
