import { describe, expect, it } from "vitest";
import {
  initialLoan,
  initialLoanEdit,
  linkOptions,
  saveLoan,
  toLoanRequest,
  validateLoan,
  LOAN_COPY,
  type LoanForm,
} from "@/lib/views/loan-form";
import { defaultAfterSave } from "@/lib/views/holding-entry";
import { buildLoanDetail } from "@/lib/views/loan-detail";
import { holding, liability, portfolio } from "../fixtures/portfolio";

const TODAY = "2026-10-14";
const val = (date: string, value: number) => ({ date, value, source: "user" as const });
const filled = (over: Partial<LoanForm> = {}): LoanForm => ({
  ...initialLoan(TODAY),
  name: "Auto loan",
  balance: "9100",
  apr: "5.9",
  payment: "501",
  ...over,
});
const reply = (status: number, body: unknown) => async () => new Response(JSON.stringify(body), { status });

describe("loan form defaults", () => {
  it("LE-02 a fresh loan form is US, borrowed this month, not revolving, with the hints", () => {
    const form = initialLoan(TODAY);
    expect(form).toMatchObject({ country: "US", borrowedIn: "2026-10", revolving: false, linkedId: "", name: "" });
    expect(LOAN_COPY.paymentHint).toBe(
      "What you pay toward the loan each month, including any regular extra. Leave out escrow (taxes and insurance).",
    );
    expect(LOAN_COPY.linkHint).toBe(
      "Link a loan to the asset it financed and equity (value − balance) is tracked automatically.",
    );
  });

  it("LE-01 name and Held in carry over from the asset form", () => {
    expect(initialLoan(TODAY, { name: "Car loan", country: "US" })).toMatchObject({ name: "Car loan", country: "US" });
    expect(initialLoan(TODAY, { name: "Home loan", country: "IN" })).toMatchObject({ name: "Home loan", country: "IN" });
  });
});

describe("loan validation", () => {
  it.each([
    ["", "9100", "5.9", "501", "Give it a name"],
    ["Auto loan", "", "5.9", "501", "Enter the current balance"],
    ["Auto loan", "9100", "", "501", "Enter the interest rate"],
    ["Auto loan", "9100", "5.9", "0", "Enter the monthly payment"],
    ["Auto loan", "₹ 34,30,000", "8.5", "33,000", null],
  ])("LE-03 name %j balance %j apr %j payment %j gives %j", (name, balance, apr, payment, message) => {
    expect(validateLoan(filled({ name, balance, apr, payment }))).toBe(message);
  });

  it("LE-03 checks in order and a failed check sends nothing", async () => {
    let sent = 0;
    const fetchFn = async () => {
      sent++;
      return new Response("{}");
    };
    const saved = await saveLoan(fetchFn, filled({ name: " ", balance: "" }));
    expect(saved).toEqual({ ok: false, error: "Give it a name" });
    expect(sent).toBe(0);
  });
});

describe("loan request bodies", () => {
  it.each([
    ["", "", 9100, undefined],
    ["26000", "5", 26000, 5],
    ["5000", "", 9100, undefined],
  ])("LE-04 principal %j term %j saves principal %j and term %j", (principal, term, savedPrincipal, savedTerm) => {
    const { body } = toLoanRequest(filled({ balance: "9,100", principal, term }));
    expect(body.principal).toBe(savedPrincipal);
    expect(body.term_years).toBe(savedTerm);
  });

  it("LE-05 an add posts the figures in the route's shape", () => {
    const request = toLoanRequest(
      filled({
        name: "Auto loan · Honda Financial",
        principal: "26000",
        borrowedIn: "2024-03",
        linkedId: "h-car",
        revolving: true,
      }),
    );
    expect(request.method).toBe("POST");
    expect(request.url).toBe("/api/liabilities");
    expect(request.body).toEqual({
      country: "US",
      name: "Auto loan · Honda Financial",
      balance: 9100,
      principal: 26000,
      apr: 5.9,
      monthly_payment: 501,
      start_month: "2024-03",
      revolving: true,
      linked_holding_id: "h-car",
    });
  });

  it("LE-05 an add opens the new Loan detail, which shows the balance, 65% paid and no stale cue", async () => {
    expect(defaultAfterSave("add-liability", { id: "new1" })).toBe("/liabilities/new1");
    expect(defaultAfterSave("add-liability", {})).toBeNull();
    const saved = await saveLoan(reply(201, { id: "new1" }), filled());
    expect(saved).toEqual({ ok: true, result: { id: "new1" } });

    const created = liability({
      id: "new1",
      name: "Auto loan · Honda Financial",
      principal: 26_000,
      currentBalance: 9_100,
      apr: 5.9,
      monthlyPayment: 501,
      startMonth: "2024-03",
      valuations: [val(TODAY, 9_100)],
    });
    const detail = buildLoanDetail(portfolio({ today: TODAY, liabilities: [created] }), { loanId: "new1" })!;
    expect(detail.usd).toBe("$9,100");
    expect(detail.bar.label).toBe("65% of principal paid off");
    expect(detail.nativeLine).toBe("Current balance");
  });

  it("LE-05 a failed save returns the route's error and the add stays open", async () => {
    const saved = await saveLoan(reply(400, { error: "That Holding already has an active loan linked." }), filled());
    expect(saved).toEqual({ ok: false, error: "That Holding already has an active loan linked." });
  });

  it("LE-05 amounts accept commas, spaces and currency signs", () => {
    const { body } = toLoanRequest(filled({ country: "IN", balance: "₹ 34,30,000", payment: "33 000" }));
    expect(body).toMatchObject({ country: "IN", balance: 3_430_000, monthly_payment: 33_000 });
  });

  it("LE-04 borrowed-in is never later than this month, and a blank one is left to the route's default", () => {
    expect(toLoanRequest(filled({ borrowedIn: "2027-01" }), undefined, TODAY).body.start_month).toBe("2026-10");
    expect(toLoanRequest(filled({ borrowedIn: "" })).body.start_month).toBeUndefined();
  });
});

