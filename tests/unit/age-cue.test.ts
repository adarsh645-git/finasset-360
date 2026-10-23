import { describe, expect, it } from "vitest";
import { dayMonth, formatDay } from "@/lib/format";
import { ageCue, updatedCue } from "@/lib/views/age-cue";

describe("age cue", () => {
  it("HD-23 each variant phrases a Stale row and nothing else", () => {
    expect(ageCue("holding", 47)).toBe("47 days old");
    expect(ageCue("liability", 31)).toBe("31 days old");
    expect(ageCue("stocks", 40)).toBe("prices 40 days old");
    expect(ageCue("position", 72)).toBe("price 72 days old");
    expect(ageCue("holding", 30)).toBeNull();
    expect(ageCue("stocks", null)).toBeNull();
  });

  it("HD-05 the detail cue follows a line, or stands alone when the line is empty", () => {
    expect(updatedCue(47)).toBe("· updated 47 days ago");
    expect(updatedCue(47, { lineEmpty: true })).toBe("Updated 47 days ago");
    expect(updatedCue(30)).toBeNull();
    expect(updatedCue(null)).toBeNull();
  });

  it("HD-05 formatDay gives the full date and leaves D Mon as it was", () => {
    expect(formatDay("2026-10-14")).toBe("Oct 14, 2026");
    expect(formatDay(null)).toBe("—");
    expect(dayMonth("2026-10-10")).toBe("10 Oct");
  });
});
