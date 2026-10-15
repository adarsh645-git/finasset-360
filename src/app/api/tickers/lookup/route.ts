import { NextResponse, type NextRequest } from "next/server";
import { lookupTicker } from "@/lib/market-data/lookup-ticker";
import { isLookupCountry, normalizeTicker } from "@/lib/market-data/ticker";
import { createAdminClient } from "@/lib/supabase/admin";
import { createRouteClient, jsonWithCookies, requireUser } from "@/lib/supabase/route";

// GET /api/tickers/lookup?ticker=&country= — previews a ticker for a Country
// (name, Sector, exchange, price), or reports it unknown.
export async function GET(request: NextRequest) {
  const { supabase, responseCookies } = createRouteClient(request);
  const auth = await requireUser(supabase);
  if ("response" in auth) return auth.response;

  const params = request.nextUrl.searchParams;
  const rawTicker = params.get("ticker")?.trim() ?? "";
  const country = params.get("country");
  if (!rawTicker) return NextResponse.json({ error: "ticker is required." }, { status: 400 });
  if (!isLookupCountry(country)) {
    return NextResponse.json({ error: "country must be US or IN." }, { status: 400 });
  }

  const result = await lookupTicker(createAdminClient(), normalizeTicker(rawTicker, country));
  return jsonWithCookies(result, {}, responseCookies);
}
