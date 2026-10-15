import type { NextRequest } from "next/server";
import { loadWritableHolding } from "@/lib/holdings/store";
import { createRouteClient, jsonWithCookies, requireUser } from "@/lib/supabase/route";

// POST /api/holdings/[id]/archive — sets the archive date; the Holding and its
// history stay (ADR 0004).
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { supabase, responseCookies } = createRouteClient(request);
  const auth = await requireUser(supabase);
  if ("response" in auth) return auth.response;

  const { id } = await context.params;
  const loaded = await loadWritableHolding(supabase, id);
  if ("response" in loaded) return loaded.response;

  const { error } = await supabase.from("holding").update({ archived_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
  return jsonWithCookies({ id }, { status: 200 }, responseCookies);
}
