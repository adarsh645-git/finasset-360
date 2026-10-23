import { NextResponse, type NextRequest } from "next/server";
import { createRouteClient, jsonWithCookies, requireUser } from "@/lib/supabase/route";

const INVALID_UUID = "22P02";

// Goals are really deleted, not archived (design D10). Row level security
// means a User can only ever match their own Goals.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, responseCookies } = createRouteClient(request);
  const auth = await requireUser(supabase);
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const { data, error } = await supabase.from("goal").delete().eq("id", id).select("id");
  if (error && error.code !== INVALID_UUID) {
    console.error("DELETE /api/goals/[id] failed", error);
    return NextResponse.json({ error: "Could not delete." }, { status: 500 });
  }
  if (error || !data?.length) {
    return NextResponse.json({ error: "Goal not found." }, { status: 404 });
  }

  return jsonWithCookies({ ok: true }, { status: 200 }, responseCookies);
}
