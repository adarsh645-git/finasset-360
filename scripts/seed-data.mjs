// The pure half of `npm run seed` (redesign-data-model D20): builds the rows
// of the prototype's dataset in the shape of the tables in
// supabase/migrations/20260915000000_redesign_data_model.sql. No I/O, so
// `node --test` can check the shape without a database. Source data:
// docs/design/portfolio-tracker/Portfolio Tracker.dc.html (HOLD, LOANS, GOALS,
// TICKERS). The prototype counts months from January 2018 (index 0).

import { createHash } from "node:crypto";

const FIRST_YEAR = 2018;

/** Month index (0 = January 2018) of an ISO date. */
export function monthIndex(isoDate) {
  const [year, month] = isoDate.split("-").map(Number);
  return (year - FIRST_YEAR) * 12 + (month - 1);
}

/** First day of month index `m`, as `YYYY-MM-01`. */
export function monthStart(m) {
  const year = FIRST_YEAR + Math.floor(m / 12);
  return `${year}-${String((m % 12) + 1).padStart(2, "0")}-01`;
}

export function addDays(isoDate, days) {
  return new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

/** A stable UUID per key, so reseeding recreates the same ids. */
export function uuidFor(key) {
  const h = createHash("sha1").update(`finasset-360-seed:${key}`).digest("hex");
  const variant = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

// The prototype's deterministic noise, so histories look the same every run.
const rnd = (s) => {
  const x = Math.sin(s * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};
const hs = (str) => {
  let v = 7;
  for (const ch of str) v = (v * 31 + ch.charCodeAt(0)) % 9973;
  return v;
};
const cents = (n) => Math.round(n * 100) / 100;

export const TICKERS = {
  AAPL: { name: "Apple Inc.", price: 232.1, sector: "Technology", mic: "XNAS" },
  MSFT: { name: "Microsoft Corp.", price: 428.4, sector: "Technology", mic: "XNAS" },
  NVDA: { name: "NVIDIA Corp.", price: 128.2, sector: "Technology", mic: "XNAS" },
  GOOGL: { name: "Alphabet Inc. Class A", price: 178.3, sector: "Communication Services", mic: "XNAS" },
  META: { name: "Meta Platforms", price: 585, sector: "Communication Services", mic: "XNAS" },
  AMZN: { name: "Amazon.com Inc.", price: 205, sector: "Consumer Discretionary", mic: "XNAS" },
  TSLA: { name: "Tesla Inc.", price: 248.5, sector: "Consumer Discretionary", mic: "XNAS" },
  JPM: { name: "JPMorgan Chase & Co.", price: 246, sector: "Financials", mic: "XNYS" },
  V: { name: "Visa Inc.", price: 298, sector: "Financials", mic: "XNYS" },
  JNJ: { name: "Johnson & Johnson", price: 158, sector: "Healthcare", mic: "XNYS" },
  UNH: { name: "UnitedHealth Group", price: 560, sector: "Healthcare", mic: "XNYS" },
  XOM: { name: "Exxon Mobil Corp.", price: 118, sector: "Energy", mic: "XNYS" },
  COST: { name: "Costco Wholesale", price: 905, sector: "Consumer Staples", mic: "XNAS" },
  CAT: { name: "Caterpillar Inc.", price: 365, sector: "Industrials", mic: "XNYS" },
};

// India has no market data: those Positions are Hand-Priced (D6, D20).
const INDIA_TICKERS = {
  "RELIANCE.NS": { name: "Reliance Industries", price: 2950, sector: "Energy" },
  "HDFCBANK.NS": { name: "HDFC Bank", price: 1720, sector: "Financials" },
  "INFY.NS": { name: "Infosys", price: 1880, sector: "Technology" },
  "TCS.NS": { name: "Tata Consultancy Services", price: 4150, sector: "Technology" },
};
// Days since each India price was set. One is 47 days old, past the 30-day
// Stale cue.
const INDIA_PRICE_AGE_DAYS = { "RELIANCE.NS": 47, "HDFCBANK.NS": 3, "INFY.NS": 5, "TCS.NS": 1 };

// `key` is the prototype's id. `start` is its start month index, `vol` the
// noise in its history.
const HOLDINGS = [
  { key: "h1", name: "Chase Checking", description: "Everyday account", assetClass: "cash", country: "US", value: 6200, start: 0, startVal: 2500, vol: 0.14 },
  { key: "h2", name: "Ally High-Yield Savings", description: "4.2% APY · emergency fund", assetClass: "cash", country: "US", value: 11800, start: 30, startVal: 3000, vol: 0.02 },
  { key: "h3", name: "SBI NRE Savings", description: "Repatriable, tax-free interest", assetClass: "cash", country: "IN", value: 640000, start: 0, startVal: 300000, vol: 0.03 },
  { key: "h4", name: "HDFC NRO Account", description: "Rental income in India", assetClass: "cash", country: "IN", value: 185000, start: 12, startVal: 80000, vol: 0.05 },
  { key: "h5", name: "Fidelity Brokerage", description: "Taxable account", assetClass: "stocks", country: "US", start: 8, startVal: 2000, vol: 0.08, positions: [["AAPL", 30, 165], ["MSFT", 12, 310], ["JPM", 15, 170], ["XOM", 20, 95], ["JNJ", 14, 160], ["AMZN", 9, 150]] },
  { key: "h6", name: "Roth IRA", description: "Retirement · tax-free", assetClass: "stocks", country: "US", start: 24, startVal: 5500, vol: 0.08, positions: [["NVDA", 40, 62], ["COST", 6, 640], ["UNH", 6, 500]] },
  { key: "h7", name: "Zerodha", description: "NSE equities", assetClass: "stocks", country: "IN", start: 20, startVal: 150000, vol: 0.09, positions: [["RELIANCE.NS", 120, 2300], ["HDFCBANK.NS", 150, 1500], ["INFY.NS", 90, 1450], ["TCS.NS", 25, 3400]] },
  { key: "h8", name: "Coinbase", description: "0.07 BTC · 0.9 ETH", assetClass: "crypto", country: "US", value: 8600, costBasis: 6100, start: 40, startVal: 1500, vol: 0.3 },
  { key: "h9", name: "Gold jewellery & coins", description: "22K, kept in Hyderabad", assetClass: "metals", country: "IN", value: 290000, costBasis: 170000, start: 0, startVal: 120000, vol: 0.04, quantity: 40, unit: "g" },
  { key: "h10", name: "Silver Eagles", description: "Home safe", assetClass: "metals", country: "US", value: 640, costBasis: 480, start: 50, startVal: 400, vol: 0.06, quantity: 20, unit: "oz t" },
  { key: "h11", name: "Pune apartment", description: "2BHK · Baner · rented", assetClass: "realestate", country: "IN", value: 6200000, costBasis: 4800000, start: 54, startVal: 4800000, vol: 0.008, propertyType: "Residential", city: "Pune" },
  { key: "h13", name: "Plot · Mysuru", description: "1,200 sq ft residential plot", assetClass: "realestate", country: "IN", value: 1200000, costBasis: 900000, start: 36, startVal: 900000, vol: 0.005, propertyType: "Land", city: "Mysuru" },
  { key: "h14", name: "Fundrise eREIT", description: "Diversified US property fund", assetClass: "realestate", country: "US", value: 4200, costBasis: 3600, start: 60, startVal: 1000, vol: 0.03, propertyType: "REIT / fund", city: "US (diversified)" },
  { key: "h12", name: "2022 Honda CR-V", description: "Estimated private-sale value", assetClass: "other", country: "US", value: 19500, costBasis: 31000, start: 64, startVal: 31000, vol: 0.006 },
];

const LOANS = [
  { key: "l1", name: "Apartment loan · HDFC", country: "IN", principal: 3800000, balance: 3430000, apr: 8.5, payment: 33000, start: 54, termYears: 20, linked: "h11" },
  { key: "l2", name: "Auto loan · Honda Financial", country: "US", principal: 26000, balance: 9100, apr: 5.9, payment: 501, start: 64, termYears: 5, linked: "h12" },
  { key: "l3", name: "Student loan", country: "US", principal: 32000, balance: 13900, apr: 4.5, payment: 330, start: 30, termYears: 10, linked: null },
  { key: "l4", name: "Amex Gold card", country: "US", principal: 1850, balance: 1850, apr: 24.9, payment: 150, start: 70, termYears: null, linked: null, revolving: true },
];

const GOALS = [
  ["$100K net worth", 100000],
  ["$150K net worth", 150000],
  ["Quarter million", 250000],
  ["Half a million", 500000],
];

/** A Stocks Holding's current value: Σ shares × price (market for US, hand for India). */
function stocksValue(h) {
  return h.positions.reduce((sum, [ticker, shares]) => {
    const price = TICKERS[ticker]?.price ?? INDIA_TICKERS[ticker].price;
    return sum + shares * price;
  }, 0);
}

/** One value per month from the item's start month, ending today at `value`; the prototype's gentle trend with a little noise. */
function holdingHistory(h, value, now, today) {
  const rows = [];
  const seed = hs(h.key);
  for (let m = h.start; m <= now; m++) {
    let v;
    if (m === now) v = value;
    else {
      const f = (m - h.start) / Math.max(1, now - h.start);
      const base = h.startVal + (value - h.startVal) * Math.pow(f, 1.15);
      const damp = Math.min(1, (now - m) / 5);
      const noise = ((rnd(seed + m) - 0.5) * 1.2 * h.vol + Math.sin(m / 4.3 + seed) * h.vol * 0.7) * damp;
      const bump = h.assetClass === "crypto" ? Math.exp(-Math.pow((m - 46) / 5, 2)) * 1.3 : 0;
      v = Math.max(0, base * (1 + noise + bump));
    }
    rows.push({ valued_on: m === now ? today : monthStart(m), value: cents(v) });
  }
  return rows;
}

/** Balances from the start month to today: the amortization path nudged to land on today's balance. Credit cards wander. */
function liabilityHistory(l, now, today) {
  const rate = l.apr / 100 / 12;
  const sim = [];
  let b = l.principal;
  for (let m = l.start; m <= now; m++) {
    sim[m] = b;
    b = Math.max(0, b * (1 + rate) - l.payment);
  }
  const adjust = l.balance - sim[now];
  const rows = [];
  for (let m = l.start; m <= now; m++) {
    let v;
    if (m === now) v = l.balance;
    else if (l.revolving) v = l.balance * (0.55 + 0.9 * rnd(hs(l.key) + m));
    else v = Math.max(0, sim[m] + adjust * ((m - l.start) / Math.max(1, now - l.start)));
    rows.push({ valued_on: m === now ? today : monthStart(m), balance: cents(v) });
  }
  return rows;
}

/**
 * Every row of the seed for one User, in the shape of the tables. `today` is
 * `YYYY-MM-DD`. Records are created a millisecond apart in the prototype's
 * order, since the read model lists by creation time.
 */
export function buildSeed(userId, today) {
  const now = monthIndex(today);
  const base = Date.parse(`${today}T00:00:00Z`);
  const stamp = (i) => new Date(base + i).toISOString();
  const idOf = (key) => uuidFor(`${userId}:${key}`);

  const holding = [];
  const position = [];
  const holdingValuation = [];
  HOLDINGS.forEach((h, i) => {
    const id = idOf(h.key);
    const isStocks = h.assetClass === "stocks";
    holding.push({
      id,
      user_id: userId,
      country: h.country,
      asset_class: h.assetClass,
      name: h.name,
      description: h.description,
      cost_basis: isStocks ? null : (h.costBasis ?? null),
      property_type: h.propertyType ?? null,
      city: h.city ?? null,
      quantity: h.quantity ?? null,
      unit: h.unit ?? null,
      created_at: stamp(i),
    });
    if (isStocks) {
      h.positions.forEach(([ticker, shares, avgCost], j) => {
        const us = TICKERS[ticker];
        const info = us ?? INDIA_TICKERS[ticker];
        position.push({
          id: idOf(`${h.key}:${ticker}`),
          user_id: userId,
          holding_id: id,
          ticker,
          shares,
          avg_cost: avgCost,
          hand_price: us ? null : info.price,
          price_as_of: us ? null : addDays(today, -INDIA_PRICE_AGE_DAYS[ticker]),
          sector: info.sector,
          name: info.name,
          created_at: stamp(j),
        });
      });
    }
    const value = isStocks ? stocksValue(h) : h.value;
    for (const v of holdingHistory(h, value, now, today)) {
      holdingValuation.push({
        id: idOf(`${h.key}:${v.valued_on}`),
        user_id: userId,
        holding_id: id,
        valued_on: v.valued_on,
        value: v.value,
        source: isStocks ? "cron" : "user",
      });
    }
  });

  const liability = [];
  const liabilityValuation = [];
  LOANS.forEach((l, i) => {
    const id = idOf(l.key);
    liability.push({
      id,
      user_id: userId,
      country: l.country,
      name: l.name,
      principal: l.principal,
      apr: l.apr,
      monthly_payment: l.payment,
      term_years: l.termYears,
      start_month: monthStart(l.start),
      revolving: l.revolving ?? false,
      linked_holding_id: l.linked ? idOf(l.linked) : null,
      created_at: stamp(i),
    });
    for (const v of liabilityHistory(l, now, today)) {
      liabilityValuation.push({
        id: idOf(`${l.key}:${v.valued_on}`),
        user_id: userId,
        liability_id: id,
        valued_on: v.valued_on,
        balance: v.balance,
      });
    }
  });

  return {
    // Reset to blank; the script updates the Portfolio row the sign-in trigger made.
    portfolio: { horizon_years: null, savings_growth: null, crypto_rate: null, metals_rate: null, other_rate: null },
    countryAssumption: [{ user_id: userId, country: "US", stocks_rate: 7.5, monthly_savings: 3000 }],
    holding,
    position,
    holdingValuation,
    liability,
    liabilityValuation,
    goal: GOALS.map(([name, target], i) => ({
      id: idOf(`g${i + 1}`),
      user_id: userId,
      name,
      target_usd: target,
      created_at: stamp(i),
    })),
    // Shared market data for the US tickers only.
    stockSymbol: Object.entries(TICKERS).map(([symbol, t]) => ({
      symbol,
      name: t.name,
      type: "Common Stock",
      mic: t.mic,
      sector: t.sector,
      updated_at: `${today}T00:00:00.000Z`,
    })),
    priceCache: Object.entries(TICKERS).map(([symbol, t]) => ({
      symbol,
      price: t.price,
      currency: "USD",
      fetched_at: `${today}T00:00:00.000Z`,
      last_error: null,
    })),
  };
}

/** Rows of a Frankfurter series body (`{ rates: { "2018-01-02": { INR: 63.8 } } }`) as fx_rate rows. */
export function fxRowsFromSeries(body) {
  const rows = [];
  for (const [date, byCurrency] of Object.entries(body?.rates ?? {})) {
    const inr = Number(byCurrency?.INR);
    if (/^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(inr) && inr > 0) {
      rows.push({ rate_date: date, inr_per_usd: inr });
    }
  }
  return rows;
}

export function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
