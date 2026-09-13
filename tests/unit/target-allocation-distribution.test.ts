import { describe, expect, it } from "vitest";
import {
  computeDistribution,
  sumHoldingsByAssetClass,
} from "@/lib/target-allocation/distribution";
import type { AssetClass, Holding, HoldingValuation } from "@/components/portfolio/types";

function assetClass(overrides: Partial<AssetClass>): AssetClass {
  return { id: "ac1", owner_id: null, name: "Cash", ...overrides };
}

function holding(overrides: Partial<Holding>): Holding {
  return {
    id: "h1",
    asset_class_id: "ac1",
    name: "Checking",
    currency: "USD",
    price_lookup_symbol: null,
    quantity: null,
    sector: null,
    held_at: null,
    archived_at: null,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

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

describe("sumHoldingsByAssetClass", () => {
  it("sums each Holding's latest home-currency value into its own Asset Class", () => {
    const holdings = [
      holding({ id: "h1", asset_class_id: "cash" }),
      holding({ id: "h2", asset_class_id: "cash" }),
      holding({ id: "h3", asset_class_id: "equity" }),
    ];
    const latestByHolding = new Map([
      ["h1", valuation({ holding_id: "h1", amount: 1000, fx_rate_to_home: 1 })],
      ["h2", valuation({ holding_id: "h2", amount: 500, fx_rate_to_home: 1 })],
      ["h3", valuation({ holding_id: "h3", amount: 200, fx_rate_to_home: 1.08 })],
    ]);

    const totals = sumHoldingsByAssetClass(holdings, latestByHolding);

    expect(totals.get("cash")).toBe(1500);
    expect(totals.get("equity")).toBeCloseTo(200 * 1.08);
  });

  it("treats a Holding with no recorded Valuation as contributing zero", () => {
    const holdings = [holding({ id: "h1", asset_class_id: "cash" })];
    const totals = sumHoldingsByAssetClass(holdings, new Map());
    expect(totals.get("cash")).toBe(0);
  });
});

describe("computeDistribution", () => {
  it("computes actual percent as each class's share of total Holdings, in the given tree order", () => {
    const assetClasses = [
      assetClass({ id: "cash", name: "Cash" }),
      assetClass({ id: "equity", name: "Equity" }),
    ];
    const actualAmountByClass = new Map([
      ["cash", 300],
      ["equity", 700],
    ]);
    const targetPercentByClass = new Map([
      ["cash", 20],
      ["equity", 80],
    ]);

    const rows = computeDistribution(assetClasses, actualAmountByClass, targetPercentByClass);

    expect(rows.map((r) => r.assetClassId)).toEqual(["cash", "equity"]);
    expect(rows[0]).toMatchObject({ actualAmount: 300, actualPercent: 30, targetPercent: 20 });
    expect(rows[1]).toMatchObject({ actualAmount: 700, actualPercent: 70, targetPercent: 80 });
  });

  it("expresses the gap in home-currency money as target minus actual", () => {
    const assetClasses = [assetClass({ id: "cash", name: "Cash" })];
    const actualAmountByClass = new Map([["cash", 300]]);
    const targetPercentByClass = new Map([["cash", 50]]);

    const [row] = computeDistribution(assetClasses, actualAmountByClass, targetPercentByClass);

    // Total Holdings is 300 (only Cash has money), target is 50% of that
    // total = 150, actual is 300, so Cash is 150 over its target.
    expect(row.gapAmount).toBeCloseTo(150 - 300);
    expect(row.gapPercent).toBeCloseTo(50 - 100);
  });

  it("defaults an Asset Class with no target row to a zero target rather than throwing", () => {
    const assetClasses = [assetClass({ id: "cash", name: "Cash" })];
    const actualAmountByClass = new Map([["cash", 100]]);

    const [row] = computeDistribution(assetClasses, actualAmountByClass, new Map());

    expect(row.targetPercent).toBe(0);
    expect(row.gapAmount).toBeCloseTo(0 - 100);
  });

  it("is all zero percent when there are no Holdings yet, rather than dividing by zero", () => {
    const assetClasses = [assetClass({ id: "cash", name: "Cash" })];

    const [row] = computeDistribution(assetClasses, new Map(), new Map([["cash", 50]]));

    expect(row.actualAmount).toBe(0);
    expect(row.actualPercent).toBe(0);
    expect(row.gapAmount).toBe(0);
  });
});
