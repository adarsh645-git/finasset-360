import { NextResponse, type NextRequest } from "next/server";
import { createRouteClient } from "@/lib/supabase/route";

// Local-dev-only. scripts/seed-local.mjs's magic link hands off raw
// access_token/refresh_token via the URL fragment (no code_verifier to
// pair a PKCE `?code=` with — see src/app/auth/dev-signin/page.tsx's own
// comment), which only client-side JS can read. That page POSTs the pair
// here rather than calling the browser client's own setSession directly:
// this way the session cookie is written through the exact same
// server-side mechanism (createRouteClient's cookie collection, applied to
// a NextResponse) every other authenticated route in this app already
// relies on, sidestepping whatever timing the browser client's own cookie
// side effects depend on.
export async function POST(request: NextRequest) {
  const { access_token, refresh_token } = await request.json();
  if (typeof access_token !== "string" || typeof refresh_token !== "string") {
    return NextResponse.json({ error: "Missing access_token or refresh_token." }, { status: 400 });
  }

  const { supabase, responseCookies } = createRouteClient(request);
  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  for (const cookie of responseCookies) {
    response.cookies.set(cookie.name, cookie.value, cookie.options);
  }
  return response;
}
