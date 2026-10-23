import { describe, expect, it } from "vitest";
import { displayName } from "@/lib/views/goals";

describe("goal display name", () => {
  it.each([
    [null, 150_000, "$150K net worth"],
    ["   ", 2_500, "$2.5K net worth"],
    [null, 1_284_300, "$1.28M net worth"],
    ["  Emergency fund  ", 30_000, "Emergency fund"],
  ])("GO-11 name %j with target %s is shown as %s", (name, targetUsd, shown) => {
    expect(displayName({ name, targetUsd })).toBe(shown);
  });
});
