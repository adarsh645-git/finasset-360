import { NextResponse, type NextRequest } from "next/server";
import { createRouteClient, jsonWithCookies, requireUser } from "@/lib/supabase/route";
import { parseAssumptionsUpdate } from "@/lib/projection-assumptions";

// Updates only the fields sent; null blanks a field back to its default
// (design D11). Country rows are created lazily by the first update.
export async function PATCH(request: NextRequest) {
  const { supabase, responseCookies } = createRouteClient(request);
  const auth = await requireUser(supabase);
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null);
  const parsed = parseAssumptionsUpdate(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { portfolio, countries } = parsed.update;

  if (Object.keys(portfolio).length > 0) {
    const { error } = await supabase.from("portfolio").update(portfolio).eq("user_id", auth.user.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  for (const [country, fields] of Object.entries(countries)) {
    const { error } = await supabase
      .from("country_assumption")
      .upsert({ user_id: auth.user.id, country, ...fields }, { onConflict: "user_id,country" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return jsonWithCookies({ ok: true }, { status: 200 }, responseCookies);
}
