import { describe, expect, it } from "vitest";
import type { HoldingData, PortfolioData } from "@/lib/read-model/types";
import { buildAssetClassView, classIdOfSlug } from "@/lib/views/asset-class";
import { holding, portfolio } from "../fixtures/portfolio";

const TODAY = "2026-10-13";
const YEAR_AGO = "2025-10-13";

let n = 0;
const h = (over: Partial<HoldingData>) => holding({ id: `h${++n}`, ...over });
const data = (holdings: HoldingData[], over: Partial<PortfolioData> = {}) =>
  portfolio({ today: TODAY, holdings, ...over });
const build = (slug: string, holdings: HoldingData[], over: Partial<PortfolioData> = {}) =>
  buildAssetClassView(data(holdings, over), classIdOfSlug(slug)!);

describe("class slugs", () => {
  it.each([
    ["real-estate", "Real estate"],
    ["stocks", "Stocks"],
    ["cash", "Cash"],
    ["crypto", "Crypto"],
    ["metals", "Metals"],
    ["vehicles-and-other", "Vehicles & other"],
  ])("AC-01 /assets/%s is the %s page", (slug, name) => {
    const id = classIdOfSlug(slug);
    expect(id).not.toBeNull();
    // Even with no Holdings the page exists.
    expect(buildAssetClassView(data([]), id!).name).toBe(name);
  });

  it("AC-01 bonds is not found", () => {
    expect(classIdOfSlug("bonds")).toBeNull();
    expect(classIdOfSlug("realestate")).toBeNull();
  });
});

describe("class header", () => {
  it("AC-02 header of a class with history", () => {
    const v = build("real-estate", [
      h({ assetClass: "realestate", currentValue: 100_000, valuations: [{ date: YEAR_AGO, value: 88_000, source: "user" }] }),
      h({ assetClass: "stocks", currentValue: 300_000 }),
    ]);
    expect(v.breadcrumb).toEqual([
      { label: "Assets", href: "/assets" },
      { label: "Real estate", href: null },
    ]);
    expect(v.total).toBe("$100,000");
    expect(v.line.startsWith("+$12K in 12 mo · 25% of assets")).toBe(true);
  });

  it("AC-03 a class of new Holdings has no change", () => {
    const v = build("crypto", [
      h({ assetClass: "crypto", currentValue: 900, valuations: [{ date: "2026-07-13", value: 800, source: "user" }] }),
    ]);
    expect(v.line.startsWith("— in 12 mo")).toBe(true);
  });

  const base = portfolio().assumptions;
  const rates = {
    assumptions: {
      ...base,
      byCountry: {
        ...base.byCountry,
        US: { inflation: null, realestate: null, stocks: 8, cash: null, monthlySavings: null },
      },
    },
  };
  it.each([
    ["stocks", "projected at 8%/yr US · 11%/yr India"],
    ["real-estate", "projected at 4%/yr US · 6%/yr India"],
    ["cash", "projected at 3.5%/yr US · 6.5%/yr India"],
    ["crypto", "projected at 5%/yr"],
    ["metals", "projected at 4%/yr"],
    ["vehicles-and-other", "projected at −9%/yr"],
  ])("AC-04 %s reads %s", (slug, rate) => {
    expect(build(slug, [], rates).line.endsWith(rate)).toBe(true);
  });
});

describe("class page actions and empty state", () => {
  it("AC-05 Add to Metals opens the add-asset modal for Metals", () => {
    const v = build("metals", [h({ assetClass: "metals", currentValue: 10 })]);
    expect(v.add.label).toBe("+ Add to Metals");
    expect(v.add.href).toBe("/assets/metals?modal=add-asset&class=metals");
  });

  it.each([
    ["real-estate", "No properties in Real estate yet"],
    ["stocks", "No accounts in Stocks yet"],
    ["cash", "No accounts in Cash yet"],
    ["crypto", "No accounts in Crypto yet"],
    ["metals", "No assets in Metals yet"],
    ["vehicles-and-other", "No assets in Vehicles & other yet"],
  ])("AC-08 empty %s reads %s", (slug, message) => {
    const v = build(slug, []);
    expect(v.total).toBe("$0");
    expect(v.empty?.message).toBe(message);
    expect(v.empty?.addHref).toBe(v.add.href);
    expect(v.chart).toBeNull();
    expect(v.rows).toEqual([]);
  });

  it("AC-08 the empty header reads a dash and 0% of assets", () => {
    const v = build("cash", []);
    expect(v.line.startsWith("— in 12 mo · 0% of assets")).toBe(true);
  });
});

describe("class chart", () => {
  it("AC-06 recorded points start at the first Valuation, then 120 monthly projected points", () => {
    const first = "2025-08-13";
    const v = build("stocks", [
      h({
        assetClass: "stocks",
        currentValue: 10_000,
        valuations: [
          { date: first, value: 8_000, source: "user" },
          { date: "2026-02-13", value: 9_000, source: "user" },
        ],
      }),
    ]);
    const points = v.chart!.series[0].points;
    const recorded = points.filter((p) => p.date <= TODAY);
    const projected = points.filter((p) => p.date > TODAY);
    expect(recorded[0].date).toBe(first);
    expect(recorded.at(-1)).toEqual({ date: TODAY, value: 10_000 });
    expect(projected).toHaveLength(120);
    expect(projected[0].date).toBe("2026-11-13");
    expect(projected.at(-1)!.date).toBe("2036-10-13");
    // The default US Stocks rate (7%) from today's class total.
    expect(projected[11].value).toBeCloseTo(10_000 * 1.07, 0);
  });

  it("AC-06 the horizon follows the Projection Assumptions", () => {
    const v = build("cash", [h({ assetClass: "cash", currentValue: 100 })], {
      assumptions: { ...portfolio().assumptions, horizonYears: 2 },
    });
    expect(v.chart!.series[0].points.filter((p) => p.date > TODAY)).toHaveLength(24);
  });
});

describe("class Holdings table", () => {
  it("AC-07 only this class's Holdings, largest first, each linking to its detail", () => {
    const small = h({ assetClass: "cash", name: "Small", currentValue: 6_200 });
    const big = h({ assetClass: "cash", name: "Big", currentValue: 11_800 });
    const stock = h({ assetClass: "stocks", name: "Broker", currentValue: 50_000 });
    const v = build("cash", [small, stock, big]);
    expect(v.rows.map((r) => r.name)).toEqual(["Big", "Small"]);
    expect(v.rows.map((r) => r.href)).toEqual([`/holdings/${big.id}`, `/holdings/${small.id}`]);
  });

  it("AC-07 archived Holdings are not listed", () => {
    const gone = h({ assetClass: "cash", name: "Gone", currentValue: 5, archivedAt: "2026-09-01T00:00:00Z" });
    expect(build("cash", [gone]).empty).not.toBeNull();
  });
});
