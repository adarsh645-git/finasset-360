import type { NextRequest } from "next/server";
import { todayIsoDate } from "@/lib/date/today";
import { readJsonObject } from "@/lib/http/body";
import { errorResponse, loadCountryCodes } from "@/lib/holdings/store";
import { parseLiability } from "@/lib/liabilities/liability-input";
import { linkProblem, loadWritableLiability, recordTodayBalance } from "@/lib/liabilities/store";
import { createRouteClient, jsonWithCookies, requireUser } from "@/lib/supabase/route";

// PATCH /api/liabilities/[id] — full replacement of the editable fields, plus
// today's balance Valuation. Country is fixed after creation.
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { supabase, responseCookies } = createRouteClient(request);
  const auth = await requireUser(supabase);
  if ("response" in auth) return auth.response;

  const { id } = await context.params;
  const loaded = await loadWritableLiability(supabase, id);
  if ("response" in loaded) return loaded.response;

  const body = await readJsonObject(request);
  if (!body) return errorResponse("Send a JSON object.", 400);
  const parsed = parseLiability(body, await loadCountryCodes(supabase), todayIsoDate());
  if (!parsed.ok) return errorResponse(parsed.error, 400);
  const { input } = parsed;

  if (input.country !== loaded.liability.country) {
    return errorResponse("A Liability's country can't change; archive it and add a new one.", 400);
  }
  if (input.linkedHoldingId) {
    const problem = await linkProblem(supabase, input.linkedHoldingId, id);
    if (problem) return errorResponse(problem, 400);
  }

  const { error } = await supabase
    .from("liability")
    .update({
      name: input.name,
      principal: input.principal,
      apr: input.apr,
      monthly_payment: input.monthlyPayment,
      term_years: input.termYears,
      start_month: input.startMonth,
      revolving: input.revolving,
      linked_holding_id: input.linkedHoldingId,
    })
    .eq("id", id);
  if (error) {
    if (error.code === "23505") return errorResponse("That Holding already has an active loan linked.", 400);
    throw error;
  }

  await recordTodayBalance(supabase, auth.user.id, id, input.balance);
  return jsonWithCookies({ id }, { status: 200 }, responseCookies);
}
