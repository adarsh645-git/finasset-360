import { describe, expect, it } from "vitest";
import type { HoldingData, PortfolioData } from "@/lib/read-model/types";
import { buildAssetClassView, classIdOfSlug } from "@/lib/views/asset-class";
import { holding, portfolio } from "../fixtures/portfolio";

let n = 0;
const h = (over: Partial<HoldingData>) => holding({ id: `re${++n}`, ...over });
const build = (slug: string, holdings: HoldingData[], over: Partial<PortfolioData> = {}) =>
  buildAssetClassView(portfolio({ today: "2026-10-13", holdings, ...over }), classIdOfSlug(slug)!);

const estate = [
  h({ assetClass: "realestate", name: "Pune apartment", propertyType: "Residential", city: "Pune", currentValue: 74_341 }),
  h({ assetClass: "realestate", name: "Plot · Mysuru", propertyType: "Land", city: null, currentValue: 14_388 }),
  h({ assetClass: "realestate", name: "Fundrise eREIT", propertyType: "REIT / fund", city: "US (diversified)", currentValue: 4_200 }),
];

describe("Real estate distribution cards", () => {
  it("AC-18 property type and location rows", () => {
    const cards = build("realestate", estate).realEstate!;
    expect(cards.byType.subtitle).toBe("3 properties");
    expect(cards.byType.rows.map((r) => [r.label, r.names, r.value, r.share])).toEqual([
      ["Residential", "Pune apartment", "$74,341", "80.0%"],
      ["Land", "Plot · Mysuru", "$14,388", "15.5%"],
      ["REIT / fund", "Fundrise eREIT", "$4,200", "4.5%"],
    ]);
    expect(cards.byLocation.subtitle).toBe("City or market");
    expect(cards.byLocation.rows.map((r) => r.label)).toEqual(["Pune", "Not set", "US (diversified)"]);
    expect(cards.byType.bar).toHaveLength(3);
  });

  it("AC-18 a single property reads singular, and a group joins its names", () => {
    expect(build("realestate", [estate[0]!]).realEstate!.byType.subtitle).toBe("1 property");
    const two = build("realestate", [
      estate[0]!,
      h({ assetClass: "realestate", name: "Flat B", propertyType: "Residential", city: "Pune", currentValue: 1_000 }),
    ]).realEstate!;
    expect(two.byType.rows).toHaveLength(1);
    expect(two.byType.rows[0]!.names).toBe("Pune apartment, Flat B");
  });

  it("AC-09 only a Real estate page with Holdings carries the cards", () => {
    for (const slug of ["stocks", "cash", "crypto", "metals", "other"]) {
      expect(build(slug, [h({ assetClass: classIdOfSlug(slug)!, currentValue: 5 })]).realEstate).toBeNull();
    }
    expect(build("realestate", []).realEstate).toBeNull();
  });
});
