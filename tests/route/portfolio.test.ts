import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GET, PATCH } from "@/app/api/portfolio/route";
import { countPortfolioRows, createTestUser, signIn, deleteTestUser, type TestUser } from "../fixtures/users";

// Seam 2 from docs/SPEC.md: requests in, responses out, against a real local
// Postgres with RLS actually enabled. Nothing here mocks the database — the
// route handlers imported above run their real Supabase queries against
// whatever `supabase start` is running. Requires .env.test.local (see
// .env.example) pointed at that local stack.
const PORTFOLIO_URL = "http://localhost:3000/api/portfolio";

function requestAs(
  user: TestUser,
  init: { method?: string; headers?: Record<string, string>; body?: string } = {},
) {
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${user.accessToken}`);
  return new NextRequest(PORTFOLIO_URL, { method: init.method, headers, body: init.body });
}

describe("GET/PATCH /api/portfolio", () => {
  let userA: TestUser;
  let userB: TestUser;

  beforeAll(async () => {
    [userA, userB] = await Promise.all([createTestUser("user-a"), createTestUser("user-b")]);
  });

  afterAll(async () => {
    await Promise.all([deleteTestUser(userA.id), deleteTestUser(userB.id)]);
  });

  it("creates exactly one portfolio row on first sign-in", async () => {
    expect(await countPortfolioRows(userA.id)).toBe(1);
  });

  it("does not create a second row when the same User signs in again", async () => {
    // A real Google sign-in re-authenticates the same auth.users row rather
    // than inserting a new one, so the on_auth_user_created trigger (which
    // only fires on INSERT) never runs twice for one identity. Re-signing
    // in here exercises that same "existing identity, new session" path.
    await signIn(userA.email, userA.password);
    await signIn(userA.email, userA.password);
    expect(await countPortfolioRows(userA.id)).toBe(1);
  });

  it("returns the signed-in User's own portfolio with a default home currency", async () => {
    const response = await GET(requestAs(userB));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ user_id: userB.id, home_currency: "USD" });
  });

  it("rejects a request with no session", async () => {
    const response = await GET(new NextRequest(PORTFOLIO_URL));
    expect(response.status).toBe(401);
  });

  it("lets a User set and change their home currency", async () => {
    const first = await PATCH(
      requestAs(userA, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ home_currency: "EUR" }),
      }),
    );
    expect(first.status).toBe(200);
    expect((await first.json()).home_currency).toBe("EUR");

    const second = await PATCH(
      requestAs(userA, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ home_currency: "JPY" }),
      }),
    );
    expect(second.status).toBe(200);
    expect((await second.json()).home_currency).toBe("JPY");

    const readBack = await GET(requestAs(userA));
    expect((await readBack.json()).home_currency).toBe("JPY");
  });

  it("rejects a currency code that isn't valid ISO 4217", async () => {
    const response = await PATCH(
      requestAs(userB, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ home_currency: "NOTACODE" }),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("never returns another User's portfolio, however it's read", async () => {
    const asA = await GET(requestAs(userA));
    const asB = await GET(requestAs(userB));
    expect((await asA.json()).user_id).toBe(userA.id);
    expect((await asB.json()).user_id).toBe(userB.id);
  });

  it("PATCH through the route only ever touches the caller's own row", async () => {
    // The route boundary itself: call the actual exported PATCH handler as
    // User A, then confirm — reading via the same exported GET handler as
    // User B — that B's row is untouched. `/api/portfolio` never accepts a
    // target user_id at all (it always operates on "my own row" via
    // auth.uid()), so there's no way to *ask* the route to write to another
    // User's row in the first place; this proves that structural guarantee
    // rather than merely restating it.
    const patchAsA = await PATCH(
      requestAs(userA, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ home_currency: "GBP" }),
      }),
    );
    expect(patchAsA.status).toBe(200);

    const stillB = await GET(requestAs(userB));
    expect((await stillB.json()).home_currency).toBe("USD");
  });

  it("RLS refuses User A writing to User B's portfolio row, even targeted explicitly", async () => {
    // The route's API shape structurally prevents naming a target user_id
    // (previous test), which is the strongest form of the guarantee but
    // can't literally exercise "User A attempts to write User B's row"
    // through HTTP, since that request has nowhere to put B's id. This test
    // drops one level below the route — reusing the same authenticated
    // Supabase client construction createRouteClient uses for a bearer
    // token — to perform that exact attempt directly against real Postgres.
    // This is the ticket 01 case: "asserted by attempting it through the
    // route boundary, not by inspecting policy definitions" — no
    // pg_policies lookup, a real attempted write, RLS is what stops it.
    const asUserA = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${userA.accessToken}` } } },
    );

    const { data: updated } = await asUserA
      .from("portfolio")
      .update({ home_currency: "GBP" })
      .eq("user_id", userB.id)
      .select();
    expect(updated).toEqual([]);

    const { data: read } = await asUserA.from("portfolio").select().eq("user_id", userB.id);
    expect(read).toEqual([]);

    // Confirm User B's row is untouched by the attempted write.
    const stillB = await GET(requestAs(userB));
    expect((await stillB.json()).home_currency).toBe("USD");
  });
});
