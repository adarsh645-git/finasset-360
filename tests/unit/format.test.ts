import { describe, expect, it } from "vitest";
import {
  DASH,
  compact,
  daysOld,
  inDuration,
  inr,
  monthAxis,
  monthLong,
  native,
  share,
  signed,
  signedCompact,
  signedPct,
  usd,
} from "@/lib/format";

describe("FM-01 Writing a USD amount", () => {
  it.each([
    [1234.4, "$1,234"],
    [1284300, "$1,284,300"],
    [-9100.5, "−$9,101"],
    [0, "$0"],
    [-0.2, "$0"],
  ])("FM-01 %d reads %s", (amount, text) => {
    expect(usd(amount)).toBe(text);
  });
});

describe("FM-02 Writing a rupee amount", () => {
  it.each([
    [6200000, "₹62,00,000"],
    [185000, "₹1,85,000"],
    [-3430000, "−₹34,30,000"],
  ])("FM-02 %d reads %s", (amount, text) => {
    expect(inr(amount)).toBe(text);
  });
});

describe("FM-03 A native amount follows its Country", () => {
  it.each([
    ["US", "$640,000"],
    ["India", "₹6,40,000"],
  ] as const)("FM-03 %s reads %s", (country, text) => {
    expect(native(640000, country)).toBe(text);
  });
});

describe("FM-04 Writing a compact amount", () => {
  it.each([
    [1284300, "$1.28M"],
    [412000, "$412K"],
    [8600, "$8.6K"],
    [3000, "$3K"],
    [640, "$640"],
    [-13900, "−$13.9K"],
  ])("FM-04 %d reads %s", (amount, text) => {
    expect(compact(amount)).toBe(text);
  });
});

describe("FM-05 Writing signed amounts and percentages", () => {
  it("FM-01 a negative that rounds to zero never reads −$0 or −0.0%", () => {
    expect(signed(-0.2)).toBe("+$0");
    expect(signedCompact(-0.2)).toBe("+$0");
    expect(signedPct(-0.0004)).toBe("+0.0%");
    expect(signedPct(-0.0004, 0)).toBe("+0%");
    expect(signed(-0.6)).toBe("−$1");
  });
  it("FM-05 signed amounts", () => {
    expect(signed(6750)).toBe("+$6,750");
    expect(signed(-4250)).toBe("−$4,250");
    expect(signed(0)).toBe("+$0");
  });
  it("FM-05 signed compact", () => {
    expect(signedCompact(48200)).toBe("+$48.2K");
    expect(signedCompact(-13900)).toBe("−$13.9K");
    expect(signedCompact(0)).toBe("+$0");
  });
  it("FM-05 signed percent", () => {
    expect(signedPct(0.0812)).toBe("+8.1%");
    expect(signedPct(-0.025)).toBe("−2.5%");
    expect(signedPct(0.1, 0)).toBe("+10%");
  });
  it("FM-05 share", () => {
    expect(share(52.3, 100)).toBe("52%");
  });
});

describe("FM-06 A share of a $0 total is 0%", () => {
  it("FM-06 reads 0%", () => {
    expect(share(0, 0)).toBe("0%");
  });
});

describe("FM-07 An absent change reads as a dash", () => {
  it("FM-07 every helper writes —", () => {
    expect(DASH).toBe("—");
    expect(signed(null)).toBe("—");
    expect(signedPct(null)).toBe("—");
    expect(signedCompact(null)).toBe("—");
    expect(usd(null)).toBe("—");
    expect(inr(undefined)).toBe("—");
    expect(native(null, "US")).toBe("—");
    expect(compact(null)).toBe("—");
    expect(share(null, 10)).toBe("—");
    expect(share(5, null)).toBe("—");
    expect(monthLong(null)).toBe("—");
    expect(monthAxis(null)).toBe("—");
    expect(inDuration(null)).toBe("—");
    expect(daysOld(null)).toBe("—");
  });
});

describe("FM-08 Writing months", () => {
  it("FM-08 reads Oct 2026 and Oct ’26", () => {
    expect(monthLong("2026-10-13")).toBe("Oct 2026");
    expect(monthAxis("2026-10-13")).toBe("Oct ’26");
    expect(monthLong(new Date("2026-10-13T00:00:00Z"))).toBe("Oct 2026");
  });
});

describe("FM-09 Writing a duration from today", () => {
  it.each([
    [0, "in 1 mo"],
    [8, "in 8 mo"],
    [30, "in 2.5 yrs"],
    [132, "in 11 yrs"],
  ])("FM-09 %d months reads %s", (months, text) => {
    expect(inDuration(months)).toBe(text);
  });
});

describe("FM-10 Writing an age", () => {
  it.each([
    [1, "1 day old"],
    [47, "47 days old"],
  ])("FM-10 %d days reads %s", (days, text) => {
    expect(daysOld(days)).toBe(text);
  });
});
