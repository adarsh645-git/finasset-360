import { NextResponse, type NextRequest } from "next/server";
import { fetchFinnhubSymbolList } from "@/lib/market-data/finnhub";
import { rejectWithoutCronSecret } from "@/lib/http/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";

// A single upsert request stays well clear of any request-size limit while
// still finishing in a handful of round trips for Finnhub's tens-of-
// thousands-of-rows US symbol list.
const UPSERT_CHUNK_SIZE = 1000;

// GET /api/cron/refresh-stock-symbols — the weekly Vercel Cron Job
// (vercel.json): CRON_SECRET-protected service-role upsert into the shared
// `stock_symbol` table, storing each symbol's name, type and exchange (mic).
// The payload omits `sector`, so a Sector already resolved by a ticker
// lookup is preserved.
export async function GET(request: NextRequest) {
  const rejection = rejectWithoutCronSecret(request);
  if (rejection) return rejection;

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
