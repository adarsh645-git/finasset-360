"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signOut() {
    setIsSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={isSigningOut}
      className={
        className ??
        "h-[34px] rounded-btn border border-line2 px-3 text-[12.5px] text-ink2 transition-colors hover:bg-hover hover:text-ink disabled:opacity-60"
      }
    >
      {isSigningOut ? "Signing out…" : "Sign out"}
    </button>
  );
}
