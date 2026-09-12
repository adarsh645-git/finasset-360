import { NextResponse, type NextRequest } from "next/server";
import { isVisibleAssetClass } from "@/lib/asset-classes/visibility";
import { isValidCurrencyCode } from "@/lib/currency/iso4217";
import { readTrimmedString } from "@/lib/http/body";
import { createRouteClient, jsonWithCookies, requireUser } from "@/lib/supabase/route";

// GET /api/holdings — every Holding the signed-in User owns. RLS
// (`user_id = auth.uid()`) is what enforces that this can never return
// another User's Holdings.
export async function GET(request: NextRequest) {
  const { supabase, responseCookies } = createRouteClient(request);

  const auth = await requireUser(supabase);
  if ("response" in auth) return auth.response;

  const { data, error } = await supabase
    .from("holding")
    .select("id, asset_class_id, name, currency, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    return jsonWithCookies({ error: error.message }, { status: 500 }, responseCookies);
  }

  return jsonWithCookies(data, { status: 200 }, responseCookies);
}

// POST /api/holdings — add a Holding under an Asset Class (user stories 12,
// 13). Body: { name, asset_class_id, currency }.
export async function POST(request: NextRequest) {
  const { supabase, responseCookies } = createRouteClient(request);

  const auth = await requireUser(supabase);
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const name = readTrimmedString(body, "name");
  const assetClassId = readTrimmedString(body, "asset_class_id");
  const currency = readTrimmedString(body, "currency");

  if (name === undefined) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }
  if (assetClassId === undefined) {
    return NextResponse.json({ error: "asset_class_id is required." }, { status: 400 });
  }
  if (currency === undefined || !isValidCurrencyCode(currency)) {
    return NextResponse.json(
      { error: "currency must be a valid ISO 4217 currency code." },
      { status: 400 },
    );
  }

  if (!(await isVisibleAssetClass(supabase, assetClassId))) {
    return NextResponse.json({ error: "Asset Class not found." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("holding")
    .insert({ user_id: auth.user.id, asset_class_id: assetClassId, name, currency })
    .select("id, asset_class_id, name, currency, created_at")
    .single();

  if (error) {
    return jsonWithCookies({ error: error.message }, { status: 500 }, responseCookies);
  }

  return jsonWithCookies(data, { status: 201 }, responseCookies);
}
