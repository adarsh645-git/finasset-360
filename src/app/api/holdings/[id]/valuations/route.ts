import type { NextRequest } from "next/server";
import { readJsonObject } from "@/lib/http/body";
import { parseValue } from "@/lib/holdings/manual-holding-input";
import { errorResponse, loadWritableHolding, recordTodayValuation } from "@/lib/holdings/store";
import { createRouteClient, jsonWithCookies, requireUser } from "@/lib/supabase/route";

// POST /api/holdings/[id]/valuations — Update value: upserts today's
// Valuation, even when the value is unchanged. Stocks are valued from their
// Positions, so they have no Update value.
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { supabase, responseCookies } = createRouteClient(request);
  const auth = await requireUser(supabase);
  if ("response" in auth) return auth.response;

  const { id } = await context.params;
  const loaded = await loadWritableHolding(supabase, id);
  if ("response" in loaded) return loaded.response;

  if (loaded.holding.asset_class === "stocks") {
    return errorResponse("A Stocks Holding's value comes from its Positions.", 400);
  }
  const body = await readJsonObject(request);
  const value = parseValue(body?.value);
  if (value === null) return errorResponse("Value must be a number of 0 or more.", 400);

  await recordTodayValuation(supabase, auth.user.id, id, value);
  return jsonWithCookies({ id }, { status: 200 }, responseCookies);
}
