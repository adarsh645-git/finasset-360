import { NextResponse, type NextRequest } from "next/server";
import { isValidCurrencyCode } from "@/lib/currency/iso4217";
import { createRouteClient, jsonWithCookies, requireUser } from "@/lib/supabase/route";

// GET /api/portfolio — the signed-in User's own Portfolio (created
// automatically on first sign-in; see supabase/migrations for the trigger).
// RLS (`user_id = auth.uid()`) is what actually enforces isolation here —
// this handler doesn't add its own tenancy filter, per ADR 0001.
export async function GET(request: NextRequest) {
  const { supabase, responseCookies } = createRouteClient(request);

  const auth = await requireUser(supabase);
  if ("response" in auth) return auth.response;

  const { data, error } = await supabase
    .from("portfolio")
    .select("user_id, home_currency")
    .maybeSingle();

  if (error) {
    return jsonWithCookies({ error: error.message }, { status: 500 }, responseCookies);
  }

  if (!data) {
    // Shouldn't happen — the on_auth_user_created trigger creates this row
    // at sign-up time — but a 404 here is more honest than a fabricated one.
    return jsonWithCookies({ error: "Portfolio not found." }, { status: 404 }, responseCookies);
  }

  return jsonWithCookies(data, { status: 200 }, responseCookies);
}

// PATCH /api/portfolio — set/change the home currency (user story 3 in
// docs/SPEC.md). Body: { home_currency: string }.
export async function PATCH(request: NextRequest) {
  const { supabase, responseCookies } = createRouteClient(request);

  const auth = await requireUser(supabase);
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const homeCurrency =
    typeof body === "object" && body !== null && "home_currency" in body
      ? (body as { home_currency: unknown }).home_currency
      : undefined;

  if (typeof homeCurrency !== "string" || !isValidCurrencyCode(homeCurrency)) {
    return NextResponse.json(
      { error: "home_currency must be a valid ISO 4217 currency code." },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("portfolio")
    .update({ home_currency: homeCurrency })
    // The `.eq` here is not a tenancy filter — RLS (`user_id = auth.uid()`)
    // already guarantees this UPDATE can never touch another User's row
    // regardless of this clause, as tests/route/portfolio.test.ts asserts
    // directly. It's here only because Postgres' safe-update mode rejects
    // an UPDATE with no WHERE clause at all.
    .eq("user_id", auth.user.id)
    .select("user_id, home_currency")
    .maybeSingle();

  if (error) {
    return jsonWithCookies({ error: error.message }, { status: 500 }, responseCookies);
  }

  if (!data) {
    // RLS silently narrows the UPDATE to zero rows rather than raising —
    // this is the "attempt it through the route boundary" case ticket 01
    // asks for: User A targeting User B's row lands here with a 404, never
    // a mutated row.
    return jsonWithCookies({ error: "Portfolio not found." }, { status: 404 }, responseCookies);
  }

  return jsonWithCookies(data, { status: 200 }, responseCookies);
}
