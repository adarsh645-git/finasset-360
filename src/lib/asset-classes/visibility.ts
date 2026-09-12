import type { SupabaseClient } from "@supabase/supabase-js";

// A Holding's asset_class_id must name an Asset Class the caller can
// actually see (a global default, or their own custom one) — checked
// explicitly by both the create and update Holding routes rather than left
// to the foreign key, since the FK only proves the row exists, not that RLS
// would let this User read it.
export async function isVisibleAssetClass(
  supabase: SupabaseClient,
  assetClassId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("asset_class")
    .select("id")
    .eq("id", assetClassId)
    .maybeSingle();
  return data !== null;
}
