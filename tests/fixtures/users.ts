import { createClient } from "@supabase/supabase-js";

// Seam 2 (docs/SPEC.md) needs two distinct *authenticated* Users against a
// real local Postgres with RLS enabled. The app only ever signs a User in
// via Google OAuth, which a test suite can't drive headlessly — so fixtures
// create a User the same way Supabase Auth itself would land one in
// `auth.users` (via the admin API, using the service-role key that bypasses
// RLS), which fires the same `on_auth_user_created` trigger a real Google
// sign-in would. From there, signing in with a password is just how the
// test obtains a real access token for that same `auth.users` row — the
// thing under test (the Portfolio row, RLS, the route handlers) doesn't
// know or care which provider produced the session.
function requireTestEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Route-boundary tests need a local Supabase stack — run \`supabase start\` and copy its output into .env.test.local (see .env.example).`,
    );
  }
  return value;
}

function adminClient() {
  return createClient(
    requireTestEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireTestEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

function anonClient() {
  return createClient(
    requireTestEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireTestEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export type TestUser = {
  id: string;
  email: string;
  password: string;
  accessToken: string;
};

/** Creates a fresh, confirmed User and returns a signed-in session for it. */
export async function createTestUser(label: string): Promise<TestUser> {
  const admin = adminClient();
  const email = `${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`;
  const password = `${Math.random().toString(36).slice(2)}Aa1!`;

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    throw new Error(`Failed to create test user: ${createError?.message}`);
  }

  const { accessToken } = await signIn(email, password);

  return { id: created.user.id, email, password, accessToken };
}

/** Re-authenticates an existing test User, simulating a repeat sign-in. */
export async function signIn(email: string, password: string): Promise<{ accessToken: string }> {
  const anon = anonClient();
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new Error(`Failed to sign in test user: ${error?.message}`);
  }
  return { accessToken: data.session.access_token };
}

export async function deleteTestUser(userId: string): Promise<void> {
  const admin = adminClient();
  await admin.auth.admin.deleteUser(userId);
}

/** Row count for a User's Portfolio, read with the service-role key (bypasses RLS) — used only to assert on DB state directly, never as a substitute for going through the route boundary. */
export async function countPortfolioRows(userId: string): Promise<number> {
  const admin = adminClient();
  const { count, error } = await admin
    .from("portfolio")
    .select("user_id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) throw error;
  return count ?? 0;
}
