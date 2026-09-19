import { NextResponse, type NextRequest } from "next/server";
import { refreshPrice } from "@/lib/market-data/refresh-price";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/cron/refresh-prices — the one shared server-side fetch that
// serves every tenant (docs/SPEC.md, user story 36): a Vercel Cron Job
// (vercel.json) invokes this once a day, Vercel auto-sends the CRON_SECRET
// bearer token, and this route keeps every tracked symbol's `price_cache` row
// fresh — it uses the service-role key precisely because no client role has
// a write policy on that table. The one other writer is fetch-on-add
// (`ensurePriceCached`, ticket 21), which only fills a symbol's first row.
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = createAdminClient();

  // Reads across every tenant's Holdings — deliberately, since the whole
  // point of this route is one fetch shared by all of them rather than
  // each tenant triggering its own (user story 36). No FK ties
  // `price_lookup_symbol` to `price_cache`, so this is a plain distinct-
  // values scan, not a join.
  const { data: holdings, error: holdingsError } = await admin
    .from("holding")
    .select("price_lookup_symbol")
    .not("price_lookup_symbol", "is", null);

  if (holdingsError) {
    return NextResponse.json({ error: holdingsError.message }, { status: 500 });
  }

  const symbols = [...new Set(holdings.map((h) => h.price_lookup_symbol as string))];

  const results = await Promise.all(symbols.map((symbol) => refreshPrice(admin, symbol)));

  return NextResponse.json({ refreshed: results });
}
