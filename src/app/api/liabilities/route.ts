import { NextResponse, type NextRequest } from "next/server";
import { isVisibleLiabilityClass } from "@/lib/liability-classes/visibility";
import { isValidCurrencyCode } from "@/lib/currency/iso4217";
import { LIABILITY_COLUMNS } from "@/lib/liabilities/columns";
import { readTrimmedString } from "@/lib/http/body";
import { createRouteClient, jsonWithCookies, requireUser } from "@/lib/supabase/route";

// GET /api/liabilities — every active (non-archived) Liability the
// signed-in User owns. Mirrors GET /api/holdings — see that route for the
// RLS and archival reasoning.
export async function GET(request: NextRequest) {
  const { supabase, responseCookies } = createRouteClient(request);

  const auth = await requireUser(supabase);
  if ("response" in auth) return auth.response;

  const { data, error } = await supabase
    .from("liability")
    .select(LIABILITY_COLUMNS)
    .is("archived_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    return jsonWithCookies({ error: error.message }, { status: 500 }, responseCookies);
  }

  return jsonWithCookies(data, { status: 200 }, responseCookies);
}

// POST /api/liabilities — add a Liability under a Liability Class (user
// story 16). Body: { name, liability_class_id, currency }.
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
  const liabilityClassId = readTrimmedString(body, "liability_class_id");
  const currency = readTrimmedString(body, "currency");

  if (name === undefined) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }
  if (liabilityClassId === undefined) {
    return NextResponse.json({ error: "liability_class_id is required." }, { status: 400 });
  }
  if (currency === undefined || !isValidCurrencyCode(currency)) {
    return NextResponse.json(
      { error: "currency must be a valid ISO 4217 currency code." },
      { status: 400 },
    );
  }

  if (!(await isVisibleLiabilityClass(supabase, liabilityClassId))) {
    return NextResponse.json({ error: "Liability Class not found." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("liability")
    .insert({ user_id: auth.user.id, liability_class_id: liabilityClassId, name, currency })
    .select(LIABILITY_COLUMNS)
    .single();

  if (error) {
    return jsonWithCookies({ error: error.message }, { status: 500 }, responseCookies);
  }

  return jsonWithCookies(data, { status: 201 }, responseCookies);
}
