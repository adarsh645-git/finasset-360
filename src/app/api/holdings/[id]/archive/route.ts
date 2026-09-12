import type { NextRequest } from "next/server";
import { createRouteClient, jsonWithCookies, requireUser } from "@/lib/supabase/route";

// POST /api/holdings/[id]/archive — the primary "remove" action for a
// Holding (user story 18): sets `archived_at` instead of deleting the row,
// so its Valuation History keeps counting toward historical trend and
// distribution-over-time views (user story 20) even though it now drops
// out of current Net Worth, current distribution, and the Portfolio tree
// (user story 19). A true DELETE (DELETE /api/holdings/[id]) still exists
// separately for correcting a mistaken entry and remains the non-primary
// path (user story 21). RLS (`user_id = auth.uid()`) means this can never
// archive another User's Holding regardless of what id is passed.
export async function POST(request: NextRequest, context: RouteContext<"/api/holdings/[id]/archive">) {
  const { supabase, responseCookies } = createRouteClient(request);

  const auth = await requireUser(supabase);
  if ("response" in auth) return auth.response;

  const { id } = await context.params;

  const { data, error } = await supabase
    .from("holding")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, asset_class_id, name, currency, archived_at, created_at")
    .maybeSingle();

  if (error) {
    return jsonWithCookies({ error: error.message }, { status: 500 }, responseCookies);
  }

  if (!data) {
    return jsonWithCookies({ error: "Holding not found." }, { status: 404 }, responseCookies);
  }

  return jsonWithCookies(data, { status: 200 }, responseCookies);
}
