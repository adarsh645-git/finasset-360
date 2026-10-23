import type { SupabaseClient } from "@supabase/supabase-js";
import type { NextResponse } from "next/server";
import { todayIsoDate } from "@/lib/date/today";
import { errorResponse } from "@/lib/holdings/store";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type StoredLiability = { id: string; country: string; archived_at: string | null };

/** The User's own active Liability, or the 404 / 409 response a write to it must return. RLS hides other Users' rows, so they read as missing. */
export async function loadWritableLiability(
  supabase: SupabaseClient,
  id: string,
): Promise<{ liability: StoredLiability } | { response: NextResponse }> {
  const notFound = { response: errorResponse("Liability not found.", 404) };
  if (!UUID.test(id)) return notFound;
  const { data, error } = await supabase
    .from("liability")
    .select("id, country, archived_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return notFound;
  if (data.archived_at) return { response: errorResponse("This Liability is archived and read-only.", 409) };
  return { liability: data as StoredLiability };
}

/** An error message when `holdingId` can't be linked from a Liability, else `null` (design.md D9). `ownId` is the Liability being edited, so its own link isn't a clash. */
export async function linkProblem(
  supabase: SupabaseClient,
  holdingId: string,
  ownId: string | null,
): Promise<string | null> {
  const invalid = "Link a loan only to one of your active Holdings.";
  if (!UUID.test(holdingId)) return invalid;
  const { data: holding, error } = await supabase
    .from("holding")
    .select("id, archived_at")
    .eq("id", holdingId)
    .maybeSingle();
  if (error) throw error;
  if (!holding || holding.archived_at) return invalid;

  let query = supabase.from("liability").select("id").eq("linked_holding_id", holdingId).is("archived_at", null);
  if (ownId) query = query.neq("id", ownId);
  const { data: clash, error: clashError } = await query;
  if (clashError) throw clashError;
  if (clash.length > 0) return "That Holding already has an active loan linked.";
  return null;
}

/** Records today's balance Valuation, replacing any earlier one from the same day (design.md D7). */
export async function recordTodayBalance(
  supabase: SupabaseClient,
  userId: string,
  liabilityId: string,
  balance: number,
): Promise<void> {
  const { error } = await supabase.from("liability_valuation").upsert(
    { user_id: userId, liability_id: liabilityId, valued_on: todayIsoDate(), balance },
    { onConflict: "liability_id,valued_on" },
  );
  if (error) throw error;
}
