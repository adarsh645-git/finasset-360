import { NextResponse, type NextRequest } from "next/server";
import { isVisibleLiabilityClass } from "@/lib/liability-classes/visibility";
import { isValidCurrencyCode } from "@/lib/currency/iso4217";
import { hasKey, readTrimmedString } from "@/lib/http/body";
import { createRouteClient, jsonWithCookies, requireUser } from "@/lib/supabase/route";

// PATCH /api/liabilities/[id] — edit a Liability's name, Liability Class,
// and/or currency (user story 17). Mirrors PATCH /api/holdings/[id]: every
// field is optional, validated the same way POST /api/liabilities does.
export async function PATCH(request: NextRequest, context: RouteContext<"/api/liabilities/[id]">) {
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

  if (hasKey(body, "liability_class_id")) {
    const liabilityClassId = readTrimmedString(body, "liability_class_id");
    if (liabilityClassId === undefined || !(await isVisibleLiabilityClass(supabase, liabilityClassId))) {
      return NextResponse.json({ error: "Liability Class not found." }, { status: 400 });
    }
    update.liability_class_id = liabilityClassId;
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
    .from("liability")
    .update(update)
    .eq("id", id)
    .select("id, liability_class_id, name, currency, created_at")
    .maybeSingle();

  if (error) {
    return jsonWithCookies({ error: error.message }, { status: 500 }, responseCookies);
  }

  if (!data) {
    return jsonWithCookies({ error: "Liability not found." }, { status: 404 }, responseCookies);
  }

  return jsonWithCookies(data, { status: 200 }, responseCookies);
}

// DELETE /api/liabilities/[id] — a true delete (ticket 06 adds archival as
// the primary removal path, mirroring Holding). RLS means this can never
// delete another User's Liability regardless of what id is passed.
export async function DELETE(request: NextRequest, context: RouteContext<"/api/liabilities/[id]">) {
  const { supabase, responseCookies } = createRouteClient(request);

  const auth = await requireUser(supabase);
  if ("response" in auth) return auth.response;

  const { id } = await context.params;

  const { data, error } = await supabase.from("liability").delete().eq("id", id).select("id");

  if (error) {
    return jsonWithCookies({ error: error.message }, { status: 500 }, responseCookies);
  }

  if (!data || data.length === 0) {
    return jsonWithCookies({ error: "Liability not found." }, { status: 404 }, responseCookies);
  }

  return jsonWithCookies({ id }, { status: 200 }, responseCookies);
}
