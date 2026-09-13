import { NextResponse, type NextRequest } from "next/server";
import { isVisibleLiabilityClass } from "@/lib/liability-classes/visibility";
import { isValidCurrencyCode } from "@/lib/currency/iso4217";
import { readAmortizationPatch } from "@/lib/liabilities/amortization";
import { LIABILITY_COLUMNS } from "@/lib/liabilities/columns";
import { isOwnedHolding } from "@/lib/holdings/ownership";
import { hasKey, readTrimmedString } from "@/lib/http/body";
import { createRouteClient, jsonWithCookies, requireUser } from "@/lib/supabase/route";

// PATCH /api/liabilities/[id] — edit a Liability's name, Liability Class,
// currency (user story 17), and/or Amortization Assumptions (ticket 11,
// user stories 57–61, 64): every field is independently optional, an
// omitted key leaves the column as-is. A nullable Amortization field
// (everything except extra_monthly_payment/escrow_portion, which always
// default to 0) accepts an explicit `null` to clear it back to "not
// entered" — the same "populated together" question doesn't arise here the
// way it does for a Holding's price-lookup pair, since any subset of these
// fields is a meaningful, independently-useful state (docs/SPEC.md: "any
// Liability opts in by filling the fields").
export async function PATCH(request: NextRequest, context: RouteContext<"/api/liabilities/[id]">) {
  const { supabase, responseCookies } = createRouteClient(request);

  const auth = await requireUser(supabase);
  if ("response" in auth) return auth.response;

  const { id } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const update: Record<string, unknown> = {};

  if (hasKey(body, "name")) {
    const name = readTrimmedString(body, "name");
    if (name === undefined) {
      return NextResponse.json({ error: "name must be a non-empty string." }, { status: 400 });
    }
    update.name = name;
  }

  if (hasKey(body, "liability_class_id")) {
    const liabilityClassId = readTrimmedString(body, "liability_class_id");
    if (liabilityClassId === undefined || !(await isVisibleLiabilityClass(supabase, liabilityClassId))) {
      return NextResponse.json({ error: "Liability Class not found." }, { status: 400 });
    }
    update.liability_class_id = liabilityClassId;
  }

  if (hasKey(body, "currency")) {
    const currency = readTrimmedString(body, "currency");
    if (currency === undefined || !isValidCurrencyCode(currency)) {
      return NextResponse.json(
        { error: "currency must be a valid ISO 4217 currency code." },
        { status: 400 },
      );
    }
    update.currency = currency;
  }

  const amortizationPatch = readAmortizationPatch(body);
  if (typeof amortizationPatch === "string") {
    return NextResponse.json({ error: amortizationPatch }, { status: 400 });
  }
  Object.assign(update, amortizationPatch);

  if (hasKey(body, "linked_holding_id")) {
    const value = (body as Record<string, unknown>).linked_holding_id;
    if (value !== null && (typeof value !== "string" || !(await isOwnedHolding(supabase, value)))) {
      return NextResponse.json({ error: "linked_holding_id must name a Holding you own, or null." }, {
        status: 400,
      });
    }
    update.linked_holding_id = value;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("liability")
    .update(update)
    .eq("id", id)
    .select(LIABILITY_COLUMNS)
    .maybeSingle();

  if (error) {
    return jsonWithCookies({ error: error.message }, { status: 500 }, responseCookies);
  }

  if (!data) {
    return jsonWithCookies({ error: "Liability not found." }, { status: 404 }, responseCookies);
  }

  return jsonWithCookies(data, { status: 200 }, responseCookies);
}

// DELETE /api/liabilities/[id] — a true delete, cascading its Valuations.
// Mirrors DELETE /api/holdings/[id]: not the primary removal path (see
// POST /api/liabilities/[id]/archive), only for correcting a mistake. RLS
// means this can never delete another User's Liability regardless of what
// id is passed.
export async function DELETE(request: NextRequest, context: RouteContext<"/api/liabilities/[id]">) {
  const { supabase, responseCookies } = createRouteClient(request);

  const auth = await requireUser(supabase);
  if ("response" in auth) return auth.response;

  const { id } = await context.params;

  const { data, error } = await supabase.from("liability").delete().eq("id", id).select("id");

  if (error) {
    return jsonWithCookies({ error: error.message }, { status: 500 }, responseCookies);
  }

  if (!data || data.length === 0) {
    return jsonWithCookies({ error: "Liability not found." }, { status: 404 }, responseCookies);
  }

  return jsonWithCookies({ id }, { status: 200 }, responseCookies);
}
