import { NextResponse, type NextRequest } from "next/server";
import { isCashAssetClass } from "@/lib/asset-classes/defaults";
import { isVisibleAssetClass } from "@/lib/asset-classes/visibility";
import { isValidCurrencyCode } from "@/lib/currency/iso4217";
import { HOLDING_COLUMNS } from "@/lib/holdings/columns";
import { readHeldAtPatch } from "@/lib/holdings/held-at";
import {
  CASH_PRICE_LOOKUP_ERROR,
  readPriceLookupPatch,
  setsPriceLookup,
} from "@/lib/holdings/price-lookup";
import { readSectorPatch } from "@/lib/holdings/sector";
import { readTrimmedString } from "@/lib/http/body";
import { ensurePriceCached } from "@/lib/market-data/refresh-price";
import { createRouteClient, jsonWithCookies, requireUser } from "@/lib/supabase/route";

// GET /api/holdings — every active (non-archived) Holding the signed-in
// User owns. RLS (`user_id = auth.uid()`) is what enforces that this can
// never return another User's Holdings; the `archived_at` filter is what
// makes an archived one behave, from here, like it's gone (ticket 06).
export async function GET(request: NextRequest) {
  const { supabase, responseCookies } = createRouteClient(request);

  const auth = await requireUser(supabase);
  if ("response" in auth) return auth.response;

  const { data, error } = await supabase
    .from("holding")
    .select(HOLDING_COLUMNS)
    .is("archived_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    return jsonWithCookies({ error: error.message }, { status: 500 }, responseCookies);
  }

  return jsonWithCookies(data, { status: 200 }, responseCookies);
}

// POST /api/holdings — add a Holding under an Asset Class (user stories 12,
// 13), optionally with a market symbol and quantity to give it a Live
// Estimate (ticket 07; user stories 32-38), plus optional Sector (ticket 18)
// and Held at (ticket 19). Body: { name, asset_class_id, currency,
// price_lookup_symbol?, quantity?, sector?, held_at? } —
// price_lookup_symbol/quantity must be present together or not at all;
// sector and held_at are each independent of that pair and of each other.
// A symbol with no cached price yet is priced immediately (ticket 21).
// A Cash Holding (ticket 22) refuses a non-null symbol/quantity pair.
export async function POST(request: NextRequest) {
  const { supabase, responseCookies } = createRouteClient(request);

  const auth = await requireUser(supabase);
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const name = readTrimmedString(body, "name");
  const assetClassId = readTrimmedString(body, "asset_class_id");
  const currency = readTrimmedString(body, "currency");

  if (name === undefined) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }
  if (assetClassId === undefined) {
    return NextResponse.json({ error: "asset_class_id is required." }, { status: 400 });
  }
  if (currency === undefined || !isValidCurrencyCode(currency)) {
    return NextResponse.json(
      { error: "currency must be a valid ISO 4217 currency code." },
      { status: 400 },
    );
  }

  const priceLookup = readPriceLookupPatch(body);
  if (typeof priceLookup === "string") {
    return NextResponse.json({ error: priceLookup }, { status: 400 });
  }

  const sector = readSectorPatch(body);
  if (!sector.ok) {
    return NextResponse.json({ error: sector.error }, { status: 400 });
  }

  const heldAt = readHeldAtPatch(body);
  if (!heldAt.ok) {
    return NextResponse.json({ error: heldAt.error }, { status: 400 });
  }

  // Refused rather than silently dropped (ticket 22): the Cash form never
  // sends these, so a request that does is a client bug worth surfacing.
  if (isCashAssetClass(assetClassId) && setsPriceLookup(priceLookup)) {
    return NextResponse.json({ error: CASH_PRICE_LOOKUP_ERROR }, { status: 400 });
  }

  if (!(await isVisibleAssetClass(supabase, assetClassId))) {
    return NextResponse.json({ error: "Asset Class not found." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("holding")
    .insert({
      user_id: auth.user.id,
      asset_class_id: assetClassId,
      name,
      currency,
      ...priceLookup,
      ...(sector.value !== undefined ? { sector: sector.value } : {}),
      ...(heldAt.value !== undefined ? { held_at: heldAt.value } : {}),
    })
    .select(HOLDING_COLUMNS)
    .single();

  if (error) {
    return jsonWithCookies({ error: error.message }, { status: 500 }, responseCookies);
  }

  // Ticket 21: a brand-new symbol has no `price_cache` row until tomorrow's
  // cron run, so fetch it now — awaited so the client's follow-up read
  // already sees it. A failure never fails the add (the Holding is saved).
  await ensurePriceCached(priceLookup?.price_lookup_symbol);

  return jsonWithCookies(data, { status: 201 }, responseCookies);
}
