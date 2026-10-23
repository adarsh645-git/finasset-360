import { describe, expect, it } from "vitest";
import { buildHoldingDetail } from "@/lib/views/holding-detail";
import { buildHoldingEquity } from "@/lib/views/holding-equity";
import type { HoldingData, LiabilityData, PortfolioData } from "@/lib/read-model/types";
import { holding, liability, portfolio } from "../fixtures/portfolio";

const TODAY = "2026-10-14";
const val = (date: string, value: number) => ({ date, value, source: "user" as const });
const data = (holdings: HoldingData[], loans: LiabilityData[], over: Partial<PortfolioData> = {}) =>
  portfolio({
    today: TODAY,
    fx: { today: { rate: 83.4, asOf: TODAY }, history: [{ date: "2025-01-31", rate: 83.4 }] },
    holdings,
    liabilities: loans,
    ...over,
  });

const apartment = (over: Partial<HoldingData> = {}) =>
  holding({
    id: "h1",
    name: "Pune apartment",
    assetClass: "realestate",
    country: "IN",
    currency: "INR",
    currentValue: 6_000_000,
    valuations: [val("2025-01-31", 6_000_000), val(TODAY, 6_000_000)],
    ...over,
  });
const apartmentLoan = (over: Partial<LiabilityData> = {}) =>
  liability({
    id: "l1",
    country: "IN",
    currency: "INR",
    name: "Apartment loan · HDFC",
    principal: 3_800_000,
    currentBalance: 3_430_000,
    apr: 8.5,
    monthlyPayment: 33_000,
    startMonth: "2022-04",
    linkedHoldingId: "h1",
    valuations: [val("2025-01-31", 3_430_000), val(TODAY, 3_430_000)],
    ...over,
  });
const usHolding = (value: number) =>
  holding({
    id: "h1",
    name: "House",
    assetClass: "realestate",
    currentValue: value,
    valuations: [val("2025-01-31", value), val(TODAY, value)],
  });
const usLoan = (balance: number) =>
  liability({
    id: "l1",
    name: "Mortgage",
    principal: balance,
    currentBalance: balance,
    apr: 5,
    monthlyPayment: 2_500,
    linkedHoldingId: "h1",
    valuations: [val("2025-01-31", balance), val(TODAY, balance)],
  });

describe("holding equity", () => {
  it("returns null for an unlinked Holding and ignores an archived loan", () => {
    expect(buildHoldingEquity(data([apartment()], []), { holdingId: "h1" })).toBeNull();
    const archived = apartmentLoan({ archivedAt: "2026-01-01T00:00:00Z" });
    expect(buildHoldingEquity(data([apartment()], [archived]), { holdingId: "h1" })).toBeNull();
  });

  it("LD-12 Linked loan card", () => {
    const eq = buildHoldingEquity(data([apartment()], [apartmentLoan()]), { holdingId: "h1" })!;
    expect(eq.linkedLoan).toEqual({
      label: "Linked loan",
      name: "Apartment loan · HDFC",
      line: "8.5% · ₹33,000/mo",
      balance: "$41,127 →",
      href: "/liabilities/l1",
    });
  });

  it.each([
    [500_000, 320_000, "$180,000", "36% owned outright"],
    [300_000, 350_000, "−$50,000", "0% owned outright"],
  ])("LD-13 Your equity stat %i vs %i", (value, balance, equity, sub) => {
    const eq = buildHoldingEquity(data([usHolding(value)], [usLoan(balance)]), { holdingId: "h1" })!;
    expect(eq.stat).toEqual({ label: "Your equity", value: equity, sub });
  });

  it("LD-14 Value vs. loan chart", () => {
    // A ₹1,00,000 payment clears the loan well inside the 10-year horizon.
    const payoffLoan = apartmentLoan({ monthlyPayment: 100_000 });
    const eq = buildHoldingEquity(data([apartment()], [payoffLoan]), { holdingId: "h1" })!;
    const chart = eq.chart!;
    expect(chart.title).toBe("Value vs. loan");
    expect(chart.sub).toBe("The shaded gap between the two lines is your equity");
    expect(chart.zero).toBe(true);
    const [value, loan, equity] = chart.series;
    expect(value!.name).toBe("Value");
    expect(loan!.name).toBe("Loan balance");
    expect(value!.area).toBe(true);
    expect(value!.base).toEqual(loan!.points);
    expect(equity!.name).toBe("Equity");
    expect(equity!.line).toBe(false);
    expect(equity!.scaled).toBe(false);
    expect(value!.points.some((p) => p.date > TODAY)).toBe(true);
    value!.points.forEach((p, i) => {
      expect(equity!.points[i]!.value).toBeCloseTo(p.value - loan!.points[i]!.value, 6);
    });
    // Past the payoff month the loan is 0, so Equity equals the value.
    const last = value!.points.length - 1;
    expect(loan!.points[last]!.value).toBe(0);
    expect(equity!.points[last]!.value).toBeCloseTo(value!.points[last]!.value, 6);
  });

  it("an unlinked Holding's page is unchanged", () => {
    const d = buildHoldingDetail(data([apartment()], []), { holdingId: "h1" })!;
    expect(d.linkedLoan).toBeNull();
    expect(d.stats.some((s) => s.label === "Your equity")).toBe(false);
    expect(d.chart.title).toBe("Value over time");
  });

  it("a linked Holding's page carries the card, the stat last and the chart", () => {
    const d = buildHoldingDetail(data([apartment()], [apartmentLoan()]), { holdingId: "h1" })!;
    expect(d.linkedLoan!.name).toBe("Apartment loan · HDFC");
    expect(d.stats.at(-1)!.label).toBe("Your equity");
    expect(d.chart.title).toBe("Value vs. loan");
    expect(d.chart.series.map((s) => s.name)).toEqual(["Value", "Loan balance", "Equity"]);
  });
});
