import { describe, expect, it } from "vitest";
import {
  attributeChange,
  fxRateOn,
  netWorthOn,
  restateInTodaysDollars,
  sampleDates,
  setTwelveMonthChange,
  twelveMonthChange,
  valueOn,
  type HistoryItem,
} from "@/lib/calc";

const today = "2026-10-13";
const val = (date: string, amount: number) => ({ date, amount });
const us = (valuations: HistoryItem["valuations"], extra: Partial<HistoryItem> = {}): HistoryItem => ({
  country: "US",
  valuations,
  ...extra,
});
const rates = [
  { date: "2026-01-01", rate: 82.0 },
  { date: "2026-01-05", rate: 83.0 },
  { date: "2026-10-10", rate: 83.4 },
];

describe("NH-01 Value on a date follows the history rule", () => {
  const item = us([val("2026-01-01", 1000), val("2026-01-11", 2000)]);
  it.each([
    ["2025-12-31", 0],
    ["2026-01-01", 1000],
    ["2026-01-06", 1500],
    ["2026-01-11", 2000],
    ["2026-06-30", 2000],
  ])("NH-01 %s is %i", (date, value) => {
    expect(valueOn(item, date, today)).toBeCloseTo(value, 2);
  });
});

describe("NH-02 An archived item counts only while it was held", () => {
  it("NH-02 5,000, 5,000 and 0 around the archive date", () => {
    const item = us([val("2026-01-01", 5000)], { archivedOn: "2026-05-01" });
    expect(valueOn(item, "2026-03-01", today)).toBe(5000);
    expect(valueOn(item, "2026-05-01", today)).toBe(5000);
    expect(valueOn(item, "2026-05-02", today)).toBe(0);
  });
});

describe("NH-03 A current value acts as today's Valuation", () => {
  it("NH-03 10,600 today and 10,300 on 2026-10-07", () => {
    const item = us([val("2026-10-01", 10000)], { currentValue: 10600 });
    expect(valueOn(item, "2026-10-13", today)).toBeCloseTo(10600, 2);
    expect(valueOn(item, "2026-10-07", today)).toBeCloseTo(10300, 2);
  });
});

describe("NH-04 Sample dates for a range", () => {
  it.each([
    ["2025-01-01", "2026-07-13", ["2026-07-13", "2026-07-31", "2026-08-31", "2026-09-30", "2026-10-13"]],
    ["2026-08-20", "2025-10-13", ["2026-08-20", "2026-08-31", "2026-09-30", "2026-10-13"]],
    ["2026-10-13", "2025-10-13", ["2026-10-13"]],
  ])("NH-04 first %s, range start %s", (first, start, dates) => {
    expect(sampleDates(first, start, today)).toEqual(dates);
  });
});

describe("NH-05 Looking up the FX Rate for a date", () => {
  it.each([
    ["2025-06-01", 82.0, "2026-01-01"],
    ["2026-01-04", 82.0, "2026-01-01"],
    ["2026-01-05", 83.0, "2026-01-05"],
    ["2026-10-13", 83.4, "2026-10-10"],
  ])("NH-05 %s is %d as of %s", (date, rate, asOf) => {
    expect(fxRateOn([...rates].reverse(), date)).toEqual({ rate, asOf });
  });
});

describe("NH-06 Net Worth on a past date uses that date's FX Rate", () => {
  it("NH-06 50,000 + 100,000 - 50,000 = 100,000", () => {
    const d = "2026-01-01";
    const portfolio = {
      holdings: [us([val(d, 50_000)]), { country: "India" as const, valuations: [val(d, 8_200_000)] }],
      liabilities: [{ country: "India" as const, valuations: [val(d, 4_100_000)] }],
    };
    expect(netWorthOn(portfolio, rates, d, today)).toBeCloseTo(100_000, 2);
  });
});

const ctx = { fxRates: [{ date: "2020-01-01", rate: 80 }], today };

describe("NH-07 12-month change of an item with a year of history", () => {
  it("NH-07 +20,000 or +25%", () => {
    const item = us([val("2025-10-13", 80_000), val("2026-10-13", 100_000)]);
    const change = twelveMonthChange(item, ctx);
    expect(change?.amount).toBeCloseTo(20_000, 2);
    expect(change?.percent).toBeCloseTo(0.25, 6);
  });
});

describe("NH-08 A brand-new item has no 12-month change", () => {
  it("NH-08 amount and percent are absent", () => {
    expect(twelveMonthChange(us([val("2026-07-13", 5000)]), ctx)).toBeUndefined();
  });
});

describe("NH-09 A new Holding does not inflate its class's change", () => {
  it("NH-09 +10,000 or +10%", () => {
    const old = us([val("2025-10-13", 100_000), val("2026-10-13", 110_000)]);
    const added = us([val("2026-09-13", 50_000)]);
    const change = setTwelveMonthChange([old, added], ctx, "holdings");
    expect(change?.amount).toBeCloseTo(10_000, 2);
    expect(change?.percent).toBeCloseTo(0.1, 6);
  });
});

