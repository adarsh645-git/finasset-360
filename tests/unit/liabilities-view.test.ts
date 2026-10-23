import { describe, expect, it } from "vitest";
import { buildLiabilities } from "@/lib/views/liabilities";
import { holding, liability, portfolio } from "../fixtures/portfolio";

const val = (date: string, value: number) => ({ date, value, source: "user" as const });
const stat = (view: ReturnType<typeof buildLiabilities>, label: string) =>
  view.stats.find((s) => s.label === label)!;

describe("liabilities header", () => {
  const TODAY = "2026-10-14";
  const base = (over: Partial<ReturnType<typeof portfolio>> = {}) =>
    portfolio({
      today: TODAY,
      fx: { today: { rate: 83.4, asOf: TODAY }, history: [{ date: "2025-10-14", rate: 83 }] },
      ...over,
    });

  it("LB-01 total and paid down for a year of history", () => {
    const view = buildLiabilities(
      base({
        liabilities: [
          liability({
            id: "us",
            currentBalance: 280_000,
            valuations: [val("2025-10-14", 300_000), val(TODAY, 280_000)],
          }),
          liability({
            id: "in",
            country: "IN",
            currency: "INR",
            currentBalance: 4_170_000,
            valuations: [val("2025-10-14", 4_170_000), val(TODAY, 4_170_000)],
          }),
        ],
      }),
    );
    expect(view.header.total).toBe("$330,000");
    expect(view.header.paidDown).toBe("$20.2K paid down in 12 mo");
  });

  it("LB-02 paid down is a dash without a year of history", () => {
    const view = buildLiabilities(
      base({
        liabilities: [liability({ currentBalance: 5_000, valuations: [val("2026-08-01", 5_000)] })],
      }),
    );
    expect(view.header.paidDown).toBe("— paid down in 12 mo");
  });
});

describe("liabilities stats", () => {
  const TODAY = "2026-10-14";
  const data = (liabilities: ReturnType<typeof liability>[]) =>
    portfolio({ today: TODAY, fx: { today: { rate: 83.4, asOf: TODAY }, history: [] }, liabilities });
  const loan = (id: string, balance: number, apr: number, pay: number, country: "US" | "IN" = "US") =>
    liability({
      id,
      country,
      currency: country === "US" ? "USD" : "INR",
      currentBalance: balance,
      principal: balance,
      apr,
      monthlyPayment: pay,
      valuations: [val(TODAY, balance)],
    });

  it("LB-03 monthly payments and weighted rate", () => {
    const view = buildLiabilities(
      data([
        loan("a", 200_000, 6, 2_000),
        loan("b", 8_340_000, 9, 83_400, "IN"),
        loan("paid", 0, 5, 500),
      ]),
    );
    expect(stat(view, "Monthly payments")).toMatchObject({
      value: "$3,000",
      sub: "All EMIs, converted to USD",
    });
    expect(stat(view, "Weighted rate")).toMatchObject({ value: "7.00%", sub: "By current balance" });
  });

  it.each([
    [
      "month 8, month 74",
      [loan("a", 800, 0, 100), loan("b", 7_400, 0, 100)],
      "Dec 2032",
      "In 6.2 yrs at current payments",
    ],
    [
      "month 8, Not on track",
      [loan("a", 800, 0, 100), loan("b", 100_000, 12, 100)],
      "Not on track",
      "A payment doesn’t cover interest",
    ],
  ])("LB-04 debt-free date or Not on track: %s", (_name, loans, value, sub) => {
    expect(stat(buildLiabilities(data(loans)), "Debt-free")).toMatchObject({ value, sub });
  });

  it("LB-05 interest remaining leaves out Not on track loans", () => {
    // Zero-APR loans pay no interest, so use payoffs whose interest is known:
    // $10,000 at 12% APR paid at the annuity payment for 12 months has a known total.
    const onTrack = [loan("a", 100_000, 12, 20_000), loan("b", 8_340_000, 12, 1_668_000, "IN")];
    const withStuck = [...onTrack, loan("c", 100_000, 12, 100)];
    const base = stat(buildLiabilities(data(onTrack)), "Interest remaining");
    const view = stat(buildLiabilities(data(withStuck)), "Interest remaining");
    expect(base.sub).toBe("If paid on schedule");
    expect(view.sub).toBe("Excludes 1 loan not on track");
    expect(view.value).toBe(base.value);
    expect(base.value).toMatch(/^\$[\d,]+$/);
    expect(base.value).not.toBe("$0");
    // Both on-track loans are the same loan in USD, so the total is exactly twice one loan's interest.
    const one = stat(buildLiabilities(data([onTrack[0]!])), "Interest remaining").value;
    const num = (s: string) => Number(s.replace(/[$,]/g, ""));
    expect(Math.abs(num(base.value) - 2 * num(one))).toBeLessThanOrEqual(1);
  });
});

