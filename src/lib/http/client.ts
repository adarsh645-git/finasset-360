// Every mutation PortfolioShell makes (add/edit/delete an Asset Class or
// Holding) needs the same two things: treat a non-2xx response's `error`
// body as the failure message, and — unlike a bare `response.ok` check —
// also catch `fetch` itself throwing (offline, aborted), so a network
// failure surfaces as a message instead of leaving the caller's "Saving…"
// state stuck forever on an unhandled rejection.
export type SubmitResult<T> = { ok: true; data: T } | { ok: false; error: string };

// For callers that need the response body back (e.g. the id of a row just
// created). On success `data` is the parsed JSON body.
export async function submitJsonForResult<T>(url: string, init: RequestInit): Promise<SubmitResult<T>> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    return { ok: false, error: "Could not reach the server. Check your connection and try again." };
  }
  if (response.ok) return { ok: true, data: (await response.json().catch(() => null)) as T };
  const body = await response.json().catch(() => null);
  return { ok: false, error: body?.error ?? "Something went wrong. Please try again." };
}

export async function submitJson(url: string, init: RequestInit): Promise<string | null> {
  const result = await submitJsonForResult<unknown>(url, init);
  return result.ok ? null : result.error;
}
