import { describe, expect, it } from "vitest";
import { buildLoanDetail } from "@/lib/views/loan-detail";
import type { HoldingData, LiabilityData, PortfolioData } from "@/lib/read-model/types";
import { holding, liability, portfolio } from "../fixtures/portfolio";

const TODAY = "2026-10-14";
const val = (date: string, value: number) => ({ date, value, source: "user" as const });
const data = (loans: LiabilityData[], holdings: HoldingData[] = [], over: Partial<PortfolioData> = {}) =>
  portfolio({
    today: TODAY,
    fx: { today: { rate: 83.4, asOf: TODAY }, history: [{ date: "2025-01-31", rate: 83.4 }] },
    liabilities: loans,
    holdings,
    ...over,
  });
const detail = (loan: LiabilityData, holdings: HoldingData[] = [], over: Partial<PortfolioData> = {}) =>
  buildLoanDetail(data([loan], holdings, over), { loanId: loan.id })!;
const stat = (d: ReturnType<typeof detail>, label: string) => d.stats.find((s) => s.label === label)!;

const apartmentLoan = (over: Partial<LiabilityData> = {}) =>
  liability({
    id: "l1",
    country: "IN",
    currency: "INR",
    name: "Apartment loan · HDFC",
    principal: 3_800_000,
    currentBalance: 3_430_000,
    apr: 8.5,
    monthlyPayment: 33_000,
    startMonth: "2022-04",
    valuations: [val("2025-01-31", 3_600_000), val(TODAY, 3_430_000)],
    ...over,
  });
const usLoan = (over: Partial<LiabilityData> = {}) =>
  liability({
    id: "l1",
    name: "Car loan",
    principal: 13_900,
    currentBalance: 13_900,
    apr: 4.5,
    monthlyPayment: 330,
    startMonth: "2022-04",
    valuations: [val(TODAY, 13_900)],
    ...over,
  });

describe("loan detail header", () => {
  it("LD-01 an India loan's header", () => {
    const d = detail(apartmentLoan());
    expect(d.name).toBe("Apartment loan · HDFC");
    expect(d.badges).toEqual(["India", "INR"]);
    expect(d.usd).toBe("$41,127");
    expect(d.nativeLine).toBe("₹34,30,000 at ₹83.40/$");
    expect(d.breadcrumb[0]).toEqual({ label: "Liabilities", href: "/liabilities" });
  });

  it("LD-09 stale cue on Loan detail", () => {
    const line = (days: number) => {
      const date = new Date(Date.parse(`${TODAY}T00:00:00Z`) - days * 86_400_000).toISOString().slice(0, 10);
      return detail(usLoan({ valuations: [val(date, 13_900)] })).nativeLine;
    };
    expect(line(12)).toBe("Current balance");
    expect(line(47)).toBe("Current balance · updated 47 days ago");
  });
});

describe("loan detail paid-off bar and stats", () => {
  it.each([
    ["₹38,00,000", 3_800_000, 3_430_000, "IN", 10, "₹38,00,000"],
    ["$13,900", 13_900, 13_900, "US", 0, "$13,900"],
    ["$26,000", 26_000, 0, "US", 100, "$26,000"],
  ] as const)("LD-02 paid-off share %s", (_n, principal, balance, country, paid, text) => {
    const d = detail(
      country === "IN"
        ? apartmentLoan({ principal, currentBalance: balance, valuations: [val(TODAY, balance)] })
        : usLoan({ principal, currentBalance: balance, valuations: [val(TODAY, balance)] }),
    );
    expect(d.bar.label).toBe(`${paid}% of principal paid off`);
    expect(d.bar.sub).toBe(`${text} borrowed in Apr 2022`);
    expect(d.bar.fraction).toBeCloseTo(paid / 100, 1);
  });

  it.each([
    ["US", false, 4.5, 330, "4.5%", "Fixed APR", "$330", "EMI"],
    ["US", true, 24.9, 150, "24.9%", "Revolving credit", "$150", "Your planned payment"],
    ["IN", false, 8.5, 33_000, "8.5%", "Fixed APR", "₹33,000", "≈ $396"],
  ] as const)(
    "LD-03 rate and payment subs (%s revolving %s)",
    (country, revolving, apr, pay, rate, rateSub, payText, paySub) => {
      const base = country === "IN" ? apartmentLoan() : usLoan();
      const d = detail({ ...base, revolving, apr, monthlyPayment: pay });
      expect(stat(d, "Interest rate")).toMatchObject({ value: rate, sub: rateSub });
      expect(stat(d, "Monthly payment")).toMatchObject({ value: payText, sub: paySub });
    },
  );

  it("LD-04 an on-track loan with a term", () => {
    const d = detail(
      usLoan({
        currentBalance: 10_215,
        principal: 10_215,
        apr: 6,
        monthlyPayment: 250,
        termYears: 10,
        valuations: [val(TODAY, 10_215)],
      }),
    );
    expect(stat(d, "Projected payoff")).toMatchObject({ value: "Aug 2030", sub: "In 3.8 yrs · 10-yr term" });
    expect(stat(d, "Interest remaining")).toMatchObject({ value: "$1,240", sub: "If paid on schedule" });
  });

  it("LD-04 no term leaves the sub without a term", () => {
    const d = detail(
      usLoan({ currentBalance: 12_100, principal: 12_100, apr: 6, monthlyPayment: 300, valuations: [val(TODAY, 12_100)] }),
    );
    expect(stat(d, "Projected payoff").sub).toBe("In 3.8 yrs");
  });

  it("LD-05 Not on track", () => {
    const d = detail(usLoan({ apr: 24, monthlyPayment: 100 }));
    expect(stat(d, "Projected payoff")).toMatchObject({ value: "Never", sub: "Payment doesn’t cover interest" });
    expect(stat(d, "Interest remaining").value).toBe("—");
  });

  it("LD-05 a paid-off loan", () => {
    const d = detail(usLoan({ currentBalance: 0, valuations: [val(TODAY, 0)] }));
    expect(stat(d, "Projected payoff")).toMatchObject({ value: "Paid off", sub: "Balance is 0" });
    expect(stat(d, "Interest remaining").value).toBe("$0");
  });
});