describe("liability rows", () => {
  it("LB-06 a linked India loan's row", () => {
    const TODAY = "2023-09-15";
    const view = buildLiabilities(
      portfolio({
        today: TODAY,
        fx: { today: { rate: 83.4, asOf: TODAY }, history: [] },
        holdings: [holding({ id: "pune", name: "Pune apartment", assetClass: "realestate" })],
        liabilities: [
          liability({
            id: "hdfc",
            name: "Apartment loan · HDFC",
            country: "IN",
            currency: "INR",
            principal: 3_800_000,
            currentBalance: 3_430_000,
            apr: 8.5,
            monthlyPayment: 33_000,
            linkedHoldingId: "pune",
            valuations: [val(TODAY, 3_430_000)],
          }),
        ],
      }),
    );
    const [row] = view.rows;
    expect(row).toMatchObject({
      id: "hdfc",
      name: "Apartment loan · HDFC",
      badge: "IN",
      usd: "$41,127",
      native: "₹34,30,000",
      meta: "10% paid · 8.5% · ₹33,000/mo",
      secondary: "Secures Pune apartment · Paid off Jun 2039",
      href: "/liabilities/hdfc",
    });
  });

  it("LB-07 an unlinked Not on track loan's row", () => {
    const TODAY = "2026-10-14";
    const view = buildLiabilities(
      portfolio({
        today: TODAY,
        liabilities: [
          liability({
            id: "card",
            currentBalance: 10_000,
            principal: 10_000,
            apr: 24,
            monthlyPayment: 100,
            valuations: [val(TODAY, 10_000)],
          }),
        ],
      }),
    );
    const [row] = view.rows;
    expect(row.secondary).toBe("No payoff at this payment");
    expect(row.native).toBe("");
  });

  it("LB-08 order, colours and archived loans", () => {
    const mk = (id: string, createdAt: string, balance: number, archivedAt: string | null = null) =>
      liability({ id, createdAt, currentBalance: balance, principal: balance, archivedAt });
    const view = buildLiabilities(
      portfolio({
        liabilities: [
          mk("A", "2020-01-01T00:00:00Z", 5_000),
          mk("B", "2021-01-01T00:00:00Z", 200_000),
          mk("C", "2022-01-01T00:00:00Z", 40_000),
          mk("D", "2023-01-01T00:00:00Z", 90_000, "2026-01-01T00:00:00Z"),
        ],
      }),
    );
    expect(view.rows.map((r) => r.id)).toEqual(["B", "C", "A"]);
    expect(Object.fromEntries(view.rows.map((r) => [r.id, r.colorVar]))).toEqual({
      A: "--loan-1",
      B: "--loan-2",
      C: "--loan-3",
    });
  });

  it.each([
    [0, null],
    [30, null],
    [47, "· 47 days old"],
  ])("LB-09 stale cue on a loan row aged %i days", (days, cue) => {
    const TODAY = "2026-10-14";
    const entered = new Date(Date.parse(`${TODAY}T00:00:00Z`) - days * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const view = buildLiabilities(
      portfolio({
        today: TODAY,
        liabilities: [liability({ currentBalance: 100, valuations: [val(entered, 100)] })],
      }),
    );
    expect(view.rows[0].cue).toBe(cue);
  });
});

describe("liabilities empty state", () => {
  it("LB-12 no active loans", () => {
    const view = buildLiabilities(
      portfolio({
        holdings: [holding({ currentValue: 1_000 })],
        liabilities: [liability({ archivedAt: "2026-01-01T00:00:00Z", currentBalance: 5 })],
      }),
    );
    expect(view.header).toEqual({ total: "$0", paidDown: "— paid down in 12 mo" });
    expect(view.stats.map((s) => s.value)).toEqual(["—", "—", "—", "—"]);
    expect(view.rows).toEqual([]);
    expect(view.empty).toEqual({ message: "No loans", addHref: "/liabilities?modal=add-liability" });
  });
});
