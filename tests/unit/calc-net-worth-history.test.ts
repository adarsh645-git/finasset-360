import { describe, expect, it } from "vitest";
import {
  attributeChange,
  lookupFxRate,
  netWorthOn,
  sampleDates,
  todaysDollars,
  todaysDollarsTotal,
  twelveMonthChange,
  valueOn,
  type HistoryItem,
} from "@/lib/calc";

function item(
  valuations: [string, number][],
  extra: Partial<HistoryItem> = {},
): HistoryItem {
  return {
    kind: "holding",
    country: "US",
    valuations: valuations.map(([date, value]) => ({ date, value })),
    currentValue: valuations[valuations.length - 1][1],
    archivedOn: null,
    ...extra,
  };
}

const TODAY = "2026-10-13";
const FLAT_RATES = [{ date: "2025-01-01", rate: 83 }];

describe("net worth history", () => {
  it.each([
    ["2025-12-31", 0],
    ["2026-01-01", 1000],
    ["2026-01-06", 1500],
    ["2026-01-11", 2000],
    ["2026-03-01", 2000],
  ])("NH-01 value on %s is %i", (date, value) => {
    const holding = item([
      ["2026-01-01", 1000],
      ["2026-01-11", 2000],
    ]);
    expect(valueOn(holding, date, TODAY)).toBe(value);
  });

  it("NH-02 An archived item counts only while it was held", () => {
    const holding = item([["2026-01-01", 5000]], { archivedOn: "2026-05-01" });
    expect(
      ["2026-03-01", "2026-05-01", "2026-05-02"].map((d) =>
        valueOn(holding, d, TODAY),
      ),
    ).toEqual([5000, 5000, 0]);
  });

  it("NH-03 A current value acts as today's Valuation", () => {
    const holding = item([["2026-10-01", 10000]], { currentValue: 10600 });
    expect(valueOn(holding, "2026-10-13", TODAY)).toBe(10600);
    expect(valueOn(holding, "2026-10-07", TODAY)).toBe(10300);
  });

  it.each([
    [
      "2025-01-01",
      "2026-07-13",
      ["2026-07-13", "2026-07-31", "2026-08-31", "2026-09-30", "2026-10-13"],
    ],
    [
      "2026-08-20",
      "2025-10-13",
      ["2026-08-20", "2026-08-31", "2026-09-30", "2026-10-13"],
    ],
    ["2026-10-13", "2025-10-13", ["2026-10-13"]],
  ])("NH-04 first Valuation %s, range start %s", (first, rangeStart, dates) => {
    expect(sampleDates(rangeStart, first, TODAY)).toEqual(dates);
  });

  it.each([
    ["2025-06-01", 82.0, "2026-01-01"],
    ["2026-01-04", 82.0, "2026-01-01"],
    ["2026-01-05", 83.0, "2026-01-05"],
    ["2026-10-13", 83.4, "2026-10-10"],
  ])("NH-05 FX Rate for %s is %d as of %s", (date, rate, asOf) => {
    const rates = [
      { date: "2026-10-10", rate: 83.4 },
      { date: "2026-01-01", rate: 82.0 },
      { date: "2026-01-05", rate: 83.0 },
    ];
    expect(lookupFxRate(rates, date)).toEqual({ rate, asOf });
  });

  it("NH-06 Net Worth on a past date uses that date's FX Rate", () => {
    const items = [
      item([["2026-01-01", 50_000]]),
      item([["2026-01-01", 8_200_000]], { country: "IN" }),
      item([["2026-01-01", 4_100_000]], { country: "IN", kind: "liability" }),
    ];
    const rates = [{ date: "2026-01-01", rate: 82.0 }];
    expect(netWorthOn(items, rates, "2026-01-01", TODAY)).toBe(100_000);
  });

  it("NH-07 12-month change of an item with a year of history", () => {
    const holding = item([
      ["2025-10-13", 80_000],
      ["2026-10-13", 100_000],
    ]);
    expect(twelveMonthChange([holding], FLAT_RATES, TODAY)).toEqual({
      amount: 20_000,
      percent: 0.25,
    });
  });

  it("NH-07 An India item's change converts each end at its own date's FX Rate", () => {
    const holding = item(
      [
        ["2025-10-13", 8_000_000],
        ["2026-10-13", 8_300_000],
      ],
      { country: "IN" },
    );
    const rates = [
      { date: "2025-10-13", rate: 80 },
      { date: "2026-10-13", rate: 83 },
    ];
    expect(twelveMonthChange([holding], rates, TODAY)).toEqual({
      amount: 0,
      percent: 0,
    });
  });

  it("NH-08 A brand-new item has no 12-month change", () => {
    expect(
      twelveMonthChange([item([["2026-07-13", 5000]])], FLAT_RATES, TODAY),
    ).toBeNull();
  });

  it("NH-09 A new Holding does not inflate its class's change", () => {
    const old = item([
      ["2025-10-13", 100_000],
      ["2026-10-13", 110_000],
    ]);
    const added = item([["2026-09-13", 50_000]]);
    expect(twelveMonthChange([old, added], FLAT_RATES, TODAY)).toEqual({
      amount: 10_000,
      percent: 0.1,
    });
  });

  it("NH-09 A set with nothing a year old has no change", () => {
    expect(
      twelveMonthChange([item([["2026-09-13", 50_000]])], FLAT_RATES, TODAY),
    ).toBeNull();
    expect(twelveMonthChange([], FLAT_RATES, TODAY)).toBeNull();
  });

  it("NH-09 A year-ago total of 0 leaves the percent absent", () => {
    const holding = item([
      ["2025-10-13", 0],
      ["2026-10-13", 500],
    ]);
    expect(twelveMonthChange([holding], FLAT_RATES, TODAY)).toEqual({
      amount: 500,
      percent: null,
    });
  });

  it("NH-10 Paid down in 12 months for Liabilities", () => {
    const loan = item(
      [
        ["2025-10-13", 300_000],
        ["2026-10-13", 280_000],
      ],
      { kind: "liability" },
    );
    const newLoan = item([["2026-09-13", 5_000]], { kind: "liability" });
    expect(twelveMonthChange([loan, newLoan], FLAT_RATES, TODAY)?.amount).toBe(
      20_000,
    );
  });

  it("NH-11 Past values rise and future values fall in Today's dollars", () => {
    const at = (date: string) => todaysDollars(100_000, date, TODAY, 0.03);
    expect(at("2026-10-13")).toBeCloseTo(100_000, 2);
    expect(at("2024-10-13")).toBeCloseTo(100_000 * 1.03 ** 2, 2);
    expect(at("2028-10-13")).toBeCloseTo(100_000 / 1.03 ** 2, 2);
  });

  it("NH-11 Whole calendar months count, not days", () => {
    // Oct 31 and Oct 1 are both 0 months from today (Oct 13).
    expect(todaysDollars(100, "2026-10-31", TODAY, 0.03)).toBe(100);
    expect(todaysDollars(100, "2026-10-01", TODAY, 0.03)).toBe(100);
    expect(todaysDollars(100, "2026-09-30", TODAY, 0.03)).toBeCloseTo(
      100 * 1.03 ** (1 / 12),
      6,
    );
  });

  it("NH-12 Each Country deflates at its own inflation before summing", () => {
    const total = todaysDollarsTotal(
      [
        { inflation: 0.03, series: [{ date: "2027-10-13", value: 100_000 }] },
        { inflation: 0.05, series: [{ date: "2027-10-13", value: 100_000 }] },
      ],
      TODAY,
    );
    expect(total).toHaveLength(1);
    expect(total[0].value).toBeCloseTo(100_000 / 1.03 + 100_000 / 1.05, 2);
  });

  const T0 = "2026-01-01";
  const sumTerms = (a: ReturnType<typeof attributeChange>) =>
    a.assetGrowth + a.debtPaidDown + a.currencyEffect;

  it("NH-13 The three terms sum to the change in Net Worth", () => {
    const items = [
      item([
        ["2025-06-01", 50_000],
        ["2026-10-13", 70_000],
      ]),
      item(
        [
          ["2025-06-01", 8_000_000],
          ["2026-10-13", 9_500_000],
        ],
        { country: "IN" },
      ),
      item(
        [
          ["2025-06-01", 300_000],
          ["2026-10-13", 250_000],
        ],
        { kind: "liability" },
      ),
      item(
        [
          ["2025-06-01", 2_000_000],
          ["2026-10-13", 1_700_000],
        ],
        { country: "IN", kind: "liability" },
      ),
      item([["2026-05-01", 12_000]], { archivedOn: "2026-08-01" }),
    ];
    const rates = [
      { date: "2025-01-01", rate: 80 },
      { date: "2026-10-10", rate: 83.4 },
    ];
    const change =
      netWorthOn(items, rates, TODAY, TODAY) -
      netWorthOn(items, rates, T0, TODAY);
    const terms = attributeChange(items, rates, T0, TODAY, "ALL");
    expect(Math.abs(sumTerms(terms) - change)).toBeLessThan(0.01);
    expect(terms.currencyEffect).not.toBe(0);
  });

  const indiaRates = [
    { date: "2025-01-01", rate: 80 },
    { date: "2026-10-10", rate: 83.4 },
  ];

  it("NH-14 A weaker rupee shows as a negative Currency effect", () => {
    const holding = item([["2025-06-01", 8_340_000]], { country: "IN" });
    const terms = attributeChange([holding], indiaRates, T0, TODAY, "ALL");
    expect(terms.assetGrowth).toBeCloseTo(0, 2);
    expect(terms.debtPaidDown).toBeCloseTo(0, 2);
    expect(terms.currencyEffect).toBeCloseTo(-4250, 2);
  });

  it("NH-15 An India Liability's Currency effect has the opposite sign", () => {
    const loan = item([["2025-06-01", 834_000]], {
      country: "IN",
      kind: "liability",
    });
    const terms = attributeChange([loan], indiaRates, T0, TODAY, "ALL");
    expect(terms.debtPaidDown).toBeCloseTo(0, 2);
    expect(terms.currencyEffect).toBeCloseTo(425, 2);
  });

  it("NH-16 Scope limits attribution to the chosen Country", () => {
    const us = item([
      ["2025-06-01", 50_000],
      ["2026-10-13", 60_000],
    ]);
    const india = item([["2025-06-01", 8_340_000]], { country: "IN" });
    const terms = attributeChange([us, india], indiaRates, T0, TODAY, "US");
    expect(terms.currencyEffect).toBe(0);
    expect(terms.assetGrowth).toBeCloseTo(
      netWorthOn([us], indiaRates, TODAY, TODAY) -
        netWorthOn([us], indiaRates, T0, TODAY),
      2,
    );
  });

  it("NH-17 A Holding added during the range counts fully as asset growth", () => {
    const added = item([["2026-05-01", 10_000]]);
    const terms = attributeChange([added], FLAT_RATES, T0, TODAY, "ALL");
    expect(terms.assetGrowth).toBeCloseTo(10_000, 2);
    expect(terms.debtPaidDown).toBe(0);
    expect(terms.currencyEffect).toBe(0);
  });
});
