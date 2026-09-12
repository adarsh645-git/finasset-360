"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Open sign-up, no invite or approval step — ADR 0001. This is the only way
// into the app; there is no separate registration flow because Google
// sign-in itself is the account creation event (see the on_auth_user_created
// trigger in supabase/migrations).
export default function LoginPage() {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setError(null);
    setIsSigningIn(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setIsSigningIn(false);
    }
    // On success the browser navigates away to Google, so there's nothing
    // else to do here.
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-32">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">FinAsset 360</h1>
        <p className="max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
          A net-worth tracker for what you own and owe.
        </p>
      </div>
      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={isSigningIn}
        className="flex h-11 items-center gap-3 rounded-full border border-zinc-300 px-6 text-sm font-medium transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-900"
      >
        <GoogleIcon />
        {isSigningIn ? "Redirecting…" : "Continue with Google"}
      </button>
      {error && <p className="text-sm font-medium">{error}</p>}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.85.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.95v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.05l3.02-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.95l3.02 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
