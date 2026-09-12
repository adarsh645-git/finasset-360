import { NextResponse, type NextRequest } from "next/server";
import { isVisibleAssetClass } from "@/lib/asset-classes/visibility";
import { createRouteClient, jsonWithCookies, requireUser } from "@/lib/supabase/route";

type AllocationInput = { asset_class_id: string; target_percent: number };

/** `null` when `body.allocations` isn't a well-formed array of
 * `{ asset_class_id: string, target_percent: a finite number >= 0 }` — the
 * caller gets a single 400 for the whole batch rather than a partial save,
 * since the Target Allocation editor always submits its full set of rows
 * together (docs/SPEC.md, user stories 112–113). A row's target_percent is
 * accepted as-is, including over 100 or a set that doesn't sum to 100 —
 * that's user story 113's "visible, not silently normalised" applied at the
 * API boundary too. */
function readAllocations(body: unknown): AllocationInput[] | null {
  if (typeof body !== "object" || body === null || !("allocations" in body)) return null;
  const allocations = (body as { allocations: unknown }).allocations;
  if (!Array.isArray(allocations)) return null;

  const parsed: AllocationInput[] = [];
  for (const entry of allocations) {
    if (typeof entry !== "object" || entry === null) return null;
    const { asset_class_id: assetClassId, target_percent: targetPercent } = entry as Record<
      string,
      unknown
    >;
    if (typeof assetClassId !== "string" || assetClassId.trim().length === 0) return null;
    if (typeof targetPercent !== "number" || !Number.isFinite(targetPercent) || targetPercent < 0) {
      return null;
    }
    parsed.push({ asset_class_id: assetClassId, target_percent: targetPercent });
  }
  return parsed;
}

// GET /api/target-allocation — every Target Allocation row the signed-in
// User has set. RLS (`user_id = auth.uid()`) is what enforces that this can
// never return another User's rows.
export async function GET(request: NextRequest) {
  const { supabase, responseCookies } = createRouteClient(request);

  const auth = await requireUser(supabase);
  if ("response" in auth) return auth.response;

  const { data, error } = await supabase
    .from("target_allocation")
    .select("asset_class_id, target_percent");

  if (error) {
    return jsonWithCookies({ error: error.message }, { status: 500 }, responseCookies);
  }

  return jsonWithCookies(data, { status: 200 }, responseCookies);
}

// PUT /api/target-allocation — replace the caller's target percent for
// every Asset Class in the body (user stories 112–113). Always an upsert
// keyed on (user_id, asset_class_id): the editor re-submits every row it
// shows each time it saves, so there is never a partial update to merge.
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

  const allocations = readAllocations(body);
  if (allocations === null) {
    return NextResponse.json(
      { error: "allocations must be an array of { asset_class_id, target_percent >= 0 }." },
      { status: 400 },
    );
  }

  // Mirrors POST /api/holdings: the foreign key only proves each Asset
  // Class exists, not that RLS would let this User read it, so visibility
  // is checked explicitly rather than left to the FK — in parallel, since
  // the editor can submit one row per Asset Class the User has.
  const visibility = await Promise.all(
    allocations.map((allocation) => isVisibleAssetClass(supabase, allocation.asset_class_id)),
  );
  if (visibility.some((isVisible) => !isVisible)) {
    return NextResponse.json({ error: "Asset Class not found." }, { status: 400 });
  }

  if (allocations.length === 0) {
    return jsonWithCookies([], { status: 200 }, responseCookies);
  }

  const { data, error } = await supabase
    .from("target_allocation")
    .upsert(
      allocations.map((allocation) => ({
        user_id: auth.user.id,
        asset_class_id: allocation.asset_class_id,
        target_percent: allocation.target_percent,
      })),
      { onConflict: "user_id,asset_class_id" },
    )
    .select("asset_class_id, target_percent");

  if (error) {
    return jsonWithCookies({ error: error.message }, { status: 500 }, responseCookies);
  }

  return jsonWithCookies(data, { status: 200 }, responseCookies);
}
