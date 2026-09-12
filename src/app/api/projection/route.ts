import { NextResponse, type NextRequest } from "next/server";
import { createRouteClient, jsonWithCookies, requireUser } from "@/lib/supabase/route";
import type { ProjectionAssumptions } from "@/components/portfolio/types";

const PROJECTION_COLUMNS = "growth_rate, monthly_contribution, contribution_escalation_rate, horizon_years";

/** `null` when the body isn't a well-formed `ProjectionAssumptions` — every
 * rate a finite number and the horizon a non-negative integer, mirroring
 * `readAllocations` in `/api/target-allocation`. Values outside a sane
 * range (a negative rate, a huge horizon) are accepted as-is: the User's
 * own "what if" is not this route's business to second-guess. */
function readAssumptions(body: unknown): ProjectionAssumptions | null {
  if (typeof body !== "object" || body === null) return null;
  const {
    growth_rate: growthRate,
    monthly_contribution: monthlyContribution,
    contribution_escalation_rate: contributionEscalationRate,
    horizon_years: horizonYears,
  } = body as Record<string, unknown>;

  if (typeof growthRate !== "number" || !Number.isFinite(growthRate)) return null;
  if (typeof monthlyContribution !== "number" || !Number.isFinite(monthlyContribution)) return null;
  if (typeof contributionEscalationRate !== "number" || !Number.isFinite(contributionEscalationRate)) {
    return null;
  }
  if (typeof horizonYears !== "number" || !Number.isInteger(horizonYears) || horizonYears < 0) {
    return null;
  }

  return {
    growth_rate: growthRate,
    monthly_contribution: monthlyContribution,
    contribution_escalation_rate: contributionEscalationRate,
    horizon_years: horizonYears,
  };
}

// GET /api/projection — the signed-in User's Projection assumptions, or
// `null` if they've never saved the form (there's no auto-created default
// row, unlike `portfolio`). RLS (`user_id = auth.uid()`) is what actually
// enforces isolation here.
export async function GET(request: NextRequest) {
  const { supabase, responseCookies } = createRouteClient(request);

  const auth = await requireUser(supabase);
  if ("response" in auth) return auth.response;

  const { data, error } = await supabase
    .from("projection")
    .select(PROJECTION_COLUMNS)
    .maybeSingle();

  if (error) {
    return jsonWithCookies({ error: error.message }, { status: 500 }, responseCookies);
  }

  return jsonWithCookies(data, { status: 200 }, responseCookies);
}

// PUT /api/projection — create or replace the caller's one assumption set
// (user stories 67, 68, 70, 72). Always an upsert keyed on `user_id`: there
// is exactly one active set per Portfolio, never named scenarios.
export async function PUT(request: NextRequest) {
  const { supabase, responseCookies } = createRouteClient(request);

  const auth = await requireUser(supabase);
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const assumptions = readAssumptions(body);
  if (assumptions === null) {
    return NextResponse.json(
      {
        error:
          "growth_rate, monthly_contribution and contribution_escalation_rate must be finite numbers, and horizon_years a non-negative integer.",
      },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("projection")
    .upsert({ user_id: auth.user.id, ...assumptions }, { onConflict: "user_id" })
    .select(PROJECTION_COLUMNS)
    .maybeSingle();

  if (error) {
    return jsonWithCookies({ error: error.message }, { status: 500 }, responseCookies);
  }

  return jsonWithCookies(data, { status: 200 }, responseCookies);
}
