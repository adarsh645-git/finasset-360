// Local-only dev convenience: resets one fixed dev user's records and prints a
// one-time sign-in link so `npm run dev` never has to stop at /login locally.
//
// Fills the dev user's Portfolio with the prototype's dataset (design.md D20):
// 14 Holdings, 4 loans, 4 Goals, monthly Valuations, US market data and
// Hand-Priced India Positions. The rows are built by scripts/seed-data.mjs.
// Wipe-and-reinsert with stable ids, so running it twice gives the same Portfolio.
//
// Uses the service-role key exactly the way tests/fixtures/users.ts does:
// the app only signs in via Google OAuth, which this script can't drive, so it
// reaches the same end state (a real row in auth.users, a real session)
// through Admin API calls instead. Never touches auth.users beyond looking
// the dev user up.

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { buildSeed, chunk, fxRowsFromSeries } from "./seed-data.mjs";

config({ path: ".env.local" });

const DEV_EMAIL = "adarsh645@gmail.com";
const FX_START = "2018-01-01";

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

/** Inserts rows in chunks; with `conflictKey` it upserts (shared tables are never wiped). */
async function insert(admin, table, rows, conflictKey) {
  for (const batch of chunk(rows, 500)) {
    const query = conflictKey
      ? admin.from(table).upsert(batch, { onConflict: conflictKey })
      : admin.from(table).insert(batch);
    const { error } = await query;
    if (error) throw new Error(`Failed inserting into ${table}: ${error.message}`);
  }
}

// fx_rate is shared and the daily cron owns it once filled, so only an empty
// table is touched (D14, D20): the same Frankfurter range request the cron makes.
async function fillFxIfEmpty(admin, today) {
  const { count, error } = await admin.from("fx_rate").select("*", { count: "exact", head: true });
  if (error) throw new Error(`Could not read fx_rate: ${error.message}`);
  if (count > 0) {
    console.log(`fx_rate already has ${count} rows; left alone.`);
    return;
  }
  const response = await fetch(`https://api.frankfurter.dev/v1/${FX_START}..${today}?base=USD&symbols=INR`);
  if (!response.ok) throw new Error(`Frankfurter answered ${response.status}; rerun \`npm run seed\` when it is back.`);
  const rows = fxRowsFromSeries(await response.json());
  if (rows.length === 0) throw new Error("Frankfurter returned no INR rates.");
  await insert(admin, "fx_rate", rows, "rate_date");
  console.log(`Filled fx_rate with ${rows.length} rates from ${rows[0].rate_date}.`);
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

  const today = new Date().toISOString().slice(0, 10);
  const seed = buildSeed(user.id, today);

  await insert(admin, "stock_symbol", seed.stockSymbol, "symbol");
  await insert(admin, "price_cache", seed.priceCache, "symbol");

  const { error: portfolioError } = await admin.from("portfolio").update(seed.portfolio).eq("user_id", user.id);
  if (portfolioError) throw new Error(`Failed resetting the Portfolio: ${portfolioError.message}`);

  // Parents before children: Holdings, then what points at them.
  await insert(admin, "country_assumption", seed.countryAssumption);
  await insert(admin, "holding", seed.holding);
  await insert(admin, "position", seed.position);
  await insert(admin, "holding_valuation", seed.holdingValuation);
  await insert(admin, "liability", seed.liability);
  await insert(admin, "liability_valuation", seed.liabilityValuation);
  await insert(admin, "goal", seed.goal);
  console.log(
    `Seeded ${seed.holding.length} Holdings, ${seed.position.length} Positions, ${seed.liability.length} Liabilities, ` +
      `${seed.goal.length} Goals and ${seed.holdingValuation.length + seed.liabilityValuation.length} Valuations.`,
  );

  await fillFxIfEmpty(admin, today);

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
