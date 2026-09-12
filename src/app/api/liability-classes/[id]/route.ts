import type { NextRequest } from "next/server";
import { createRouteClient, jsonWithCookies, requireUser } from "@/lib/supabase/route";

const FOREIGN_KEY_VIOLATION = "23503";

// DELETE /api/liability-classes/[id] — a custom Liability Class only.
// Mirrors DELETE /api/asset-classes/[id]: RLS means this can never delete a
// global default or another User's custom class, and deleting one that
// still has Liabilities is refused by the `on delete restrict` foreign key,
// surfaced here as 409.
export async function DELETE(
  request: NextRequest,
  context: RouteContext<"/api/liability-classes/[id]">,
) {
  const { supabase, responseCookies } = createRouteClient(request);

  const auth = await requireUser(supabase);
  if ("response" in auth) return auth.response;

  const { id } = await context.params;

  const { data, error } = await supabase.from("liability_class").delete().eq("id", id).select("id");

  if (error) {
    if (error.code === FOREIGN_KEY_VIOLATION) {
      return jsonWithCookies(
        { error: "This Liability Class still has Liabilities — remove or reassign them first." },
        { status: 409 },
        responseCookies,
      );
    }
    return jsonWithCookies({ error: error.message }, { status: 500 }, responseCookies);
  }

  if (!data || data.length === 0) {
    return jsonWithCookies({ error: "Liability Class not found." }, { status: 404 }, responseCookies);
  }

  return jsonWithCookies({ id }, { status: 200 }, responseCookies);
}
