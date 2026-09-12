import { NextResponse, type NextRequest } from "next/server";
import { isVisibleAssetClass } from "@/lib/asset-classes/visibility";
import { isValidCurrencyCode } from "@/lib/currency/iso4217";
import { hasKey, readTrimmedString } from "@/lib/http/body";
import { createRouteClient, jsonWithCookies, requireUser } from "@/lib/supabase/route";

// PATCH /api/holdings/[id] — edit a Holding's name, Asset Class, and/or
// currency (user story 17). Every field is optional; whatever is present is
// validated the same way POST /api/holdings validates it.
export async function PATCH(request: NextRequest, context: RouteContext<"/api/holdings/[id]">) {
  const { supabase, responseCookies } = createRouteClient(request);

  const auth = await requireUser(supabase);
  if ("response" in auth) return auth.response;

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const update: Record<string, string> = {};

  if (hasKey(body, "name")) {
    const name = readTrimmedString(body, "name");
    if (name === undefined) {
      return NextResponse.json({ error: "name must be a non-empty string." }, { status: 400 });
    }
    update.name = name;
  }

  if (hasKey(body, "asset_class_id")) {
    const assetClassId = readTrimmedString(body, "asset_class_id");
    if (assetClassId === undefined || !(await isVisibleAssetClass(supabase, assetClassId))) {
      return NextResponse.json({ error: "Asset Class not found." }, { status: 400 });
    }
    update.asset_class_id = assetClassId;
  }

  if (hasKey(body, "currency")) {
    const currency = readTrimmedString(body, "currency");
    if (currency === undefined || !isValidCurrencyCode(currency)) {
      return NextResponse.json(
        { error: "currency must be a valid ISO 4217 currency code." },
        { status: 400 },
      );
    }
    update.currency = currency;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("holding")
    .update(update)
    .eq("id", id)
    .select("id, asset_class_id, name, currency, created_at")
    .maybeSingle();

  if (error) {
    return jsonWithCookies({ error: error.message }, { status: 500 }, responseCookies);
  }

  if (!data) {
    return jsonWithCookies({ error: "Holding not found." }, { status: 404 }, responseCookies);
  }

  return jsonWithCookies(data, { status: 200 }, responseCookies);
}

// DELETE /api/holdings/[id] — a true delete (ticket 06 adds archival as the
// primary removal path; this ticket has no archive column yet). RLS
// (`user_id = auth.uid()`) means this can never delete another User's
// Holding regardless of what id is passed.
export async function DELETE(request: NextRequest, context: RouteContext<"/api/holdings/[id]">) {
  const { supabase, responseCookies } = createRouteClient(request);

  const auth = await requireUser(supabase);
  if ("response" in auth) return auth.response;

  const { id } = await context.params;

  const { data, error } = await supabase.from("holding").delete().eq("id", id).select("id");

  if (error) {
    return jsonWithCookies({ error: error.message }, { status: 500 }, responseCookies);
  }

  if (!data || data.length === 0) {
    return jsonWithCookies({ error: "Holding not found." }, { status: 404 }, responseCookies);
  }

  return jsonWithCookies({ id }, { status: 200 }, responseCookies);
}
