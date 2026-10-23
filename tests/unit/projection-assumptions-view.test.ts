import { describe, expect, it } from "vitest";
import { buildGrowth, parseGrowthView } from "@/lib/views/growth";
import { buildAssumptions } from "@/lib/views/projection-assumptions";
import { holding, portfolio } from "../fixtures/portfolio";

const TODAY = "2026-10-13";
const COUNTRIES = [
  { code: "US" as const, name: "United States", currency: "USD" as const, defaults: { inflation: 3, realestate: 4, stocks: 7, cash: 3.5 } },
  { code: "IN" as const, name: "India", currency: "INR" as const, defaults: { inflation: 5, realestate: 6, stocks: 11, cash: 6.5 } },
];
const view = (params: Record<string, string> = {}) => parseGrowthView(params);

function saved() {
  const data = portfolio({ today: TODAY, countries: COUNTRIES });
  data.assumptions.horizonYears = 15;
  data.assumptions.byCountry.US.stocks = 7.5;
  data.assumptions.byCountry.US.monthlySavings = 3000;
  return data;
}

/** The two-Country Portfolio of GR-02, reduced to what the hints read. */
function held() {
  return portfolio({
    today: TODAY,
    countries: COUNTRIES,
    fx: { today: { rate: 85, asOf: TODAY }, history: [] },
    holdings: [
      holding({ id: "h-us", assetClass: "cash", country: "US", currentValue: 100_000 }),
      holding({ id: "h-in", assetClass: "realestate", country: "IN", currency: "INR", currentValue: 9_350_000 }),
    ],
  });
}

const field = (a: ReturnType<typeof buildAssumptions>, label: string) => {
  const f = [...a.fields, ...a.shared].find((x) => x.label === label);
  if (!f) throw new Error(`no field ${label}`);
  return f;
};

describe("assumptions card fields", () => {
  it.each([
    ["us", "Stocks", "7.5", "7"],
    ["us", "Inflation", "", "3"],
    ["us", "Monthly savings", "3,000", "0"],
    ["in", "Stocks", "", "11"],
    ["in", "Inflation", "", "5"],
    ["in", "Monthly savings", "", "0"],
    ["us", "Vehicles & other", "", "−9"],
    ["in", "Vehicles & other", "", "−9"],
    ["us", "Savings growth", "", "0"],
    ["in", "Savings growth", "", "0"],
  ])("PA-01 on the %s tab, %s holds %j with placeholder %s", (tab, label, value, placeholder) => {
    const f = field(buildAssumptions(saved(), view({ tab })), label);
    expect(f.value).toBe(value);
    expect(f.placeholder).toBe(placeholder);
  });

  it("PA-01 the horizon holds 15 with placeholder 10", () => {
    expect(buildAssumptions(saved(), view()).horizon).toMatchObject({ value: "15", placeholder: "10" });
  });

  it("PA-01 India Monthly savings are grouped in the Indian style", () => {
    const data = saved();
    data.assumptions.byCountry.IN.monthlySavings = 120_000;
    expect(field(buildAssumptions(data, view({ tab: "in" })), "Monthly savings").value).toBe("1,20,000");
  });

  it("PA-01 the fields come in the card's order", () => {
    const a = buildAssumptions(saved(), view());
    expect(a.fields.map((f) => f.label)).toEqual(["Inflation", "Real estate", "Stocks", "Cash", "Monthly savings"]);
    expect(a.shared.map((f) => f.label)).toEqual(["Crypto", "Metals", "Vehicles & other", "Savings growth"]);
  });

  it.each([
    ["us", "Inflation", "Used for today's dollars"],
    ["us", "Cash", "$100K held"],
    ["us", "Real estate", "none held"],
    ["us", "Monthly savings", "$ per month, invested at the Stocks rate"],
    ["in", "Real estate", "$110K held"],
    ["in", "Monthly savings", "₹ per month, invested at the Stocks rate"],
    ["us", "Crypto", "none held"],
    ["in", "Crypto", "none held"],
    ["us", "Savings growth", "Raises monthly savings once a year"],
    ["in", "Savings growth", "Raises monthly savings once a year"],
  ])("PA-02 on the %s tab, %s reads %s", (tab, label, hint) => {
    expect(field(buildAssumptions(held(), view({ tab })), label).hint).toBe(hint);
  });
});

describe("assumptions card tab", () => {
  it.each([
    [{}, "us"],
    [{ scope: "in" }, "in"],
    [{ tab: "in" }, "in"],
    [{ tab: "us", scope: "in" }, "us"],
  ])("PA-03 url %j selects the %s tab", (params, tab) => {
    const a = buildAssumptions(saved(), view(params));
    expect(a.tabs.find((t) => t.selected)?.value).toBe(tab);
  });

  it("PA-03 the tab links keep the rest of the view", () => {
    const a = buildAssumptions(saved(), view({ range: "3Y", scope: "in" }));
    expect(a.tabs.map((t) => t.href)).toEqual(["/growth?range=3Y&scope=in&tab=us", "/growth?range=3Y&scope=in&tab=in"]);
  });

  it.each([
    ["United States", "us"],
    ["India", "in"],
    ["All", "in"],
  ])("PA-04 with tab India and scope All, choosing %s makes the tab %s", (label, tab) => {
    const g = buildGrowth(held(), view({ tab: "in" }));
    const href = g.scopes.find((s) => s.label === label)!.href;
    const next = parseGrowthView(Object.fromEntries(new URLSearchParams(href.split("?")[1])));
    expect(buildAssumptions(held(), next).tabs.find((t) => t.selected)?.value).toBe(tab);
  });
});
