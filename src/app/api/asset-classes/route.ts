import { NextResponse, type NextRequest } from "next/server";
import { createRouteClient, jsonWithCookies, requireUser } from "@/lib/supabase/route";
import { readTrimmedString } from "@/lib/http/body";

// GET /api/asset-classes — every Asset Class visible to the signed-in User:
// the global defaults (owner_id IS NULL) plus their own custom ones. RLS
// (`owner_id IS NULL OR owner_id = auth.uid()`) is what enforces that this
// query can never surface another User's custom class — see ticket 03.
export async function GET(request: NextRequest) {
  const { supabase, responseCookies } = createRouteClient(request);

  const auth = await requireUser(supabase);
  if ("response" in auth) return auth.response;

  const { data, error } = await supabase
    .from("asset_class")
    .select("id, owner_id, name")
    .order("owner_id", { ascending: true, nullsFirst: true })
    .order("name", { ascending: true });

  if (error) {
    return jsonWithCookies({ error: error.message }, { status: 500 }, responseCookies);
  }

  return jsonWithCookies(data, { status: 200 }, responseCookies);
}

// POST /api/asset-classes — add a custom Asset Class (user story 7). Always
// owned by the caller; there is no way to create a global default through
// this route.
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
  if (name === undefined) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("asset_class")
    .insert({ owner_id: auth.user.id, name })
    .select("id, owner_id, name")
    .single();

  if (error) {
    return jsonWithCookies({ error: error.message }, { status: 500 }, responseCookies);
  }

  return jsonWithCookies(data, { status: 201 }, responseCookies);
}
