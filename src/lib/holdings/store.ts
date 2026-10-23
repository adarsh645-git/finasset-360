import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { todayIsoDate } from "@/lib/date/today";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type StoredHolding = { id: string; country: string; asset_class: string; archived_at: string | null };

export const errorResponse = (error: string, status: number) => NextResponse.json({ error }, { status });

/** The countries a Holding may name (shared data, design.md D2). */
export async function loadCountryCodes(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await supabase.from("country").select("code");
  if (error) throw error;
  return data.map((row) => row.code as string);
}

/** The User's own active Holding, or the 404 / 409 response a write to it must return. RLS hides other Users' rows, so they read as missing. */
export async function loadWritableHolding(
  supabase: SupabaseClient,
  id: string,
): Promise<{ holding: StoredHolding } | { response: NextResponse }> {
  const notFound = { response: errorResponse("Holding not found.", 404) };
  if (!UUID.test(id)) return notFound;
  const { data, error } = await supabase
    .from("holding")
    .select("id, country, asset_class, archived_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return notFound;
  if (data.archived_at) return { response: errorResponse("This Holding is archived and read-only.", 409) };
  return { holding: data as StoredHolding };
}

/** Removes a just-inserted Holding after a later write failed; its own error is swallowed so the original failure surfaces. */
export async function rollbackHolding(supabase: SupabaseClient, id: string): Promise<void> {
  await supabase.from("holding").delete().eq("id", id);
}

/** Records today's Valuation, replacing any earlier one from the same day (design.md D7). */
export async function recordTodayValuation(
  supabase: SupabaseClient,
  userId: string,
  holdingId: string,
  value: number,
): Promise<void> {
  const { error } = await supabase.from("holding_valuation").upsert(
    { user_id: userId, holding_id: holdingId, valued_on: todayIsoDate(), value, source: "user" },
    { onConflict: "holding_id,valued_on" },
  );
  if (error) throw error;
}
