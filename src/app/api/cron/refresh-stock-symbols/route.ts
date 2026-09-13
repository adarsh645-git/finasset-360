import { NextResponse, type NextRequest } from "next/server";
import { fetchFinnhubSymbolList } from "@/lib/market-data/finnhub";
import { createAdminClient } from "@/lib/supabase/admin";

// A single upsert request stays well clear of any request-size limit while
// still finishing in a handful of round trips for Finnhub's tens-of-
// thousands-of-rows US symbol list.
const UPSERT_CHUNK_SIZE = 1000;

// GET /api/cron/refresh-stock-symbols — ticket 18's weekly Vercel Cron Job
// (vercel.json), mirroring refresh-prices' pattern exactly: CRON_SECRET-
// protected, service-role upsert into the shared, non-tenant-scoped
// `stock_symbol` table. Weekly, not daily, because the US symbol list
// barely changes day to day. Never touches `sector` — that column is
// resolved lazily, per symbol, by /api/stock-symbols/[symbol]/sector.
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const result = await fetchFinnhubSymbolList();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  const admin = createAdminClient();
  const updatedAt = new Date().toISOString();
  const rows = result.symbols.map((symbol) => ({ ...symbol, updated_at: updatedAt }));

  for (let i = 0; i < rows.length; i += UPSERT_CHUNK_SIZE) {
    const chunk = rows.slice(i, i + UPSERT_CHUNK_SIZE);
    const { error } = await admin.from("stock_symbol").upsert(chunk, { onConflict: "symbol" });
    if (error) {
      return NextResponse.json(
        { error: error.message, refreshedBeforeFailure: i },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ refreshed: rows.length });
}
