import type { NextRequest } from "next/server";
import { computeNetWorth } from "@/lib/net-worth/compute";
import { createRouteClient, jsonWithCookies, requireUser } from "@/lib/supabase/route";
import { latestValuationByHolding, latestValuationByLiability } from "@/lib/valuations/latest";
import type { HoldingValuation, LiabilityValuation } from "@/components/portfolio/types";

/** Current Net Worth (user story 19's own rule: active owners' latest
 * Valuations only), computed the same way PortfolioShell computes it
 * client-side — reimplemented here because a Check-in's recorded figure must
 * come from the server, never a client-supplied number. */
async function computeCurrentNetWorth(
  supabase: Awaited<ReturnType<typeof createRouteClient>>["supabase"],
): Promise<{ netWorth: number } | { error: string }> {
  const [holdingsResult, liabilitiesResult] = await Promise.all([
    supabase.from("holding").select("id").is("archived_at", null),
    supabase.from("liability").select("id").is("archived_at", null),
  ]);
  if (holdingsResult.error) return { error: holdingsResult.error.message };
  if (liabilitiesResult.error) return { error: liabilitiesResult.error.message };

  const holdingIds = (holdingsResult.data ?? []).map((h) => h.id as string);
  const liabilityIds = (liabilitiesResult.data ?? []).map((l) => l.id as string);

  const [holdingValuationsResult, liabilityValuationsResult] = await Promise.all([
    holdingIds.length
      ? supabase
          .from("holding_valuation")
          .select("id, holding_id, amount, fx_rate_to_home, home_currency_at_recording, recorded_at")
          .in("holding_id", holdingIds)
          .order("recorded_at", { ascending: false })
      : Promise.resolve({ data: [] as HoldingValuation[], error: null }),
    liabilityIds.length
      ? supabase
          .from("liability_valuation")
          .select("id, liability_id, amount, fx_rate_to_home, home_currency_at_recording, recorded_at")
          .in("liability_id", liabilityIds)
          .order("recorded_at", { ascending: false })
      : Promise.resolve({ data: [] as LiabilityValuation[], error: null }),
  ]);
  if (holdingValuationsResult.error) return { error: holdingValuationsResult.error.message };
  if (liabilityValuationsResult.error) return { error: liabilityValuationsResult.error.message };

  const latestHoldingValuations = [
    ...latestValuationByHolding(holdingValuationsResult.data as HoldingValuation[]).values(),
  ];
  const latestLiabilityValuations = [
    ...latestValuationByLiability(liabilityValuationsResult.data as LiabilityValuation[]).values(),
  ];

  return { netWorth: computeNetWorth(latestHoldingValuations, latestLiabilityValuations).netWorth };
}

// POST /api/check-in — completes a Check-in pass (ticket 08, user stories
// 39-46). Takes no body: the pass itself (choosing all-or-stale, stepping
// through Holdings, recording or skipping each) is entirely client-side
// bookkeeping over the existing per-Holding record-Valuation endpoint, which
// is what "confirming an unchanged value never records a duplicate" already
// falls out of — this route's only job is the one thing that can't happen
// client-side: computing the authoritative Net Worth figure and reading what
// the previous pass's figure was, so the delta this pass ends with is never
// something a client could desync from what's actually recorded.
export async function POST(request: NextRequest) {
  const { supabase, responseCookies } = createRouteClient(request);

  const auth = await requireUser(supabase);
  if ("response" in auth) return auth.response;

  const [previousCheckInResult, netWorthResult] = await Promise.all([
    supabase
      .from("check_in")
      .select("net_worth")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    computeCurrentNetWorth(supabase),
  ]);

  if (previousCheckInResult.error) {
    return jsonWithCookies(
      { error: previousCheckInResult.error.message },
      { status: 500 },
      responseCookies,
    );
  }
  if ("error" in netWorthResult) {
    return jsonWithCookies({ error: netWorthResult.error }, { status: 500 }, responseCookies);
  }

  const { netWorth } = netWorthResult;
  const previousNetWorth: number | null = previousCheckInResult.data?.net_worth ?? null;

  const { data: inserted, error: insertError } = await supabase
    .from("check_in")
    .insert({ user_id: auth.user.id, net_worth: netWorth })
    .select("net_worth, completed_at")
    .single();

  if (insertError) {
    return jsonWithCookies({ error: insertError.message }, { status: 500 }, responseCookies);
  }

  return jsonWithCookies(
    {
      netWorth: inserted.net_worth,
      completedAt: inserted.completed_at,
      previousNetWorth,
      delta: previousNetWorth === null ? null : inserted.net_worth - previousNetWorth,
    },
    { status: 200 },
    responseCookies,
  );
}
