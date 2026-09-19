import { NextResponse, type NextRequest } from "next/server";
import { isVisibleAssetClass } from "@/lib/asset-classes/visibility";
import { isValidCurrencyCode } from "@/lib/currency/iso4217";
import { HOLDING_COLUMNS } from "@/lib/holdings/columns";
import { readHeldAtPatch } from "@/lib/holdings/held-at";
import { readPriceLookupPatch } from "@/lib/holdings/price-lookup";
import { readSectorPatch } from "@/lib/holdings/sector";
import { hasKey, readTrimmedString } from "@/lib/http/body";
import { ensurePriceCached } from "@/lib/market-data/refresh-price";
import { createRouteClient, jsonWithCookies, requireUser } from "@/lib/supabase/route";

// PATCH /api/holdings/[id] — edit a Holding's name, Asset Class, currency,
// and/or its market symbol and quantity (user story 17; ticket 07 adds the
// last two), plus its Sector (ticket 18) and Held at (ticket 19). Every
// field is optional; whatever is present is validated the same way
// POST /api/holdings validates it.
export async function PATCH(request: NextRequest, context: RouteContext<"/api/holdings/[id]">) {
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

  const update: Record<string, string | number | null> = {};

  const priceLookup = readPriceLookupPatch(body);
  if (typeof priceLookup === "string") {
    return NextResponse.json({ error: priceLookup }, { status: 400 });
  }
  if (priceLookup) Object.assign(update, priceLookup);

  const sector = readSectorPatch(body);
  if (!sector.ok) {
    return NextResponse.json({ error: sector.error }, { status: 400 });
  }
  if (sector.value !== undefined) update.sector = sector.value;

  const heldAt = readHeldAtPatch(body);
  if (!heldAt.ok) {
    return NextResponse.json({ error: heldAt.error }, { status: 400 });
  }
  if (heldAt.value !== undefined) update.held_at = heldAt.value;

  if (hasKey(body, "name")) {
    const name = readTrimmedString(body, "name");
    if (name === undefined) {
      return NextResponse.json({ error: "name must be a non-empty string." }, { status: 400 });
    }
    update.name = name;
  }

  if (hasKey(body, "asset_class_id")) {
    const assetClassId = readTrimmedString(body, "asset_class_id");
    if (assetClassId === undefined || !(await isVisibleAssetClass(supabase, assetClassId))) {
      return NextResponse.json({ error: "Asset Class not found." }, { status: 400 });
    }
    update.asset_class_id = assetClassId;
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

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("holding")
    .update(update)
    .eq("id", id)
    .select(HOLDING_COLUMNS)
    .maybeSingle();

  if (error) {
    return jsonWithCookies({ error: error.message }, { status: 500 }, responseCookies);
  }

  if (!data) {
    return jsonWithCookies({ error: "Holding not found." }, { status: 404 }, responseCookies);
  }

  // Ticket 21: same fill-the-hole fetch as POST when the edit points the
  // Holding at a symbol nothing has priced yet.
  await ensurePriceCached(priceLookup?.price_lookup_symbol);

  return jsonWithCookies(data, { status: 200 }, responseCookies);
}

// DELETE /api/holdings/[id] — a true delete, cascading its Valuations. Not
// the primary removal path (see POST /api/holdings/[id]/archive for that);
// this exists for correcting a mistaken entry (user story 21). RLS
// (`user_id = auth.uid()`) means this can never delete another User's
// Holding regardless of what id is passed.
export async function DELETE(request: NextRequest, context: RouteContext<"/api/holdings/[id]">) {
  const { supabase, responseCookies } = createRouteClient(request);

  const auth = await requireUser(supabase);
  if ("response" in auth) return auth.response;

  const { id } = await context.params;

  const { data, error } = await supabase.from("holding").delete().eq("id", id).select("id");

  if (error) {
    return jsonWithCookies({ error: error.message }, { status: 500 }, responseCookies);
  }

  if (!data || data.length === 0) {
    return jsonWithCookies({ error: "Holding not found." }, { status: 404 }, responseCookies);
  }

  return jsonWithCookies({ id }, { status: 200 }, responseCookies);
}