describe("linked asset options", () => {
  const data = portfolio({
    today: TODAY,
    holdings: [
      holding({ id: "h1", name: "Austin condo", assetClass: "realestate" }),
      holding({ id: "h2", name: "Pune apartment", assetClass: "realestate" }),
      holding({ id: "h3", name: "Honda CR-V", assetClass: "other" }),
      holding({ id: "h4", name: "Old car", assetClass: "other", archivedAt: "2026-01-01T00:00:00Z" }),
    ],
    liabilities: [liability({ id: "L1", name: "Pune loan", linkedHoldingId: "h2" })],
  });

  it.each([
    ["to add a loan", undefined, ["None", "Austin condo", "Honda CR-V"]],
    ["to edit L1", "L1", ["None", "Austin condo", "Honda CR-V", "Pune apartment"]],
  ])("LE-06 the picker %s offers %j", (_mode, editing, names) => {
    expect(linkOptions(data, editing).map((o) => o.label)).toEqual(names);
  });

  it("LE-06 None has an empty value and each Holding its id", () => {
    expect(linkOptions(data)[0]).toEqual({ value: "", label: "None" });
    expect(linkOptions(data)[1]).toEqual({ value: "h1", label: "Austin condo" });
  });

  it("LE-06 an archived loan does not hold its Holding", () => {
    const freed = portfolio({
      ...data,
      liabilities: [liability({ id: "L1", linkedHoldingId: "h2", archivedAt: "2026-02-01T00:00:00Z" })],
    });
    expect(linkOptions(freed).map((o) => o.label)).toContain("Pune apartment");
  });
});

describe("edit loan", () => {
  const amex = liability({
    id: "amex",
    name: "Amex Gold card",
    principal: 1_850,
    currentBalance: 1_850,
    apr: 24.9,
    monthlyPayment: 150,
    revolving: true,
    startMonth: "2021-05-01",
    valuations: [val("2026-08-28", 1_850)],
  });

  it("LE-07 the form is pre-filled and patches the full replacement with the same Country", () => {
    const form = initialLoanEdit(amex);
    expect(form).toMatchObject({
      country: "US",
      name: "Amex Gold card",
      balance: "1850",
      apr: "24.9",
      payment: "150",
      revolving: true,
      borrowedIn: "2021-05",
      term: "",
      linkedId: "",
    });
    const request = toLoanRequest(form, "amex");
    expect(request.method).toBe("PATCH");
    expect(request.url).toBe("/api/liabilities/amex");
    expect(request.body).toMatchObject({ country: "US", balance: 1850, apr: 24.9, monthly_payment: 150, revolving: true });
  });

  it("LE-07 saving unchanged records today, so the Loan detail shows no stale cue", () => {
    const stale = buildLoanDetail(portfolio({ today: TODAY, liabilities: [amex] }), { loanId: "amex" })!;
    expect(stale.nativeLine).toBe("Current balance · updated 47 days ago");
    const after = { ...amex, valuations: [...amex.valuations, val(TODAY, 1_850)] };
    const fresh = buildLoanDetail(portfolio({ today: TODAY, liabilities: [after] }), { loanId: "amex" })!;
    expect(fresh.nativeLine).toBe("Current balance");
  });

  it("LE-07 an edit closes the modal rather than navigating", () => {
    expect(defaultAfterSave("edit-liability", { id: "amex" })).toBeNull();
  });
});
