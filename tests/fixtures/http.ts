import { NextRequest } from "next/server";
import type { TestUser } from "./users";

/** Builds a `NextRequest` authenticated as `user` via the bearer-token path
 * `createRouteClient` accepts (see src/lib/supabase/route.ts) — every
 * route-boundary test file under tests/route/** authenticates this same
 * way, so it lives here once rather than being redefined per file. */
export function requestAs(
  user: TestUser,
  url: string,
  init: { method?: string; headers?: Record<string, string>; body?: string } = {},
) {
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${user.accessToken}`);
  return new NextRequest(url, { method: init.method, headers, body: init.body });
}

/** A `fetch`-shaped `{ headers, body }` pair for a JSON request body. */
export function jsonBody(body: unknown) {
  return { headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}
