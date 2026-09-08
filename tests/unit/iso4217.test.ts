import { describe, expect, it } from "vitest";
import { isValidCurrencyCode, ISO_4217_CODES } from "@/lib/currency/iso4217";

describe("isValidCurrencyCode", () => {
  it("accepts a well-known currency code", () => {
    expect(isValidCurrencyCode("USD")).toBe(true);
    expect(isValidCurrencyCode("EUR")).toBe(true);
    expect(isValidCurrencyCode("JPY")).toBe(true);
  });

  it("rejects a code that looks plausible but isn't ISO 4217", () => {
    expect(isValidCurrencyCode("XXX_NOT_REAL")).toBe(false);
    expect(isValidCurrencyCode("ABC")).toBe(false);
  });

  it("is case-sensitive — lowercase is not normalized here", () => {
    expect(isValidCurrencyCode("usd")).toBe(false);
  });

  it("rejects empty and malformed input without throwing", () => {
    expect(isValidCurrencyCode("")).toBe(false);
    expect(isValidCurrencyCode("US")).toBe(false);
    expect(isValidCurrencyCode("USDD")).toBe(false);
  });

  it("has no duplicate codes in the table", () => {
    expect(new Set(ISO_4217_CODES).size).toBe(ISO_4217_CODES.length);
  });
});
