import { NextResponse, type NextRequest } from "next/server";
import { createRouteClient, jsonWithCookies, requireUser } from "@/lib/supabase/route";
import { readTrimmedString } from "@/lib/http/body";

// A blank or missing name is stored as null (design D12).
export async function POST(request: NextRequest) {
  const { supabase, responseCookies } = createRouteClient(request);
  const auth = await requireUser(supabase);
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null);
  const target = (body as { target_usd?: unknown } | null)?.target_usd;
  if (typeof target !== "number" || !(target > 0)) {
    return NextResponse.json({ error: "target_usd must be a number above 0." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("goal")
    .insert({ user_id: auth.user.id, name: readTrimmedString(body, "name") ?? null, target_usd: target })
    .select("id")
    .single();
  if (error || !data) {
    console.error("POST /api/goals failed", error);
    return NextResponse.json({ error: "Could not save." }, { status: 500 });
  }

  return jsonWithCookies({ id: data.id }, { status: 201 }, responseCookies);
}
