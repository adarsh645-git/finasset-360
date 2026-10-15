import type { NextRequest } from "next/server";
import { readJsonObject } from "@/lib/http/body";
import { parseManualHolding } from "@/lib/holdings/manual-holding-input";
import { errorResponse, loadCountryCodes, loadWritableHolding, recordTodayValuation } from "@/lib/holdings/store";
import { createRouteClient, jsonWithCookies, requireUser } from "@/lib/supabase/route";

// PATCH /api/holdings/[id] — full replacement of a manually valued Holding's
// editable fields, plus today's Valuation. Country and Asset Class are fixed
// after creation (design.md D4).
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { supabase, responseCookies } = createRouteClient(request);
  const auth = await requireUser(supabase);
  if ("response" in auth) return auth.response;

  const { id } = await context.params;
  const loaded = await loadWritableHolding(supabase, id);
  if ("response" in loaded) return loaded.response;
  const { holding } = loaded;

  const body = await readJsonObject(request);
  if (!body) return errorResponse("Send a JSON object.", 400);
  const parsed = parseManualHolding(body, await loadCountryCodes(supabase));
  if (!parsed.ok) return errorResponse(parsed.error, 400);
  const { input } = parsed;

  if (input.country !== holding.country || input.assetClass !== holding.asset_class) {
    return errorResponse("A Holding's country and asset class can't change; archive it and add a new one.", 400);
  }

  const { error } = await supabase
    .from("holding")
    .update({
      name: input.name,
      description: input.description,
      cost_basis: input.costBasis,
      property_type: input.propertyType,
      city: input.city,
      quantity: input.quantity,
      unit: input.unit,
    })
    .eq("id", id);
  if (error) throw error;

  await recordTodayValuation(supabase, auth.user.id, id, input.value);
  return jsonWithCookies({ id }, { status: 200 }, responseCookies);
}
