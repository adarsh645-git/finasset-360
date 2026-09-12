import { describe, expect, it } from "vitest";
import { isMetalSymbol } from "@/lib/market-data/symbols";
import { readPriceLookupPatch } from "@/lib/holdings/price-lookup";
import { validatePriceLookupInput } from "@/lib/holdings/price-lookup-input";

describe("isMetalSymbol", () => {
  it("recognizes the four metal codes, case-insensitively", () => {
    expect(isMetalSymbol("XAU")).toBe(true);
    expect(isMetalSymbol("xag")).toBe(true);
    expect(isMetalSymbol("XPT")).toBe(true);
    expect(isMetalSymbol("XPD")).toBe(true);
  });

  it("treats anything else as a stock/ETF ticker", () => {
    expect(isMetalSymbol("AAPL")).toBe(false);
    expect(isMetalSymbol("VOO")).toBe(false);
  });
});

describe("readPriceLookupPatch", () => {
  it("is undefined when neither field is present", () => {
    expect(readPriceLookupPatch({ name: "x" })).toBeUndefined();
  });

  it("rejects a symbol without a quantity", () => {
    expect(readPriceLookupPatch({ price_lookup_symbol: "AAPL" })).toBe(
      "price_lookup_symbol and quantity must be set together.",
    );
  });

  it("rejects a quantity without a symbol", () => {
    expect(readPriceLookupPatch({ quantity: 10 })).toBe(
      "price_lookup_symbol and quantity must be set together.",
    );
  });

  it("accepts both null together, clearing the pair", () => {
    expect(readPriceLookupPatch({ price_lookup_symbol: null, quantity: null })).toEqual({
      price_lookup_symbol: null,
      quantity: null,
    });
  });

  it("uppercases and trims a valid symbol", () => {
    expect(readPriceLookupPatch({ price_lookup_symbol: " aapl ", quantity: 10 })).toEqual({
      price_lookup_symbol: "AAPL",
      quantity: 10,
    });
  });

  it("rejects a non-positive quantity", () => {
    expect(readPriceLookupPatch({ price_lookup_symbol: "AAPL", quantity: 0 })).toBe(
      "quantity must be a positive finite number.",
    );
  });
});

describe("validatePriceLookupInput", () => {
  it("is mismatched when only one of the pair is filled in", () => {
    expect(validatePriceLookupInput("AAPL", "").isMismatched).toBe(true);
    expect(validatePriceLookupInput("", "10").isMismatched).toBe(true);
  });

  it("has a null value when both are empty — a Holding with no live pricing", () => {
    expect(validatePriceLookupInput("", "")).toEqual({
      isMismatched: false,
      isInvalid: false,
      value: null,
    });
  });

  it("is invalid when quantity isn't a positive number", () => {
    expect(validatePriceLookupInput("AAPL", "0").isInvalid).toBe(true);
    expect(validatePriceLookupInput("AAPL", "not a number").isInvalid).toBe(true);
  });

  it("produces a validated pair for a well-formed input", () => {
    expect(validatePriceLookupInput(" aapl ", "10").value).toEqual({
      price_lookup_symbol: "aapl",
      quantity: 10,
    });
  });
});
