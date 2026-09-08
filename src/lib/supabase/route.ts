import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import {
  createClient as createBearerClient,
  type SupabaseClient,
  type User,
} from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseUrl } from "./env";

export type RouteCookie = { name: string; value: string; options: CookieOptions };

export type RouteSupabase = {
  supabase: SupabaseClient;
  /** Cookies the auth session refresh wants set on the outgoing response. */
  responseCookies: RouteCookie[];
};

// Route Handlers are called two ways: by the browser, which authenticates
// via the session cookie the middleware maintains, and by the test suite
// (seam 2 in docs/SPEC.md's testing decisions), which has no browser and so
// authenticates as a specific fixture User via a bearer token instead. This
// picks whichever the request actually presents rather than requiring tests
// to fake a cookie jar — an `Authorization` header is what a non-browser
// caller of this same API would use anyway.
export function createRouteClient(request: NextRequest): RouteSupabase {
  const authorization = request.headers.get("authorization");
  if (authorization) {
    const supabase = createBearerClient(supabaseUrl(), supabaseAnonKey(), {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    return { supabase, responseCookies: [] };
  }

  const responseCookies: RouteCookie[] = [];

  const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        responseCookies.push(...cookiesToSet);
      },
    },
  });

  return { supabase, responseCookies };
}

/** The signed-in User, or a 401 `NextResponse` to return as-is. Every route
 * handler in `src/app/api/**` starts with `const auth = await requireUser(...)`
 * and returns immediately if it got a Response back. */
export async function requireUser(
  supabase: SupabaseClient,
): Promise<{ user: User } | { response: NextResponse }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { response: NextResponse.json({ error: "Not signed in." }, { status: 401 }) };
  }
  return { user };
}

/** A JSON response carrying the auth-session cookies `createRouteClient`
 * collected, so every handler doesn't repeat the `response.cookies.set(...)`
 * loop. NextResponse's own cookies API handles serialization correctly, so
 * this doesn't reinvent it — just applies it in one place. */
export function jsonWithCookies(
  data: unknown,
  init: { status?: number },
  responseCookies: RouteCookie[],
) {
  const response = NextResponse.json(data, init);
  for (const cookie of responseCookies) {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }
  return response;
}
