// Shared JSON-body field readers for Route Handlers — the same rule (a
// field must be present and the right shape, or the caller gets a clear 400
// rather than a fabricated default) applies identically to every route
// under src/app/api/**, so it lives in one place rather than being
// reimplemented per route.

/** Whether `body` is a JSON object with an own `key`, regardless of that
 * key's value — used by PATCH routes to tell "field omitted" (leave as is)
 * apart from "field present but invalid" (reject the request). */
export function hasKey(body: unknown, key: string): boolean {
  return typeof body === "object" && body !== null && key in body;
}

/** A trimmed, non-empty string at `body[key]`, or `undefined` if the key is
 * missing, not a string, or blank after trimming. */
export function readTrimmedString(body: unknown, key: string): string | undefined {
  if (!hasKey(body, key)) return undefined;
  const value = (body as Record<string, unknown>)[key];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
