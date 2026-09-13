import type { SupabaseClient } from "@supabase/supabase-js";

// Whether `holdingId` names a Holding the caller owns — RLS
// (`user_id = auth.uid()`) means another User's Holding simply doesn't come
// back, the same trick src/lib/liability-classes/visibility.ts's
// isVisibleLiabilityClass uses for visibility. Used by
// PATCH /api/liabilities/[id] to validate `linked_holding_id` (ticket 11).
export async function isOwnedHolding(supabase: SupabaseClient, holdingId: string): Promise<boolean> {
  const { data } = await supabase.from("holding").select("id").eq("id", holdingId).maybeSingle();
  return data !== null;
}
