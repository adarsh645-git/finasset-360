import { NextResponse, type NextRequest } from "next/server";
import { todayIsoDate } from "@/lib/date/today";
import { loadPortfolio } from "@/lib/read-model/load-portfolio";
import { createRouteClient, jsonWithCookies, requireUser } from "@/lib/supabase/route";

// GET /api/portfolio — the signed-in User's whole Portfolio (design D17),
// read under their session so row level security does the isolation.
export async function GET(request: NextRequest) {
  const { supabase, responseCookies } = createRouteClient(request);
  const auth = await requireUser(supabase);
  if ("response" in auth) return auth.response;

  try {
    return jsonWithCookies(await loadPortfolio(supabase, todayIsoDate()), { status: 200 }, responseCookies);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load the Portfolio.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