describe("NH-10 Paid down in 12 months for Liabilities", () => {
  it("NH-10 paid down is 20,000", () => {
    const old = us([val("2025-10-13", 300_000), val("2026-10-13", 280_000)]);
    const added = us([val("2026-09-13", 5000)]);
    const change = setTwelveMonthChange([old, added], ctx, "liabilities");
    expect(change?.amount).toBeCloseTo(20_000, 2);
  });
  it("NH-10 a set with no item a year old has no figure", () => {
    expect(setTwelveMonthChange([us([val("2026-09-13", 5000)])], ctx, "liabilities")).toBeUndefined();
  });
});

describe("NH-11 Past values rise and future values fall in Today's dollars", () => {
  it("NH-11 24 months either side of today", () => {
    const us = [
      { month: "2024-10", netWorth: 100_000 },
      { month: "2026-10", netWorth: 100_000 },
      { month: "2028-10", netWorth: 100_000 },
    ];
    const out = restateInTodaysDollars({ US: us }, "2026-10", { countries: { US: { inflation: 0.03 } } });
    expect(out[0].netWorth).toBeCloseTo(100_000 * 1.03 ** 2, 2);
    expect(out[1].netWorth).toBeCloseTo(100_000, 2);
    expect(out[2].netWorth).toBeCloseTo(100_000 / 1.03 ** 2, 2);
  });
});

describe("NH-12 Each Country deflates at its own inflation before summing", () => {
  it("NH-12 100,000 / 1.03 + 100,000 / 1.05", () => {
    const point = [{ month: "2027-10", netWorth: 100_000 }];
    const out = restateInTodaysDollars({ US: point, India: point }, "2026-10", {
      countries: { US: { inflation: 0.03 }, India: { inflation: 0.05 } },
    });
    expect(out).toHaveLength(1);
    expect(out[0].netWorth).toBeCloseTo(100_000 / 1.03 + 100_000 / 1.05, 2);
  });
});

describe("change attribution", () => {
  const t0 = "2026-01-01";
  const fx = [
    { date: t0, rate: 80.0 },
    { date: "2026-10-01", rate: 83.4 },
  ];
  const india = (valuations: HistoryItem["valuations"]): HistoryItem => ({ country: "India", valuations });

  it("NH-13 the three terms sum to the change in Net Worth", () => {
    const portfolio = {
      holdings: [
        us([val(t0, 50_000), val("2026-09-01", 62_000)]),
        india([val(t0, 8_000_000), val("2026-08-01", 9_100_000)]),
        us([val("2026-05-01", 7_000)]),
      ],
      liabilities: [
        us([val(t0, 30_000), val("2026-09-01", 26_000)]),
        india([val(t0, 900_000), val("2026-09-01", 800_000)]),
      ],
    };
    const r = attributeChange(portfolio, fx, t0, today, ["US", "India"]);
    const change = netWorthOn(portfolio, fx, today, today) - netWorthOn(portfolio, fx, t0, today);
    expect(r.assetGrowth + r.debtPaidDown + r.currencyEffect).toBeCloseTo(change, 2);
  });

  it("NH-14 a weaker rupee shows as a negative Currency effect", () => {
    const r = attributeChange(
      { holdings: [india([val(t0, 8_340_000)])], liabilities: [] },
      fx,
      t0,
      today,
      ["US", "India"],
    );
    expect(r.assetGrowth).toBeCloseTo(0, 2);
    expect(r.debtPaidDown).toBeCloseTo(0, 2);
    expect(r.currencyEffect).toBeCloseTo(-4250, 2);
  });

  it("NH-15 an India Liability's Currency effect has the opposite sign", () => {
    const r = attributeChange(
      { holdings: [], liabilities: [india([val(t0, 834_000)])] },
      fx,
      t0,
      today,
      ["US", "India"],
    );
    expect(r.debtPaidDown).toBeCloseTo(0, 2);
    expect(r.currencyEffect).toBeCloseTo(425, 2);
  });

  it("NH-16 scope limits attribution to the chosen Country", () => {
    const portfolio = {
      holdings: [us([val(t0, 50_000), val("2026-09-01", 60_000)]), india([val(t0, 8_000_000)])],
      liabilities: [],
    };
    const r = attributeChange(portfolio, fx, t0, today, ["US"]);
    expect(r.currencyEffect).toBe(0);
    expect(r.assetGrowth + r.debtPaidDown).toBeCloseTo(10_000, 2);
  });

  it("NH-17 a Holding added during the range counts fully as asset growth", () => {
    const r = attributeChange(
      { holdings: [us([val("2026-06-01", 10_000)])], liabilities: [] },
      fx,
      t0,
      today,
      ["US", "India"],
    );
    expect(r.assetGrowth).toBeCloseTo(10_000, 2);
  });
});
