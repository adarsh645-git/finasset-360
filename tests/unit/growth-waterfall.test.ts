import { describe, expect, it } from "vitest";
import { buildGrowth, parseGrowthView } from "@/lib/views/growth";
import { holding, liability, portfolio } from "../fixtures/portfolio";

const TODAY = "2026-10-13";
const val = (date: string, value: number) => ({ date, value, source: "user" as const });

/** The two-Country Portfolio of GR-02. */
function twoCountry() {
  return portfolio({
    today: TODAY,
    fx: { today: { rate: 85, asOf: TODAY }, history: [{ date: "2025-10-13", rate: 80 }] },
    holdings: [
      holding({ id: "h-us", assetClass: "cash", country: "US", currentValue: 100_000, valuations: [val("2025-10-13", 80_000)] }),
      holding({
        id: "h-in",
        assetClass: "realestate",
        country: "IN",
        currency: "INR",
        currentValue: 9_350_000,
        valuations: [val("2025-10-13", 8_000_000)],
      }),
    ],
    liabilities: [
      liability({ id: "l-us", country: "US", currentBalance: 45_000, valuations: [val("2025-10-13", 50_000)] }),
      liability({
        id: "l-in",
        country: "IN",
        currency: "INR",
        currentBalance: 1_190_000,
        valuations: [val("2025-10-13", 1_600_000)],
      }),
    ],
  });
}

const waterfall = (scope: string, range = "1Y") =>
  buildGrowth(twoCountry(), parseGrowthView({ range, scope })).waterfall!;

describe("growth waterfall", () => {
  it.each([
    [
      "all",
      [
        "Net worth Oct 2025 $110,000",
        "Asset growth & savings +$36,875",
        "Debt paid down +$10,125",
        "Currency (₹ → $) −$6,000",
        "Net worth today $151,000",
      ],
    ],
    [
      "us",
      [
        "Net worth Oct 2025 $30,000",
        "Asset growth & savings +$20,000",
        "Debt paid down +$5,000",
        "Net worth today $55,000",
      ],
    ],
    [
      "in",
      [
        "Net worth Oct 2025 $80,000",
        "Asset growth & savings +$16,875",
        "Debt paid down +$5,125",
        "Currency (₹ → $) −$6,000",
        "Net worth today $96,000",
      ],
    ],
  ])("GR-11 rows for scope %s", (scope, rows) => {
    const w = waterfall(scope);
    expect(w.rows.map((r) => `${r.label} ${r.value}`)).toEqual(rows);
  });

  it("GR-11 the middle rows sum exactly to the header's change", () => {
    const growth = buildGrowth(twoCountry(), parseGrowthView({ range: "1Y" }));
    const steps = growth.waterfall!.rows.filter((r) => r.kind !== "total");
    expect(steps.reduce((s, r) => s + r.amount, 0)).toBeCloseTo(41_000, 6);
    expect(growth.header!.change).toBe("+$41,000");
  });

  it.each([
    ["all", "Asset growth uses Oct 2025 exchange rates, so currency moves are split out"],
    ["in", "India only. Asset growth uses Oct 2025 exchange rates, so currency moves are split out"],
  ])("GR-12 subtitle for scope %s", (scope, subtitle) => {
    expect(waterfall(scope).subtitle).toBe(subtitle);
  });

  it("GR-13 bars span their steps on one scale that includes 0", () => {
    const w = waterfall("all");
    expect(w.scale).toEqual({ min: 0, max: 157_000 });
    expect(w.rows.map((r) => [Math.round(r.from), Math.round(r.to)])).toEqual([
      [0, 110_000],
      [110_000, 146_875],
      [146_875, 157_000],
      [151_000, 157_000],
      [0, 151_000],
    ]);
    expect(w.rows.map((r) => r.kind)).toEqual(["total", "pos", "pos", "neg", "total"]);
  });

  it("GR-13 a negative Net Worth still fits the scale", () => {
    const data = portfolio({
      today: TODAY,
      liabilities: [liability({ country: "US", currentBalance: 20_000, valuations: [val("2025-10-13", 10_000)] })],
    });
    const w = buildGrowth(data, parseGrowthView({ range: "1Y" })).waterfall!;
    expect(w.scale.min).toBe(-20_000);
    expect(w.scale.max).toBe(0);
  });
});
