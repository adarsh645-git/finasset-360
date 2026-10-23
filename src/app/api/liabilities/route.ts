import type { NextRequest } from "next/server";
import { todayIsoDate } from "@/lib/date/today";
import { readJsonObject } from "@/lib/http/body";
import { errorResponse, loadCountryCodes } from "@/lib/holdings/store";
import { parseLiability } from "@/lib/liabilities/liability-input";
import { linkProblem, recordTodayBalance } from "@/lib/liabilities/store";
import { createRouteClient, jsonWithCookies, requireUser } from "@/lib/supabase/route";

// POST /api/liabilities — creates a Liability and today's balance Valuation.
export async function POST(request: NextRequest) {
  const { supabase, responseCookies } = createRouteClient(request);
  const auth = await requireUser(supabase);
  if ("response" in auth) return auth.response;

  const body = await readJsonObject(request);
  if (!body) return errorResponse("Send a JSON object.", 400);
  const parsed = parseLiability(body, await loadCountryCodes(supabase), todayIsoDate());
  if (!parsed.ok) return errorResponse(parsed.error, 400);
  const { input } = parsed;

  if (input.linkedHoldingId) {
    const problem = await linkProblem(supabase, input.linkedHoldingId, null);
    if (problem) return errorResponse(problem, 400);
  }

  const { data, error } = await supabase
    .from("liability")
    .insert({
      user_id: auth.user.id,
      country: input.country,
      name: input.name,
      principal: input.principal,
      apr: input.apr,
      monthly_payment: input.monthlyPayment,
      term_years: input.termYears,
      start_month: input.startMonth,
      revolving: input.revolving,
      linked_holding_id: input.linkedHoldingId,
    })
    .select("id")
    .single();
  if (error) {
    // A concurrent link to the same Holding trips the partial unique index.
    if (error.code === "23505") return errorResponse("That Holding already has an active loan linked.", 400);
    throw error;
  }

  try {
    await recordTodayBalance(supabase, auth.user.id, data.id, input.balance);
  } catch (valuationError) {
    await supabase.from("liability").delete().eq("id", data.id);
    throw valuationError;
  }
  return jsonWithCookies({ id: data.id }, { status: 201 }, responseCookies);
}
