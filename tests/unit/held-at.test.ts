import { describe, expect, it } from "vitest";
import { readHeldAtPatch } from "@/lib/holdings/held-at";

describe("readHeldAtPatch", () => {
  it("is undefined (key omitted) when held_at isn't present", () => {
    expect(readHeldAtPatch({ name: "x" })).toEqual({ ok: true, value: undefined });
  });

  it("accepts null, clearing an existing Held at", () => {
    expect(readHeldAtPatch({ held_at: null })).toEqual({ ok: true, value: null });
  });

  it("trims a valid Held at string", () => {
    expect(readHeldAtPatch({ held_at: " Fidelity 401k " })).toEqual({ ok: true, value: "Fidelity 401k" });
  });

  it("rejects a blank string", () => {
    expect(readHeldAtPatch({ held_at: "   " })).toEqual({
      ok: false,
      error: "held_at must be a non-empty string or null.",
    });
  });

  it("rejects a non-string, non-null value", () => {
    expect(readHeldAtPatch({ held_at: 42 })).toEqual({
      ok: false,
      error: "held_at must be a non-empty string or null.",
    });
  });
});
