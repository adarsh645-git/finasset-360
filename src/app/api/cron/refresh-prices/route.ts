import { NextResponse, type NextRequest } from "next/server";
import { fetchPrice } from "@/lib/market-data/fetch-price";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/cron/refresh-prices — the one shared server-side fetch that
// serves every tenant (docs/SPEC.md, user story 36): a Vercel Cron Job
// (vercel.json) invokes this once a day, Vercel auto-sends the CRON_SECRET
// bearer token, and this route is the only writer of `price_cache` — it
// uses the service-role key precisely because no client role has a write
// policy on that table.
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

  const results = await Promise.all(
    symbols.map(async (symbol) => {
      const result = await fetchPrice(symbol);

      if (result.ok) {
        const { error } = await admin.from("price_cache").upsert(
          {
            symbol,
            price: result.price,
            price_currency: result.priceCurrency,
            source: result.source,
            last_error: null,
            fetched_at: new Date().toISOString(),
          },
          { onConflict: "symbol" },
        );
        return { symbol, ok: !error, error: error?.message };
      }

      // A failure never touches `fetched_at` or `price` — the previous
      // good price stays in place (user story 38) and `fetched_at` stays
      // trustworthy as "last successful fetch". If no row exists yet for
      // this symbol (never fetched successfully), there is no price to
      // preserve and nothing to record the error against, so this is a
      // no-op UPDATE rather than an INSERT with a fabricated price.
      const { error } = await admin
        .from("price_cache")
        .update({ last_error: result.error })
        .eq("symbol", symbol);
      return { symbol, ok: false, error: error?.message ?? result.error };
    }),
  );

  return NextResponse.json({ refreshed: results });
}
