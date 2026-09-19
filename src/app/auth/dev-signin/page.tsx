"use client";

import { useEffect, useRef, useState } from "react";

const TIMEOUT_MS = 8_000;

// Local-dev-only landing page for scripts/seed-local.mjs's printed
// sign-in link. Real Google sign-in uses the PKCE flow — a `?code=` query
// param /auth/callback exchanges server-side. Supabase Admin's
// generateLink (magiclink) has no code_verifier to pair a PKCE code with,
// so it hands off tokens via the URL *fragment* instead
// (#access_token=...&refresh_token=...) — fragments never reach the
// server, so only client-side JS can read them. This page parses the
// fragment and POSTs the pair to /api/dev-signin, which sets the session
// cookie server-side (the same mechanism every other authenticated route
// in this app already uses) rather than relying on the browser client's
// own setSession side effects — which, in practice, left the cookie not
// yet visible to the very next request often enough to be the actual bug
// here twice already.
export default function DevSignInPage() {
  const [error, setError] = useState<string | null>(null);
  // React Strict Mode double-invokes effects in dev — this ref makes the
  // actual work run once instead of firing the POST twice.
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    // No cleanup that clears this: Strict Mode's synthetic remount would
    // fire it between the two effect invocations, killing the timeout
    // before the (correctly skipped) second invocation could recreate it
    // — leaving nothing to ever show an error on a real hang.
    const timeoutId = setTimeout(() => {
      console.error("[dev-signin] timed out waiting for /api/dev-signin");
      setError("Timed out waiting for sign-in. The link may already be used — run `npm run seed` again for a fresh one.");
    }, TIMEOUT_MS);

    // Deferred a tick so every setState below runs outside the effect's
    // own synchronous pass, including the early "no tokens" branch.
    queueMicrotask(async () => {
      try {
        const hash = new URLSearchParams(window.location.hash.slice(1));
        const access_token = hash.get("access_token");
        const refresh_token = hash.get("refresh_token");
        if (!access_token || !refresh_token) {
          console.error("[dev-signin] no access_token/refresh_token in", window.location.hash);
          setError(
            "No session tokens in the URL — open the link scripts/seed-local.mjs just printed, not this page directly.",
          );
          return;
        }
        console.log("[dev-signin] posting tokens to /api/dev-signin");
        const response = await fetch("/api/dev-signin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ access_token, refresh_token }),
        });
        console.log("[dev-signin] response", response.status);
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          console.error("[dev-signin] failed", body);
          setError(body.error ?? `Sign-in failed (HTTP ${response.status}).`);
          return;
        }
        console.log("[dev-signin] ok, navigating to /");
        // A hard navigation, not router.push — the server (page.tsx) must
        // see the cookie /api/dev-signin just set on its next request.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.href = "/";
      } catch (caught) {
        console.error("[dev-signin] threw", caught);
        setError(caught instanceof Error ? caught.message : "Sign-in failed for an unknown reason.");
      } finally {
        clearTimeout(timeoutId);
      }
    });
  }, []);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-32 text-center">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{error ?? "Signing in…"}</p>
    </div>
  );
}
