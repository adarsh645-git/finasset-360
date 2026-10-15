// Local-only dev convenience: resets one fixed dev user's records and prints a
// one-time sign-in link so `npm run dev` never has to stop at /login locally.
//
// The data seeding is deliberately gone for now: the schema was replaced by
// redesign-data-model ticket 2, and ticket 10 of that change rebuilds the
// prototype-shaped dataset. Until then this only clears the dev user's rows.
//
// Uses the service-role key exactly the way tests/fixtures/users.ts does:
// the app only signs in via Google OAuth, which this script can't drive, so it
// reaches the same end state (a real row in auth.users, a real session)
// through Admin API calls instead. Never touches auth.users beyond looking
// the dev user up.

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const DEV_EMAIL = "adarsh645@gmail.com";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} in .env.local — run \`npx supabase start\` first (see README).`);
  }
  return value;
}

function adminClient(url, serviceKey) {
  return createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function main() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  const isLocal = /^(https?:\/\/)?(127\.0\.0\.1|localhost)(:\d+)?/.test(url);
  if (!isLocal) {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL (${url}) doesn't look like a local Supabase instance — refusing to seed. ` +
        "This script wipes real data and must never run against a hosted project.",
    );
  }

  const admin = adminClient(url, serviceKey);

  const { data: userList, error: listError } = await admin.auth.admin.listUsers();
  if (listError) throw new Error(`Could not list local users: ${listError.message}`);
  let user = userList.users.find((u) => u.email === DEV_EMAIL);
  if (!user) {
    // Created the way a Google sign-in would: the on_auth_user_created
    // trigger then makes their Portfolio row.
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: DEV_EMAIL,
      email_confirm: true,
    });
    if (createError || !created.user) {
      throw new Error(`Failed to create local dev user: ${createError?.message}`);
    }
    user = created.user;
  }

  // Liability before Holding: a loan's link points at a Holding. Valuations
  // and Positions cascade from their owners.
  for (const table of ["liability", "holding", "goal", "country_assumption"]) {
    const { error } = await admin.from(table).delete().eq("user_id", user.id);
    if (error) throw new Error(`Failed clearing ${table}: ${error.message}`);
  }
  console.log(`Cleared ${DEV_EMAIL}'s records.`);

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: DEV_EMAIL,
    // 127.0.0.1, not localhost: must match supabase/config.toml's
    // site_url/additional_redirect_urls exactly, or GoTrue silently drops this
    // redirect_to. /auth/dev-signin, not /auth/callback: a magiclink hands off
    // tokens via the URL fragment, which only client-side JS can read.
    options: { redirectTo: "http://127.0.0.1:3000/auth/dev-signin" },
  });
  if (linkError) throw new Error(`Failed generating sign-in link: ${linkError.message}`);

  console.log("\nOpen this once to sign in (no /login) — the session persists after:\n");
  console.log(link.properties.action_link);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
