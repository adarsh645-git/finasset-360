import type { NextRequest } from "next/server";
import { readJsonObject } from "@/lib/http/body";
import { errorResponse } from "@/lib/holdings/store";
import { parseBalance } from "@/lib/liabilities/liability-input";
import { loadWritableLiability, recordTodayBalance } from "@/lib/liabilities/store";
import { createRouteClient, jsonWithCookies, requireUser } from "@/lib/supabase/route";

// POST /api/liabilities/[id]/valuations — balance edit: upserts today's balance.
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { supabase, responseCookies } = createRouteClient(request);
  const auth = await requireUser(supabase);
  if ("response" in auth) return auth.response;

  const { id } = await context.params;
  const loaded = await loadWritableLiability(supabase, id);
  if ("response" in loaded) return loaded.response;

  const body = await readJsonObject(request);
  const balance = parseBalance(body?.balance);
  if (balance === null) return errorResponse("Balance must be a number of 0 or more.", 400);

  await recordTodayBalance(supabase, auth.user.id, id, balance);
  return jsonWithCookies({ id }, { status: 200 }, responseCookies);
}