describe("loan detail chart", () => {
  const pune = (over: Partial<HoldingData> = {}) =>
    holding({
      id: "h1",
      assetClass: "realestate",
      country: "IN",
      currency: "INR",
      name: "Pune apartment",
      currentValue: 12_000_000,
      valuations: [val("2025-01-31", 11_000_000), val(TODAY, 12_000_000)],
      ...over,
    });
  const withHorizon = (): Partial<PortfolioData> => {
    const base = portfolio();
    return { assumptions: { ...base.assumptions, horizonYears: 10 } };
  };

  it("LD-06 a linked loan's chart", () => {
    // 46 months to payoff: balance 12,100 at 6% paying 300.
    const loan = usLoan({
      currentBalance: 12_100,
      principal: 20_000,
      apr: 6,
      monthlyPayment: 300,
      linkedHoldingId: "h1",
      valuations: [val("2025-01-31", 15_000), val(TODAY, 12_100)],
    });
    const d = detail(loan, [pune()], withHorizon());
    expect(d.chart.sub).toBe("Against the value of Pune apartment");
    const [balance, value] = d.chart.series;
    expect(balance!.name).toBe("Balance");
    expect(value!.name).toBe("Pune apartment");
    expect(balance!.points[0]!.date).toBe("2025-01-31");
    expect(balance!.points.at(-1)!.date).toBe("2031-02-14"); // 52 months after today
    expect(value!.points.map((p) => p.date)).toEqual(balance!.points.map((p) => p.date));
    expect(d.chart.today).toBe(TODAY);
    expect(d.chart.zero).toBe(true);
  });

  it("LD-06 a Not on track loan runs to the horizon's end", () => {
    const d = detail(usLoan({ apr: 24, monthlyPayment: 100 }), [], withHorizon());
    expect(d.chart.series[0]!.points.at(-1)!.date).toBe("2036-10-14");
  });

  it("LD-06 the window is capped at the horizon's end", () => {
    const d = detail(
      usLoan({ currentBalance: 200_000, principal: 200_000, apr: 6, monthlyPayment: 1_200, valuations: [val(TODAY, 200_000)] }),
      [],
      withHorizon(),
    );
    expect(d.chart.series[0]!.points.at(-1)!.date).toBe("2036-10-14");
  });

  it("LD-07 a brand-new loan's chart", () => {
    const d = detail(
      usLoan({ currentBalance: 12_100, apr: 6, monthlyPayment: 300, valuations: [val(TODAY, 12_100)] }),
    );
    const points = d.chart.series[0]!.points;
    expect(d.chart.series).toHaveLength(1);
    expect(points[0]).toEqual({ date: TODAY, value: 12_100 });
    expect(points[1]!.date > TODAY).toBe(true);
    expect(points.filter((p) => p.date <= TODAY)).toHaveLength(1);
    expect(d.chart.sub).toBe("History and payoff projection");
  });
});

describe("loan detail secured-against card", () => {
  const pune = holding({
    id: "h1",
    assetClass: "realestate",
    country: "IN",
    currency: "INR",
    name: "Pune apartment",
    currentValue: 12_000_000,
    valuations: [val(TODAY, 12_000_000)],
  });

  it("LD-08 secured against card", () => {
    const d = detail(apartmentLoan({ linkedHoldingId: "h1" }), [pune]);
    expect(d.securedAgainst).toEqual({
      name: "Pune apartment",
      worth: "Worth $143,885 · 71% owned",
      equity: "$102,758 equity →",
      href: "/holdings/h1",
    });
  });

  it("LD-08 an unlinked loan, or one whose Holding is archived, shows no card", () => {
    expect(detail(apartmentLoan()).securedAgainst).toBeNull();
    expect(
      detail(apartmentLoan({ linkedHoldingId: "h1" }), [{ ...pune, archivedAt: "2026-09-01T00:00:00Z" }])
        .securedAgainst,
    ).toBeNull();
  });
});

describe("loan detail not found", () => {
  it.each(["not a Liability", "an archived Liability of this User", "another User's Liability"])(
    "LD-11 not found: %s",
    (kind) => {
      // Another User's loan never reaches this User's PortfolioData, so it looks like an unknown id.
      const loans =
        kind === "an archived Liability of this User"
          ? [usLoan({ archivedAt: "2026-09-01T00:00:00Z" })]
          : [usLoan({ id: "other-or-none" })];
      expect(buildLoanDetail(data(loans), { loanId: "l1" })).toBeNull();
    },
  );
});
