// Local-only dev convenience (.scratch/local-dev-tooling/01-seed-and-auto-signin.md):
// wipes and reseeds one fixed dev user's Holdings/Liabilities/Target
// Allocation/Projection with a generous dataset — enough rows in one Asset
// Class, and enough fields on one Holding and one Liability, to make every
// panel the pinned-action-buttons fix touches actually need it — then
// prints a one-time sign-in link so `npm run dev` never has to stop at
// /login locally. Never touches auth.users beyond looking the dev user up:
// re-running this only resets *their* data, not the account itself.
//
// Uses the service-role key exactly the way tests/fixtures/users.ts does
// for the same reason: the app only signs in via Google OAuth, which this
// script can't drive, so it reaches the same end state (a real row in
// auth.users, a real session) through Admin API calls instead.
import { config } from "dotenv";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const DEV_EMAIL = "adarsh645@gmail.com";

const ASSET_CLASS = {
  realEstate: "a0000000-0000-0000-0000-000000000001",
  equity: "a0000000-0000-0000-0000-000000000002",
  preciousMetal: "a0000000-0000-0000-0000-000000000003",
  cash: "a0000000-0000-0000-0000-000000000004",
  crypto: "a0000000-0000-0000-0000-000000000005",
};

const LIABILITY_CLASS = {
  mortgage: "b0000000-0000-0000-0000-000000000001",
  autoLoan: "b0000000-0000-0000-0000-000000000002",
  creditCard: "b0000000-0000-0000-0000-000000000003",
};

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

/** ISO date string `monthsAgo` months before today (day-of-month clamped by JS `Date` itself). */
function dateMonthsAgo(monthsAgo) {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - monthsAgo);
  return d.toISOString().slice(0, 10);
}

/** A gently upward/downward-trending series of `count` amounts ending near `endAmount`, oldest first. */
function trend(startAmount, endAmount, count) {
  return Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 1 : i / (count - 1);
    const noise = 1 + (Math.sin(i * 1.7) * 0.015); // a little month-to-month wobble, not a straight line
    return Math.round(startAmount + (endAmount - startAmount) * t * noise);
  });
}

