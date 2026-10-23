import type { NextRequest } from "next/server";
import { readJsonObject } from "@/lib/http/body";
import { parseManualHolding } from "@/lib/holdings/manual-holding-input";
import { parseStocksHolding } from "@/lib/holdings/stocks-input";
import { priceStocksPositions, writeStocksPositions } from "@/lib/holdings/stocks-store";
import { errorResponse, loadCountryCodes, recordTodayValuation } from "@/lib/holdings/store";
import { createRouteClient, jsonWithCookies, requireUser } from "@/lib/supabase/route";

// POST /api/holdings — creates a Holding and today's Valuation (Stocks carry Positions).
export async function POST(request: NextRequest) {
  const { supabase, responseCookies } = createRouteClient(request);
  const auth = await requireUser(supabase);
  if ("response" in auth) return auth.response;

  const body = await readJsonObject(request);
  if (!body) return errorResponse("Send a JSON object.", 400);

  const countries = await loadCountryCodes(supabase);

  if (body.asset_class === "stocks") {
    const stocks = parseStocksHolding(body, countries);
    if (!stocks.ok) return errorResponse(stocks.error, 400);
    const priced = await priceStocksPositions(supabase, stocks.input, null);
    if (!priced.ok) return errorResponse(priced.error, 400);

    const { data: created, error: insertError } = await supabase
      .from("holding")
      .insert({
        user_id: auth.user.id,
        country: stocks.input.country,
        asset_class: "stocks",
        name: stocks.input.name,
        description: stocks.input.description,
      })
      .select("id")
      .single();
    if (insertError) throw insertError;
    try {
      await writeStocksPositions(supabase, auth.user.id, created.id, priced);
    } catch (writeError) {
      await supabase.from("holding").delete().eq("id", created.id);
      throw writeError;
    }
    return jsonWithCookies({ id: created.id }, { status: 201 }, responseCookies);
  }

  const parsed = parseManualHolding(body, countries);
  if (!parsed.ok) return errorResponse(parsed.error, 400);
  const { input } = parsed;

  const { data, error } = await supabase
    .from("holding")
    .insert({
      user_id: auth.user.id,
      country: input.country,
      asset_class: input.assetClass,
      name: input.name,
      description: input.description,
      cost_basis: input.costBasis,
      property_type: input.propertyType,
      city: input.city,
      quantity: input.quantity,
      unit: input.unit,
    })
    .select("id")
    .single();
  if (error) throw error;

  try {
    await recordTodayValuation(supabase, auth.user.id, data.id, input.value);
  } catch (valuationError) {
    await supabase.from("holding").delete().eq("id", data.id);
    throw valuationError;
  }
  return jsonWithCookies({ id: data.id }, { status: 201 }, responseCookies);
}
