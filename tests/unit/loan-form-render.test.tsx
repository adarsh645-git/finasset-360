import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  usePathname: () => "/liabilities",
  useRouter: () => ({ push: () => {}, refresh: () => {}, replace: () => {} }),
  useSearchParams: () => new URLSearchParams("modal=add-liability"),
}));

const { LoanForm } = await import("@/components/modal/LoanForm");
const { AddToggle } = await import("@/components/modal/AddToggle");
const { resolveModal, swapAddHref, closeHref } = await import("@/lib/views/modal-modes");
const { Overview } = await import("@/components/overview/Overview");
const { LoanDetail } = await import("@/components/liabilities/LoanDetail");
const { buildOverview } = await import("@/lib/views/overview");
const { buildLoanDetail } = await import("@/lib/views/loan-detail");
const { holding, liability, portfolio } = await import("../fixtures/portfolio");

const TODAY = "2026-10-14";
const noop = () => {};
const render = (
  match: Parameters<typeof LoanForm>[0]["match"],
  data = portfolio({ today: TODAY }),
  carry?: { name: string; country: "US" | "IN" },
) =>
  renderToStaticMarkup(
    <LoanForm match={match} data={data} formId="f" setBusy={noop} setError={noop} onSaved={noop} carry={carry} />,
  );
const addMatch = { mode: "add-liability", title: "Add to portfolio", saveLabel: "Add loan", holding: null, liability: null };

describe("modal modes for loans", () => {
  const amex = liability({ id: "amex", name: "Amex Gold card", revolving: true });
  const gone = liability({ id: "gone", archivedAt: "2026-01-01T00:00:00Z" });
  const data = portfolio({ today: TODAY, liabilities: [amex, gone] });
  const open = (qs: string) => resolveModal(data, new URLSearchParams(qs));

  it("LE-01 modal=add-liability opens Add to portfolio with Add loan", () => {
    expect(open("modal=add-liability")).toMatchObject({
      mode: "add-liability",
      title: "Add to portfolio",
      saveLabel: "Add loan",
    });
  });

  it("LE-07 modal=edit&liability opens Edit loan with Save, and nothing for an unknown or archived loan", () => {
    expect(open("modal=edit&liability=amex")).toMatchObject({
      mode: "edit-liability",
      title: "Edit loan",
      saveLabel: "Save",
    });
    expect(open("modal=edit&liability=gone")).toBeNull();
    expect(open("modal=edit&liability=nope")).toBeNull();
  });

  it("LE-07 closing also removes the liability param", () => {
    expect(closeHref("/liabilities/amex", "modal=edit&liability=amex")).toBe("/liabilities/amex");
  });

  it("LE-01 the toggle swaps add-asset and add-liability, keeping other params", () => {
    expect(swapAddHref("/", "modal=add-asset&class=cash&x=1", "add-liability")).toBe("/?modal=add-liability&x=1");
    expect(swapAddHref("/", "modal=add-liability", "add-asset")).toBe("/?modal=add-asset");
  });
});

describe("loan form render", () => {
  it("LE-01 the loan form shows carried name and Held in, and the toggle reads Asset | Liability", () => {
    const html = render(addMatch, undefined, { name: "Car loan", country: "US" });
    expect(html).toContain("Loan name");
    expect(html).toContain('value="Car loan"');
    expect(html).toMatch(/aria-pressed="true"[^>]*>United States · \$</);
    const toggle = renderToStaticMarkup(<AddToggle mode="add-liability" onChoose={noop} />);
    expect(toggle).toMatch(/>Asset<.*>Liability</);
    expect(toggle).toMatch(/aria-pressed="true"[^>]*>Liability</);
  });

  it("LE-01 edit shows no toggle in the form body", () => {
    const html = render({ ...addMatch, mode: "edit-liability", saveLabel: "Save", liability: liability({ id: "l1" }) });
    expect(html).not.toContain(">Asset<");
  });

  it("LE-02 the fresh form lists every field, the month default, the hints and an unticked revolving box", () => {
    const html = render(addMatch);
    for (const label of [
      "Loan name",
      "Current balance",
      "Original principal (optional)",
      "Interest rate (% APR)",
      "Monthly payment / EMI",
      "Borrowed in",
      "Term (years, optional)",
      "Linked asset (optional)",
      "Credit card (revolving)",
    ]) {
      expect(html).toContain(label);
    }
    expect(html).toContain('value="2026-10"');
    expect(html).toContain('max="2026-10"');
    expect(html).not.toMatch(/type="checkbox"[^>]*checked/);
    expect(html).toContain(
      "What you pay toward the loan each month, including any regular extra. Leave out escrow (taxes and insurance).",
    );
    expect(html).toContain("Link a loan to the asset it financed and equity (value − balance) is tracked automatically.");
  });

  it("LE-06 the picker renders None and the free Holdings", () => {
    const data = portfolio({ today: TODAY, holdings: [holding({ id: "h1", name: "Austin condo" })] });
    const html = render(addMatch, data);
    expect(html).toContain(">None</option>");
    expect(html).toContain('<option value="h1">Austin condo</option>');
  });

  it("LE-07 edit pre-fills every field and disables Held in", () => {
    const amex = liability({
      id: "amex",
      name: "Amex Gold card",
      principal: 1850,
      currentBalance: 1850,
      apr: 24.9,
      monthlyPayment: 150,
      revolving: true,
    });
    const html = render(
      { mode: "edit-liability", title: "Edit loan", saveLabel: "Save", holding: null, liability: amex },
      portfolio({ today: TODAY, liabilities: [amex] }),
    );
    for (const v of ["Amex Gold card", "1850", "24.9", "150"]) expect(html).toContain(`value="${v}"`);
    expect(html).toMatch(/type="checkbox"[^>]*checked/);
    expect(html).toMatch(/<button[^>]*disabled[^>]*>United States/);
  });
});

describe("add-loan links", () => {
  it("LE-09 the first-run card's 'or a loan' link opens the loan form, and the add links resolve to it", () => {
    const overview = buildOverview(portfolio(), { range: "All" });
    expect(overview.addLoanHref).toBe("/?modal=add-liability");
    const html = renderToStaticMarkup(<Overview overview={overview} />);
    expect(html).toMatch(/<a [^>]*href="\/\?modal=add-liability"[^>]*>or a loan/);
    const off = buildOverview(portfolio(), { range: "All", adding: false });
    expect(off.addLoanHref).toBeNull();
    expect(renderToStaticMarkup(<Overview overview={off} />)).not.toContain("or a loan");
    expect(resolveModal(portfolio(), new URLSearchParams("modal=add-liability"))).toMatchObject({
      saveLabel: "Add loan",
    });
  });

  it("LE-07 Loan detail has an Edit link that opens Edit loan", () => {
    const loan = liability({
      id: "amex",
      name: "Amex Gold card",
      currentBalance: 1850,
      principal: 1850,
      monthlyPayment: 150,
    });
    const data = portfolio({ today: TODAY, liabilities: [loan] });
    const html = renderToStaticMarkup(<LoanDetail detail={buildLoanDetail(data, { loanId: "amex" })!} />);
    expect(html).toMatch(/<a [^>]*href="\/liabilities\/amex\?modal=edit&amp;liability=amex"[^>]*>Edit/);
  });
});