/** Builds `holding_valuation`/`liability_valuation` rows for one owner from oldest-first amounts. */
function valuationRows({ ownerId, ownerColumn, userId, amounts, currency }) {
  const months = amounts.length;
  return amounts.map((amount, i) => ({
    [ownerColumn]: ownerId,
    user_id: userId,
    amount,
    fx_rate_to_home: 1,
    home_currency_at_recording: currency,
    recorded_at: dateMonthsAgo(months - 1 - i),
  }));
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
    // First run on a fresh stack: create the dev user the same way the
    // real on_auth_user_created trigger would from a Google sign-in — this
    // is what actually creates their Portfolio row, per tests/fixtures/users.ts.
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: DEV_EMAIL,
      email_confirm: true,
    });
    if (createError || !created.user) {
      throw new Error(`Failed to create local dev user: ${createError?.message}`);
    }
    user = created.user;
  }
  const userId = user.id;

  // Wipe this user's data only, in FK order: Liability before Holding
  // (linked_holding_id has no ON DELETE CASCADE), each Valuation table
  // cascades from its own owner automatically. Portfolio/auth.users
  // untouched, so an existing browser session stays valid across reseeds.
  for (const table of ["liability", "holding", "target_allocation", "projection"]) {
    const { error } = await admin.from(table).delete().eq("user_id", userId);
    if (error) throw new Error(`Failed clearing ${table}: ${error.message}`);
  }

  // -- Holdings -----------------------------------------------------------
  // One rich Equity Holding (market symbol, 18 months of history) plus
  // enough others in the same Asset Class to force the Holdings column to
  // scroll, plus a couple in every other class for breadth.
  // Every entry but the rich Holding carries its own `seedValue` — the
  // current amount its two Valuation rows trend toward — right alongside
  // its other fields, rather than re-deriving it from the name later.
  const richHoldingId = randomUUID();
  const otherEquities = [
    ["Apple Inc", 18_200],
    ["Microsoft Corp", 24_600],
    ["Alphabet Inc", 15_800],
    ["Amazon.com Inc", 21_300],
    ["NVIDIA Corp", 31_500],
    ["Meta Platforms Inc", 12_400],
    ["Tesla Inc", 9_800],
    ["Berkshire Hathaway", 27_000],
    ["JPMorgan Chase", 11_200],
    ["Visa Inc", 8_600],
    ["UnitedHealth Group", 6_900],
    ["Home Depot Inc", 7_400],
    ["Procter & Gamble", 5_100],
    ["Walt Disney Co", 4_300],
  ];

  const holdings = [
    { id: richHoldingId, asset_class_id: ASSET_CLASS.equity, name: "Vanguard S&P 500 ETF", currency: "USD",
      price_lookup_symbol: "VOO", quantity: 120, sector: "Diversified", held_at: "Fidelity 401k" },
    ...otherEquities.map(([name, seedValue]) => ({
      id: randomUUID(), asset_class_id: ASSET_CLASS.equity, name, currency: "USD", held_at: "Robinhood", seedValue,
    })),
    { id: randomUUID(), asset_class_id: ASSET_CLASS.realEstate, name: "Primary Residence", currency: "USD", seedValue: 650_000 },
    { id: randomUUID(), asset_class_id: ASSET_CLASS.realEstate, name: "Rental Condo", currency: "USD", seedValue: 280_000 },
    { id: randomUUID(), asset_class_id: ASSET_CLASS.cash, name: "Chase Checking", currency: "USD", seedValue: 8_000 },
    { id: randomUUID(), asset_class_id: ASSET_CLASS.cash, name: "Ally Savings", currency: "USD", seedValue: 25_000 },
    { id: randomUUID(), asset_class_id: ASSET_CLASS.crypto, name: "Bitcoin", currency: "USD",
      price_lookup_symbol: "BTC", quantity: 0.4, seedValue: 24_800 },
    { id: randomUUID(), asset_class_id: ASSET_CLASS.crypto, name: "Ethereum", currency: "USD",
      price_lookup_symbol: "ETH", quantity: 3, seedValue: 9_300 },
    { id: randomUUID(), asset_class_id: ASSET_CLASS.preciousMetal, name: "Gold Bars", currency: "USD", seedValue: 12_000 },
  ].map((h) => ({ user_id: userId, sector: null, held_at: null, price_lookup_symbol: null, quantity: null, ...h }));

  const primaryResidence = holdings.find((h) => h.name === "Primary Residence");

  // `seedValue` only drives the Valuation amounts below — not a real column.
  const holdingRows = holdings.map((h) => {
    const row = { ...h };
    delete row.seedValue;
    return row;
  });
  const { error: holdingError } = await admin.from("holding").insert(holdingRows);
  if (holdingError) throw new Error(`Failed inserting Holdings: ${holdingError.message}`);

  const holdingValuationRows = [
    ...valuationRows({
      ownerId: richHoldingId, ownerColumn: "holding_id", userId, currency: "USD",
      amounts: trend(380_000, 460_000, 18),
    }),
    ...holdings
      .filter((h) => h.id !== richHoldingId)
      .flatMap((h) =>
        valuationRows({
          ownerId: h.id, ownerColumn: "holding_id", userId, currency: "USD",
          amounts: trend(h.seedValue * 0.92, h.seedValue, 2),
        }),
      ),
  ];
  const { error: holdingValuationError } = await admin.from("holding_valuation").insert(holdingValuationRows);
  if (holdingValuationError) throw new Error(`Failed inserting Holding Valuations: ${holdingValuationError.message}`);

  // -- Liabilities ----------------------------------------------------------
  // One rich Mortgage (full Amortization Assumptions, linked to the
  // Holding it financed, 12 months of balance history) plus enough Credit
  // Cards to force the Liabilities column to scroll too.
  const mortgage = {
    id: randomUUID(), user_id: userId, liability_class_id: LIABILITY_CLASS.mortgage, name: "Home Mortgage",
    currency: "USD", interest_rate: 0.065, original_loan_amount: 500_000, term_months: 360,
    custom_monthly_payment: null, extra_monthly_payment: 100, escrow_portion: 350,
    start_date: dateMonthsAgo(60), linked_holding_id: primaryResidence.id,
  };
  const autoLoan = {
    id: randomUUID(), user_id: userId, liability_class_id: LIABILITY_CLASS.autoLoan, name: "Car Loan",
    currency: "USD",
  };
  const creditCards = ["Chase Sapphire", "Amex Gold", "Citi Double Cash", "Discover it"].map((name) => ({
    id: randomUUID(), user_id: userId, liability_class_id: LIABILITY_CLASS.creditCard, name, currency: "USD",
  }));

  const { error: liabilityError } = await admin.from("liability").insert([mortgage, autoLoan, ...creditCards]);
  if (liabilityError) throw new Error(`Failed inserting Liabilities: ${liabilityError.message}`);

  const liabilityValuationRows = [
    ...valuationRows({
      ownerId: mortgage.id, ownerColumn: "liability_id", userId, currency: "USD",
      amounts: trend(430_000, 405_000, 12),
    }),
    ...valuationRows({
      ownerId: autoLoan.id, ownerColumn: "liability_id", userId, currency: "USD",
      amounts: trend(18_000, 15_500, 2),
    }),
    ...creditCards.flatMap((card, i) =>
      valuationRows({
        ownerId: card.id, ownerColumn: "liability_id", userId, currency: "USD",
        amounts: [400 + i * 350],
      }),
    ),
  ];
  const { error: liabilityValuationError } = await admin
    .from("liability_valuation")
    .insert(liabilityValuationRows);
  if (liabilityValuationError) {
    throw new Error(`Failed inserting Liability Valuations: ${liabilityValuationError.message}`);
  }

  // -- Target Allocation + Projection --------------------------------------
  const targetAllocations = [
    { asset_class_id: ASSET_CLASS.realEstate, target_percent: 30 },
    { asset_class_id: ASSET_CLASS.equity, target_percent: 40 },
    { asset_class_id: ASSET_CLASS.preciousMetal, target_percent: 5 },
    { asset_class_id: ASSET_CLASS.cash, target_percent: 10 },
    { asset_class_id: ASSET_CLASS.crypto, target_percent: 15 },
  ].map((row) => ({ ...row, user_id: userId }));
  const { error: targetError } = await admin.from("target_allocation").insert(targetAllocations);
  if (targetError) throw new Error(`Failed inserting Target Allocation: ${targetError.message}`);

  const targetDate = new Date();
  targetDate.setUTCFullYear(targetDate.getUTCFullYear() + 20);
  const { error: projectionError } = await admin.from("projection").insert({
    user_id: userId,
    growth_rate: 0.07,
    monthly_contribution: 2000,
    contribution_escalation_rate: 0.03,
    horizon_years: 20,
    inflation_rate: 0.03,
    target_amount: 3_000_000,
    target_date: targetDate.toISOString().slice(0, 10),
  });
  if (projectionError) throw new Error(`Failed inserting Projection: ${projectionError.message}`);

  // -- Shared price cache (global, not wiped — just refreshed) ------------
  const { error: priceCacheError } = await admin.from("price_cache").upsert(
    [
      { symbol: "VOO", price: 480, price_currency: "USD", source: "seed-local" },
      { symbol: "BTC", price: 62_000, price_currency: "USD", source: "seed-local" },
      { symbol: "ETH", price: 3_100, price_currency: "USD", source: "seed-local" },
    ].map((row) => ({ ...row, last_error: null, fetched_at: new Date().toISOString() })),
  );
  if (priceCacheError) throw new Error(`Failed refreshing price_cache: ${priceCacheError.message}`);

  console.log(`Seeded ${holdings.length} Holdings, ${2 + creditCards.length} Liabilities for ${DEV_EMAIL}.`);

  // -- One-time sign-in link ------------------------------------------------
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: DEV_EMAIL,
    options: { redirectTo: "http://localhost:3000/auth/callback" },
  });
  if (linkError) throw new Error(`Failed generating sign-in link: ${linkError.message}`);

  console.log("\nOpen this once to land on the dashboard (no /login) — session persists after:\n");
  console.log(link.properties.action_link);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
