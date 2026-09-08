import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "./env";

// For Server Components and Server Actions that read the signed-in User's
// session from cookies. Writing cookies from a Server Component is a no-op
// in Next.js (and throws if not guarded) — that's fine here because
// src/proxy.ts (see lib/supabase/session.ts) is what actually refreshes the
// session cookie on every request.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component — ignore, middleware handles it.
        }
      },
    },
  });
}
