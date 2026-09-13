import { describe, expect, it } from "vitest";
import { readSectorPatch } from "@/lib/holdings/sector";

describe("readSectorPatch", () => {
  it("is undefined (key omitted) when sector isn't present", () => {
    expect(readSectorPatch({ name: "x" })).toEqual({ ok: true, value: undefined });
  });

  it("accepts null, clearing an existing Sector", () => {
    expect(readSectorPatch({ sector: null })).toEqual({ ok: true, value: null });
  });

  it("trims a valid Sector string", () => {
    expect(readSectorPatch({ sector: " Technology " })).toEqual({ ok: true, value: "Technology" });
  });

  it("rejects a blank string", () => {
    expect(readSectorPatch({ sector: "   " })).toEqual({
      ok: false,
      error: "sector must be a non-empty string or null.",
    });
  });

  it("rejects a non-string, non-null value", () => {
    expect(readSectorPatch({ sector: 42 })).toEqual({
      ok: false,
      error: "sector must be a non-empty string or null.",
    });
  });
});
