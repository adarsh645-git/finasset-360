import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseAnonKey, supabaseUrl } from "./env";

// /auth/dev-signin is scripts/seed-local.mjs's local-only landing page —
// see its own comment for why it exists alongside /auth/callback.
const PUBLIC_PATHS = ["/login", "/auth/callback", "/auth/dev-signin"];

// Refreshes the auth session cookie on every request (Supabase access tokens
// are short-lived) and redirects a signed-out visitor away from anything but
// the sign-in page and its OAuth callback. Per ADR 0001 there's no
// invite/allowlist check here — only "is there a session at all".
export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublicPath = PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path));

  if (!user && !isPublicPath) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
