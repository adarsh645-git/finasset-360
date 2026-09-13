import type { NextRequest } from "next/server";
import { createRouteClient, jsonWithCookies, requireUser } from "@/lib/supabase/route";

const MAX_RESULTS = 8;

/** ILIKE treats `%`, `_`, and `\` as pattern syntax — escape them in the
 * User's own query text so e.g. searching "A_C" doesn't also match "ABC". */
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

// GET /api/stock-symbols?q=... — the stock-picker's one query (ticket 18),
// entirely against the locally-cached `stock_symbol` table: no external
// call in the request path, since the weekly cron route
// (/api/cron/refresh-stock-symbols) is what keeps that table current.
// Ticker-prefix matches rank first, name-substring matches fill the rest,
// deduped by symbol.
export async function GET(request: NextRequest) {
  const { supabase, responseCookies } = createRouteClient(request);

  const auth = await requireUser(supabase);
  if ("response" in auth) return auth.response;

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length === 0) {
    return jsonWithCookies([], { status: 200 }, responseCookies);
  }

  const pattern = escapeLikePattern(query);
  const columns = "symbol, name, type, sector";

  const [bySymbol, byName] = await Promise.all([
    supabase.from("stock_symbol").select(columns).ilike("symbol", `${pattern}%`).order("symbol").limit(MAX_RESULTS),
    supabase.from("stock_symbol").select(columns).ilike("name", `%${pattern}%`).order("symbol").limit(MAX_RESULTS),
  ]);

  if (bySymbol.error) {
    return jsonWithCookies({ error: bySymbol.error.message }, { status: 500 }, responseCookies);
  }
  if (byName.error) {
    return jsonWithCookies({ error: byName.error.message }, { status: 500 }, responseCookies);
  }

  const seen = new Set<string>();
  const matches = [...bySymbol.data, ...byName.data]
    .filter((row) => {
      if (seen.has(row.symbol)) return false;
      seen.add(row.symbol);
      return true;
    })
    .slice(0, MAX_RESULTS)
    // `stock_symbol.sector` stores a resolved-but-blank industry as `''`,
    // distinct internally from the `null` that means "never looked up" —
    // but every consumer past this boundary (the picker, and eventually
    // `holding.sector`) only ever expects `string | null`, same as
    // /api/stock-symbols/[symbol]/sector already normalizes.
    .map((row) => ({ ...row, sector: row.sector || null }));

  return jsonWithCookies(matches, { status: 200 }, responseCookies);
}
