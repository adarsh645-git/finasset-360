import { fetchFinnhubSector } from "@/lib/market-data/finnhub";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRouteClient, jsonWithCookies, requireUser } from "@/lib/supabase/route";
import type { NextRequest } from "next/server";

// GET /api/stock-symbols/[symbol]/sector — resolves a stock-picker
// suggestion's Sector the first time it's selected (ticket 18): return
// `stock_symbol.sector` if already cached, else call Finnhub's
// `/stock/profile2` once, cache the result, and return it. The read uses
// the regular authenticated client — `stock_symbol` has a select policy
// for any authenticated User, same as GET /api/stock-symbols — but the
// write goes through the admin client because, unlike that select policy,
// there's no client write policy on this shared cache; only this server
// route (not the browser) ever writes it. A blank `finnhubIndustry` is
// cached as `''` internally (distinct from the `null` that means "never
// looked up") so it's never retried on every selection, but this route
// always reports `sector` as `string | null` to match how it lands on a
// Holding.
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/stock-symbols/[symbol]/sector">,
) {
  const { supabase, responseCookies } = createRouteClient(request);
  const auth = await requireUser(supabase);
  if ("response" in auth) return auth.response;

  const { symbol } = await context.params;

  const { data: row, error: readError } = await supabase
    .from("stock_symbol")
    .select("sector")
    .eq("symbol", symbol)
    .maybeSingle();

  if (readError) {
    return jsonWithCookies({ error: readError.message }, { status: 500 }, responseCookies);
  }
  if (!row) {
    return jsonWithCookies({ error: "Unknown symbol." }, { status: 404 }, responseCookies);
  }
  if (row.sector !== null) {
    return jsonWithCookies({ sector: row.sector || null }, { status: 200 }, responseCookies);
  }

  const result = await fetchFinnhubSector(symbol);
  if (!result.ok) {
    return jsonWithCookies({ error: result.error }, { status: 502 }, responseCookies);
  }

  const { error: writeError } = await createAdminClient()
    .from("stock_symbol")
    .update({ sector: result.sector ?? "" })
    .eq("symbol", symbol);

  if (writeError) {
    return jsonWithCookies({ error: writeError.message }, { status: 500 }, responseCookies);
  }

  return jsonWithCookies({ sector: result.sector }, { status: 200 }, responseCookies);
}
