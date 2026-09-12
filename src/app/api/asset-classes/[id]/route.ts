import type { NextRequest } from "next/server";
import { createRouteClient, jsonWithCookies, requireUser } from "@/lib/supabase/route";

const FOREIGN_KEY_VIOLATION = "23503";

// DELETE /api/asset-classes/[id] — a custom Asset Class only. RLS
// (`owner_id = auth.uid()`) means this can never delete a global default or
// another User's custom class regardless of what id is passed — it just
// deletes zero rows. Deleting one that still has Holdings is refused by the
// `on delete restrict` foreign key (user story 10), surfaced here as 409
// rather than the generic 500 other unexpected DB errors get.
export async function DELETE(request: NextRequest, context: RouteContext<"/api/asset-classes/[id]">) {
  const { supabase, responseCookies } = createRouteClient(request);

  const auth = await requireUser(supabase);
  if ("response" in auth) return auth.response;

  const { id } = await context.params;

  const { data, error } = await supabase.from("asset_class").delete().eq("id", id).select("id");

  if (error) {
    if (error.code === FOREIGN_KEY_VIOLATION) {
      return jsonWithCookies(
        { error: "This Asset Class still has Holdings — remove or reassign them first." },
        { status: 409 },
        responseCookies,
      );
    }
    return jsonWithCookies({ error: error.message }, { status: 500 }, responseCookies);
  }

  if (!data || data.length === 0) {
    return jsonWithCookies({ error: "Asset Class not found." }, { status: 404 }, responseCookies);
  }

  return jsonWithCookies({ id }, { status: 200 }, responseCookies);
}
