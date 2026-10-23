import { describe, expect, it } from "vitest";
import { parseField, planSave, type FieldSpec } from "@/lib/views/projection-assumptions";

const usStocks: FieldSpec = { kind: "rate", target: { country: "US", column: "stocks_rate" } };
const inSavings: FieldSpec = { kind: "savings", target: { country: "IN", column: "monthly_savings" } };
const RATE_MSG = "Enter a rate from −50 to 50";

describe("parseField", () => {
  it.each([
    ["7", 7],
    ["7.5%", 7.5],
    ["−9", -9],
    ["-50", -50],
    ["50", 50],
    ["", null],
  ])("PA-05 rate text %j reads %s", (text, value) => {
    expect(parseField("rate", text)).toEqual({ ok: true, value });
  });

  it.each(["51", "abc", "-50.5"])("PA-05 rate text %j is refused", (text) => {
    expect(parseField("rate", text)).toEqual({ ok: false, message: RATE_MSG });
  });

  it.each([
    ["50,000", 50_000],
    ["₹ 1,20,000", 120_000],
    ["0", 0],
    ["", null],
  ])("PA-07 savings text %j reads %s", (text, value) => {
    expect(parseField("savings", text)).toEqual({ ok: true, value });
  });

  it("PA-07 a negative amount is refused", () => {
    expect(parseField("savings", "-100")).toEqual({ ok: false, message: "Enter an amount of 0 or more" });
  });
});

describe("planSave", () => {
  it.each([
    [usStocks, "7.5", { countries: { US: { stocks_rate: 7.5 } } }],
    [inSavings, "50,000", { countries: { IN: { monthly_savings: 50_000 } } }],
    [{ kind: "rate", target: { country: null, column: "metals_rate" } } as FieldSpec, "3", { metals_rate: 3 }],
    [{ kind: "rate", target: { country: null, column: "savings_growth" } } as FieldSpec, "3", { savings_growth: 3 }],
  ])("PA-08 committing %j with %s saves only that field", (spec, text, patch) => {
    expect(planSave(spec, text, null)).toEqual({ kind: "save", patch });
  });

  it("PA-09 clearing a saved field saves it as blank", () => {
    expect(planSave(usStocks, "", 7.5)).toEqual({
      kind: "save",
      patch: { countries: { US: { stocks_rate: null } } },
    });
  });

  it("PA-10 an unchanged entry saves nothing", () => {
    expect(planSave(usStocks, "7.5", 7.5)).toEqual({ kind: "none" });
    expect(planSave(usStocks, "", null)).toEqual({ kind: "none" });
  });

  it("PA-10 an invalid entry saves nothing and carries its message", () => {
    expect(planSave(usStocks, "60", 7.5)).toEqual({ kind: "error", message: RATE_MSG });
  });
});
