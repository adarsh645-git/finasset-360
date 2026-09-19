"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Local-dev-only landing page for scripts/seed-local.mjs's printed
// sign-in link. Real Google sign-in uses the PKCE flow — a `?code=` query
// param /auth/callback exchanges server-side. Supabase Admin's
// generateLink (magiclink) has no code_verifier to pair a PKCE code with,
// so it hands off tokens via the URL *fragment* instead
// (#access_token=...&refresh_token=...) — fragments never reach the
// server, so only client-side JS can read them. This page does exactly
// that: parse the fragment, call setSession (which writes the session
// cookie through the browser Supabase client), then hard-navigate to "/"
// so the server picks up the new cookie on its next request.
export default function DevSignInPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Deferred a tick so every setState below runs outside the effect's
    // own synchronous pass, including the early "no tokens" branch.
    queueMicrotask(async () => {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const access_token = hash.get("access_token");
      const refresh_token = hash.get("refresh_token");
      if (!access_token || !refresh_token) {
        setError("No session tokens in the URL — open the link scripts/seed-local.mjs just printed, not this page directly.");
        return;
      }
      const { error } = await createClient().auth.setSession({ access_token, refresh_token });
      if (error) {
        setError(error.message);
      } else {
        // A hard navigation, not router.push — the server (page.tsx) must
        // see the cookie setSession just wrote on its very next request.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/";
      }
    });
  }, []);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-32 text-center">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{error ?? "Signing in…"}</p>
    </div>
  );
}
