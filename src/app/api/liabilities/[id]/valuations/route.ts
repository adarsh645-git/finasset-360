import { NextResponse, type NextRequest } from "next/server";
import { resolveFxRate } from "@/lib/fx/rate";
import { hasKey } from "@/lib/http/body";
import { createRouteClient, jsonWithCookies, requireUser } from "@/lib/supabase/route";

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/** `undefined` when `amount` is missing or not a finite JSON number. */
function readAmount(body: unknown): number | undefined {
  if (!hasKey(body, "amount")) return undefined;
  const value = (body as { amount: unknown }).amount;
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/** `undefined` when `recorded_at` is omitted (caller defaults to today),
 * `null` when it's present but not a well-formed `YYYY-MM-DD` date. */
function readRecordedAt(body: unknown): string | undefined | null {
  if (!hasKey(body, "recorded_at")) return undefined;
  const value = (body as { recorded_at: unknown }).recorded_at;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return Number.isNaN(Date.parse(value)) ? null : value;
}

// POST /api/liabilities/[id]/valuations — record (or, on the same date,
// correct) a Liability's balance (user story 28). Mirrors
// POST /api/holdings/[id]/valuations exactly — same backdating, same
// one-per-day upsert, same FX-at-recording capture — because recording a
// Liability's balance works identically to recording a Holding's value.
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/liabilities/[id]/valuations">,
) {
  const { supabase, responseCookies } = createRouteClient(request);

  const auth = await requireUser(supabase);
  if ("response" in auth) return auth.response;

  const { id: liabilityId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const amount = readAmount(body);
  if (amount === undefined) {
    return NextResponse.json({ error: "amount must be a finite number." }, { status: 400 });
  }

  const today = todayIsoDate();
  const recordedAtInput = readRecordedAt(body);
  if (recordedAtInput === null) {
    return NextResponse.json(
      { error: "recorded_at must be a YYYY-MM-DD date." },
      { status: 400 },
    );
  }
  const recordedAt = recordedAtInput ?? today;
  if (recordedAt > today) {
    return NextResponse.json({ error: "recorded_at cannot be in the future." }, { status: 400 });
  }

  // Confirms the Liability exists and is this caller's own — RLS
  // (`user_id = auth.uid()`) makes another User's liability_id come back as
  // no row rather than someone else's data, so this doubles as the
  // ownership check without a separate one.
  const { data: liability, error: liabilityError } = await supabase
    .from("liability")
    .select("id, currency")
    .eq("id", liabilityId)
    .maybeSingle();

  if (liabilityError) {
    return jsonWithCookies({ error: liabilityError.message }, { status: 500 }, responseCookies);
  }
  if (!liability) {
    return jsonWithCookies({ error: "Liability not found." }, { status: 404 }, responseCookies);
  }

  const { data: portfolio, error: portfolioError } = await supabase
    .from("portfolio")
    .select("home_currency")
    .maybeSingle();

  if (portfolioError || !portfolio) {
    return jsonWithCookies(
      { error: portfolioError?.message ?? "Portfolio not found." },
      { status: 500 },
      responseCookies,
    );
  }

  const fxRate = await resolveFxRate(supabase, liability.currency, portfolio.home_currency);
  if (fxRate === null) {
    return jsonWithCookies(
      { error: "Could not determine an exchange rate right now. Try again shortly." },
      { status: 502 },
      responseCookies,
    );
  }

  const { data, error } = await supabase
    .from("liability_valuation")
    .upsert(
      {
        user_id: auth.user.id,
        liability_id: liabilityId,
        amount,
        fx_rate_to_home: fxRate,
        home_currency_at_recording: portfolio.home_currency,
        recorded_at: recordedAt,
      },
      { onConflict: "liability_id,recorded_at" },
    )
    .select("id, liability_id, amount, fx_rate_to_home, home_currency_at_recording, recorded_at")
    .single();

  if (error) {
    return jsonWithCookies({ error: error.message }, { status: 500 }, responseCookies);
  }

  return jsonWithCookies(data, { status: 200 }, responseCookies);
}
