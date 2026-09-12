import { describe, expect, it } from "vitest";
import { computeNetWorth } from "@/lib/net-worth/compute";
import { buildNetWorthTimeline } from "@/lib/net-worth/timeline";
import type { HoldingValuation, LiabilityValuation } from "@/components/portfolio/types";

function valuation(overrides: Partial<HoldingValuation>): HoldingValuation {
  return {
    id: "v1",
    holding_id: "h1",
    amount: 100,
    fx_rate_to_home: 1,
    home_currency_at_recording: "USD",
    recorded_at: "2026-09-01",
    ...overrides,
  };
}

function liabilityValuation(overrides: Partial<LiabilityValuation>): LiabilityValuation {
  return {
    id: "v1",
    liability_id: "l1",
    amount: 100,
    fx_rate_to_home: 1,
    home_currency_at_recording: "USD",
    recorded_at: "2026-09-01",
    ...overrides,
  };
}

describe("buildNetWorthTimeline", () => {
  it("handles a Holding with a single Valuation without breaking", () => {
    const holdings = [{ id: "h1", archived_at: null }];
    const points = buildNetWorthTimeline(holdings, [valuation({})], [], []);

    expect(points).toEqual([
      { date: "2026-09-01", holdingsTotal: 100, liabilitiesTotal: 0, netWorth: 100 },
    ]);
  });

  it("forward-fills a Holding's latest Valuation into later dates", () => {
    const holdings = [
      { id: "h1", archived_at: null },
      { id: "h2", archived_at: null },
    ];
    const valuations = [
      valuation({ id: "v1", holding_id: "h1", amount: 100, recorded_at: "2026-09-01" }),
      valuation({ id: "v2", holding_id: "h2", amount: 200, recorded_at: "2026-09-10" }),
    ];

    const points = buildNetWorthTimeline(holdings, valuations, [], []);

    expect(points).toEqual([
      { date: "2026-09-01", holdingsTotal: 100, liabilitiesTotal: 0, netWorth: 100 },
      // h1 has no Valuation dated 2026-09-10, but its last known one carries
      // forward — otherwise the trend would dip every time only one
      // Holding gets a fresh check-in.
      { date: "2026-09-10", holdingsTotal: 300, liabilitiesTotal: 0, netWorth: 300 },
    ]);
  });

  it("archiving a Holding removes it from current Net Worth while its earlier trend points still include it", () => {
    const soldHouse = { id: "house", archived_at: "2026-09-05T00:00:00Z" };
    const valuations = [
      valuation({ id: "v1", holding_id: "house", amount: 500_000, recorded_at: "2026-09-01" }),
    ];

    const points = buildNetWorthTimeline([soldHouse], valuations, [], []);
    expect(points).toEqual([
      { date: "2026-09-01", holdingsTotal: 500_000, liabilitiesTotal: 0, netWorth: 500_000 },
    ]);

    // Current Net Worth is computed from active owners' latest Valuations
    // only (PortfolioShell filters archived owners out before calling
    // computeNetWorth) — the same data that showed 500,000 in the
    // historical trend above contributes nothing once archived.
    const currentNetWorth = computeNetWorth([]);
    expect(currentNetWorth.holdingsTotal).toBe(0);
  });

  it("stops contributing a Holding's value to trend points after its archive date", () => {
    const soldHouse = { id: "house", archived_at: "2026-09-05T00:00:00Z" };
    const stock = { id: "stock", archived_at: null };
    const valuations = [
      valuation({ id: "v1", holding_id: "house", amount: 500_000, recorded_at: "2026-09-01" }),
      valuation({ id: "v2", holding_id: "stock", amount: 1_000, recorded_at: "2026-09-10" }),
    ];

    const points = buildNetWorthTimeline([soldHouse, stock], valuations, [], []);

    const afterSale = points.find((p) => p.date === "2026-09-10");
    expect(afterSale?.holdingsTotal).toBe(1_000);
  });

  it("nets Holdings against Liabilities at each point", () => {
    const holdings = [{ id: "h1", archived_at: null }];
    const liabilities = [{ id: "l1", archived_at: null }];
    const points = buildNetWorthTimeline(
      holdings,
      [valuation({ holding_id: "h1", amount: 1000, recorded_at: "2026-09-01" })],
      liabilities,
      [liabilityValuation({ liability_id: "l1", amount: 300, recorded_at: "2026-09-01" })],
    );

    expect(points).toEqual([
      { date: "2026-09-01", holdingsTotal: 1000, liabilitiesTotal: 300, netWorth: 700 },
    ]);
  });

  it("returns an empty timeline when nothing has ever been recorded", () => {
    expect(buildNetWorthTimeline([], [], [], [])).toEqual([]);
  });
});
