import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "./env";

// One client per call site is intentional per @supabase/ssr's own guidance —
// it's cheap, and a module-level singleton risks holding a stale session
// across navigations in the App Router.
export function createClient() {
  return createBrowserClient(supabaseUrl(), supabaseAnonKey());
}
