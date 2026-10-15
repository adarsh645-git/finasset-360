import { describe, expect, it } from "vitest";
import { sectorFromIndustry } from "@/lib/market-data/sector";

describe("sectorFromIndustry", () => {
  it.each([
    ["Technology", "Technology"],
    ["Semiconductors", "Technology"],
    ["Banking", "Financials"],
    ["Insurance", "Financials"],
    ["Pharmaceuticals", "Healthcare"],
    ["Oil & Gas", "Energy"],
    ["Retail", "Consumer Discretionary"],
    ["Food Products", "Consumer Staples"],
    ["Media", "Communication Services"],
    ["Machinery", "Industrials"],
    ["Utilities", "Utilities"],
    ["Chemicals", "Materials"],
    ["Real Estate", "Real Estate"],
    ["", "Other"],
    ["Shell Companies", "Other"],
  ])("MD-04 maps provider industry %j to %s", (industry, sector) => {
    expect(sectorFromIndustry(industry)).toBe(sector);
  });

  it("MD-04 treats a missing industry as Other and ignores case and padding", () => {
    expect(sectorFromIndustry(null)).toBe("Other");
    expect(sectorFromIndustry("  banking ")).toBe("Financials");
  });
});
