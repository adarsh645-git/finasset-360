import { describe, expect, it } from "vitest";
import { parseAssumptionsUpdate } from "@/lib/projection-assumptions";
import { RESET_PATCH, parseField, planSave, type FieldSpec } from "@/lib/views/projection-assumptions";

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

describe("horizon and Reset defaults", () => {
  const HORIZON_MSG = "Enter whole years from 1 to 40";
  const horizon: FieldSpec = { kind: "horizon", target: { country: null, column: "horizon_years" } };

  it.each([
    ["1", 1],
    ["40", 40],
    ["", null],
  ])("PA-06 horizon text %j reads %s", (text, value) => {
    expect(parseField("horizon", text)).toEqual({ ok: true, value });
  });

  it.each(["0", "41", "12.5", "abc", "-3"])("PA-06 horizon text %j is refused", (text) => {
    expect(parseField("horizon", text)).toEqual({ ok: false, message: HORIZON_MSG });
  });

  it("PA-06 a horizon of 15 saves through the same plan", () => {
    expect(planSave(horizon, "15", null)).toEqual({ kind: "save", patch: { horizon_years: 15 } });
    expect(planSave(horizon, "41", null)).toEqual({ kind: "error", message: HORIZON_MSG });
  });

  it("PA-11 Reset defaults is one patch blanking every field", () => {
    const blank = { inflation: null, realestate_rate: null, stocks_rate: null, cash_rate: null, monthly_savings: null };
    expect(RESET_PATCH).toEqual({
      horizon_years: null,
      savings_growth: null,
      crypto_rate: null,
      metals_rate: null,
      other_rate: null,
      countries: { US: blank, IN: blank },
    });
  });

  it("PA-11 the route accepts the Reset defaults patch", () => {
    expect(parseAssumptionsUpdate(RESET_PATCH).ok).toBe(true);
  });
});
