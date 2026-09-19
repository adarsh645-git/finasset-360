/** The network-and-parse boilerplate every provider fetch in this
 * directory repeats identically: a request that might throw (network
 * error), a non-2xx response, or a body that isn't valid JSON are all the
 * same "provider fetch failed" outcome as far as the caller is concerned.
 * Each provider still owns extracting and validating its own price field —
 * that part differs enough (a plain field vs. a keyed object vs. an
 * inverted rate) that folding it in here would just be a different name
 * for the same per-provider `if`. */
const PROVIDER_TIMEOUT_MS = 10_000;

export async function fetchJson(
  url: string,
  providerLabel: string,
): Promise<{ ok: true; body: unknown } | { ok: false; error: string }> {
  let response: Response;
  try {
    // Bounded because fetch-on-add awaits this inside a user's request; a
    // timeout throws, which lands in the same "network error" outcome.
    response = await fetch(url, { signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS) });
  } catch {
    return { ok: false, error: `${providerLabel} request failed (network error).` };
  }

  if (!response.ok) {
    return { ok: false, error: `${providerLabel} request failed (HTTP ${response.status}).` };
  }

  const body = await response.json().catch(() => null);
  if (body === null) {
    return { ok: false, error: `${providerLabel} returned a response that wasn't valid JSON.` };
  }

  return { ok: true, body };
}
