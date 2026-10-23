import { NextResponse, type NextRequest } from "next/server";
import { rejectWithoutCronSecret } from "@/lib/http/cron-auth";
import { runDailyJob } from "@/lib/market-data/daily-job";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/cron/daily — the daily Vercel Cron Job (vercel.json),
// CRON_SECRET-protected: today's FX Rate (and any gap), prices for held US
// tickers, then today's Valuation for every active Stocks Holding. A step that
// fails reports its error in the body; the later steps still run.
export async function GET(request: NextRequest) {
  const rejection = rejectWithoutCronSecret(request);
  if (rejection) return rejection;
  return NextResponse.json(await runDailyJob(createAdminClient()));
}
