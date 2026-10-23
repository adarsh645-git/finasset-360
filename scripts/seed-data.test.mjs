import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays, buildSeed, fxRowsFromSeries, monthIndex, monthStart, uuidFor } from "./seed-data.mjs";

const USER = "11111111-1111-4111-8111-111111111111";
const TODAY = "2026-10-22";
const seed = buildSeed(USER, TODAY);

test("month helpers count from January 2018", () => {
  assert.equal(monthIndex("2026-10-22"), 105);
  assert.equal(monthStart(0), "2018-01-01");
  assert.equal(monthStart(105), "2026-10-01");
});

test("seed holds the prototype's counts", () => {
  assert.equal(seed.holding.length, 14);
  assert.equal(seed.liability.length, 4);
  assert.equal(seed.goal.length, 4);
  assert.equal(seed.position.length, 13);
});

test("running twice gives the same rows", () => {
  assert.deepEqual(buildSeed(USER, TODAY), seed);
  assert.match(uuidFor("x"), /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test("ids are unique and every parent reference resolves", () => {
  const tables = [seed.holding, seed.position, seed.holdingValuation, seed.liability, seed.liabilityValuation, seed.goal];
  const ids = tables.flat().map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length);
  const holdingIds = new Set(seed.holding.map((h) => h.id));
  for (const p of seed.position) assert.ok(holdingIds.has(p.holding_id));
  for (const v of seed.holdingValuation) assert.ok(holdingIds.has(v.holding_id));
  const liabilityIds = new Set(seed.liability.map((l) => l.id));
  for (const v of seed.liabilityValuation) assert.ok(liabilityIds.has(v.liability_id));
  for (const l of seed.liability) assert.ok(l.linked_holding_id === null || holdingIds.has(l.linked_holding_id));
});

test("loans link as in the prototype, one active loan per Holding", () => {
  const name = (id) => seed.holding.find((h) => h.id === id)?.name;
  const links = Object.fromEntries(seed.liability.map((l) => [l.name, l.linked_holding_id && name(l.linked_holding_id)]));
  assert.deepEqual(links, {
    "Apartment loan · HDFC": "Pune apartment",
    "Auto loan · Honda Financial": "2022 Honda CR-V",
    "Student loan": null,
    "Amex Gold card": null,
  });
  const linked = seed.liability.map((l) => l.linked_holding_id).filter(Boolean);
  assert.equal(new Set(linked).size, linked.length);
});

test("holdings satisfy the schema's class checks", () => {
  for (const h of seed.holding) {
    assert.equal(h.property_type !== null, h.asset_class === "realestate", h.name);
    assert.ok(h.city === null || h.asset_class === "realestate", h.name);
    assert.equal(h.quantity === null, h.unit === null, h.name);
    assert.ok(h.quantity === null || h.asset_class === "metals", h.name);
    assert.ok(h.cost_basis === null || h.asset_class !== "stocks", h.name);
  }
});

test("valuations start at each item's start month, monthly, one per date, ending today", () => {
  const byHolding = Map.groupBy(seed.holdingValuation, (v) => v.holding_id);
  const pune = seed.holding.find((h) => h.name === "Pune apartment");
  const puneRows = byHolding.get(pune.id);
  assert.equal(puneRows[0].valued_on, monthStart(54));
  assert.equal(puneRows.at(-1).valued_on, TODAY);
  assert.equal(puneRows.length, 105 - 54 + 1);
  assert.equal(puneRows.at(-1).value, 6200000);
  for (const [, rows] of byHolding) {
    assert.equal(new Set(rows.map((r) => r.valued_on)).size, rows.length);
    assert.ok(rows.every((r) => r.value >= 0));
  }
  const byLiability = Map.groupBy(seed.liabilityValuation, (v) => v.liability_id);
  for (const l of seed.liability) {
    const rows = byLiability.get(l.id);
    assert.equal(rows[0].valued_on, l.start_month);
    assert.equal(rows.at(-1).valued_on, TODAY);
    assert.ok(rows.every((r) => r.balance >= 0));
  }
  const apartment = seed.liability.find((l) => l.name.startsWith("Apartment"));
  assert.equal(byLiability.get(apartment.id)[0].balance, apartment.principal);
  assert.equal(byLiability.get(apartment.id).at(-1).balance, 3430000);
});

test("start months are first of the month", () => {
  for (const l of seed.liability) assert.match(l.start_month, /^\d{4}-\d{2}-01$/);
});

test("US Positions use market data, India Positions are Hand-Priced and one is 47 days old", () => {
  const us = seed.position.filter((p) => !p.ticker.endsWith(".NS"));
  const india = seed.position.filter((p) => p.ticker.endsWith(".NS"));
  assert.equal(india.length, 4);
  const symbols = new Set(seed.stockSymbol.map((s) => s.symbol));
  const priced = new Set(seed.priceCache.map((s) => s.symbol));
  for (const p of us) {
    assert.ok(symbols.has(p.ticker) && priced.has(p.ticker), p.ticker);
    assert.equal(p.hand_price, null);
    assert.equal(p.price_as_of, null);
  }
  for (const p of india) {
    assert.ok(p.hand_price > 0);
    assert.ok(!symbols.has(p.ticker) && !priced.has(p.ticker));
  }
  assert.deepEqual(
    india.map((p) => p.price_as_of).sort(),
    [1, 3, 5, 47].map((d) => addDays(TODAY, -d)).sort(),
  );
});

test("stocks Holdings end today at Σ shares × price", () => {
  const fidelity = seed.holding.find((h) => h.name === "Fidelity Brokerage");
  const expected = 30 * 232.1 + 12 * 428.4 + 15 * 246 + 20 * 118 + 14 * 158 + 9 * 205;
  const last = seed.holdingValuation.filter((v) => v.holding_id === fidelity.id).at(-1);
  assert.equal(last.value, Math.round(expected * 100) / 100);
});

test("assumptions: US Stocks 7.5 and US Monthly savings 3,000, everything else blank", () => {
  assert.deepEqual(seed.countryAssumption, [{ user_id: USER, country: "US", stocks_rate: 7.5, monthly_savings: 3000 }]);
  assert.ok(Object.values(seed.portfolio).every((v) => v === null));
});

test("a Frankfurter series becomes fx_rate rows", () => {
  const rows = fxRowsFromSeries({ rates: { "2018-01-02": { INR: 63.8 }, "2018-01-03": { INR: "x" }, bad: { INR: 1 } } });
  assert.deepEqual(rows, [{ rate_date: "2018-01-02", inr_per_usd: 63.8 }]);
});
