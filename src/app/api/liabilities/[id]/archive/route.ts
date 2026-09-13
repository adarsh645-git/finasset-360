import type { NextRequest } from "next/server";
import { LIABILITY_COLUMNS } from "@/lib/liabilities/columns";
import { createRouteClient, jsonWithCookies, requireUser } from "@/lib/supabase/route";

// POST /api/liabilities/[id]/archive — the primary "remove" action for a
// Liability. Mirrors POST /api/holdings/[id]/archive exactly; see that
// route for the archive-vs-delete reasoning.
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/liabilities/[id]/archive">,
) {
  const { supabase, responseCookies } = createRouteClient(request);

  const auth = await requireUser(supabase);
  if ("response" in auth) return auth.response;

  const { id } = await context.params;

  const { data, error } = await supabase
    .from("liability")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .select(LIABILITY_COLUMNS)
    .maybeSingle();

  if (error) {
    return jsonWithCookies({ error: error.message }, { status: 500 }, responseCookies);
  }

  if (!data) {
    return jsonWithCookies({ error: "Liability not found." }, { status: 404 }, responseCookies);
  }

  return jsonWithCookies(data, { status: 200 }, responseCookies);
}
