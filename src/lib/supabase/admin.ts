import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./env";

// The service-role key bypasses RLS entirely, so this client must never be
// reachable from a client-authenticated request path with anything the
// caller controls. Its two users: the cron refresh route
// (src/app/api/cron/refresh-prices/route.ts), gated on CRON_SECRET, and
// `ensurePriceCached` (src/lib/market-data/refresh-price.ts), which only
// ever fills a missing `price_cache` row from the provider — nothing the
// caller sends is written to the cache.
export function createAdminClient(): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env.local and fill it in.",
    );
  }
  return createClient(supabaseUrl(), key, { auth: { autoRefreshToken: false, persistSession: false } });
}
