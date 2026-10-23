import type { NextRequest } from "next/server";
import { loadWritableLiability } from "@/lib/liabilities/store";
import { createRouteClient, jsonWithCookies, requireUser } from "@/lib/supabase/route";

// POST /api/liabilities/[id]/archive — sets the archive date; the Valuations
// and the link stay (design.md D9, D10).
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { supabase, responseCookies } = createRouteClient(request);
  const auth = await requireUser(supabase);
  if ("response" in auth) return auth.response;

  const { id } = await context.params;
  const loaded = await loadWritableLiability(supabase, id);
  if ("response" in loaded) return loaded.response;

  const { error } = await supabase.from("liability").update({ archived_at: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
  return jsonWithCookies({ id }, { status: 200 }, responseCookies);
}
