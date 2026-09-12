import type { SupabaseClient } from "@supabase/supabase-js";

// A Liability's liability_class_id must name a Liability Class the caller
// can actually see (a global default, or their own custom one) — mirrors
// src/lib/asset-classes/visibility.ts's reasoning for Holding/Asset Class.
export async function isVisibleLiabilityClass(
  supabase: SupabaseClient,
  liabilityClassId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("liability_class")
    .select("id")
    .eq("id", liabilityClassId)
    .maybeSingle();
  return data !== null;
}
