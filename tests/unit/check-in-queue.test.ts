import { describe, expect, it } from "vitest";
import { buildCheckInQueue } from "@/lib/check-in/queue";
import type { Holding, HoldingValuation } from "@/components/portfolio/types";

function holding(id: string): Holding {
  return {
    id,
    asset_class_id: "equity",
    name: `Holding ${id}`,
    currency: "USD",
    price_lookup_symbol: null,
    quantity: null,
    sector: null,
    held_at: null,
    archived_at: null,
    created_at: "2026-01-01T00:00:00Z",
  };
}

function valuation(holdingId: string, recordedAt: string): HoldingValuation {
  return {
    id: `v-${holdingId}`,
    holding_id: holdingId,
    amount: 100,
    fx_rate_to_home: 1,
    home_currency_at_recording: "USD",
    recorded_at: recordedAt,
  };
}

const NOW = new Date("2026-09-12T00:00:00Z");

describe("buildCheckInQueue", () => {
  const fresh = holding("fresh"); // valued 5 days ago — not stale
  const stale = holding("stale"); // valued 40 days ago — stale
  const neverValued = holding("never"); // no Valuation at all

  const latestByHolding = new Map([
    [fresh.id, valuation(fresh.id, "2026-09-07")],
    [stale.id, valuation(stale.id, "2026-08-03")],
  ]);

  it("'all' returns every Holding, including one never valued", () => {
    const queue = buildCheckInQueue([fresh, stale, neverValued], latestByHolding, "all", NOW);
    expect(queue.map((h) => h.id)).toEqual(["fresh", "stale", "never"]);
  });

  it("'stale' returns only Holdings past the staleness threshold", () => {
    const queue = buildCheckInQueue([fresh, stale, neverValued], latestByHolding, "stale", NOW);
    expect(queue.map((h) => h.id)).toEqual(["stale"]);
  });

  it("'stale' excludes a Holding with no Valuation at all, mirroring the dashboard's staleness list", () => {
    const queue = buildCheckInQueue([neverValued], new Map(), "stale", NOW);
    expect(queue).toEqual([]);
  });

  it("preserves the given Holding order", () => {
    const queue = buildCheckInQueue([stale, fresh], latestByHolding, "all", NOW);
    expect(queue.map((h) => h.id)).toEqual(["stale", "fresh"]);
  });
});
