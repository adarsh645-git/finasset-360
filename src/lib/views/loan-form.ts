import type { CountryCode, LiabilityData, PortfolioData } from "@/lib/read-model/types";
import { parseAmount, send, type FetchFn, type SaveResult } from "@/lib/views/holding-writes";

// The loan form as plain functions (design.md D3, D4, D13, D14): its initial
// state, the first validation failure in the prototype's order, the request
// to send and the linked-asset choices. The component holds no rules.

export const LOAN_COPY = {
  paymentHint:
    "What you pay toward the loan each month, including any regular extra. Leave out escrow (taxes and insurance).",
  linkHint: "Link a loan to the asset it financed and equity (value − balance) is tracked automatically.",
} as const;

export type LoanForm = {
  country: CountryCode;
  name: string;
  balance: string;
  principal: string;
  apr: string;
  payment: string;
  /** `YYYY-MM`, or blank. */
  borrowedIn: string;
  term: string;
  /** A Holding id, or "" for None. */
  linkedId: string;
  revolving: boolean;
};

/** Name and Held in survive switching from the asset form (LE-01). */
export type LoanCarry = { name: string; country: CountryCode };

export function initialLoan(today: string, carry?: LoanCarry): LoanForm {
  return {
    country: carry?.country ?? "US",
    name: carry?.name ?? "",
    balance: "",
    principal: "",
    apr: "",
    payment: "",
    borrowedIn: today.slice(0, 7),
    term: "",
    linkedId: "",
    revolving: false,
  };
}

const text = (n: number | null) => (n === null ? "" : String(n));

export function initialLoanEdit(loan: LiabilityData): LoanForm {
  return {
    country: loan.country,
    name: loan.name,
    balance: String(loan.currentBalance),
    principal: String(loan.principal),
    apr: String(loan.apr),
    payment: String(loan.monthlyPayment),
    borrowedIn: loan.startMonth.slice(0, 7),
    term: text(loan.termYears),
    linkedId: loan.linkedHoldingId ?? "",
    revolving: loan.revolving,
  };
}

/** The first failure in the prototype's order, or null (LE-03). */
export function validateLoan(form: LoanForm): string | null {
  if (form.name.trim() === "") return "Give it a name";
  if (parseAmount(form.balance) === null) return "Enter the current balance";
  if (parseAmount(form.apr) === null) return "Enter the interest rate";
  const payment = parseAmount(form.payment);
  if (payment === null || payment <= 0) return "Enter the monthly payment";
  return null;
}

export type LoanRequest = { method: "POST" | "PATCH"; url: string; body: Record<string, unknown> };

/**
 * An add posts; an edit patches the full replacement with the same Country.
 * A blank or lower principal is saved as the balance, a blank term is left
 * out, and Borrowed in is never later than this month (LE-04).
 */
export function toLoanRequest(form: LoanForm, loanId?: string, today?: string): LoanRequest {
  const balance = parseAmount(form.balance) ?? 0;
  const principal = parseAmount(form.principal);
  const term = parseAmount(form.term);
  const body: Record<string, unknown> = {
    country: form.country,
    name: form.name.trim(),
    balance,
    principal: principal === null ? balance : Math.max(principal, balance),
    apr: parseAmount(form.apr),
    monthly_payment: parseAmount(form.payment),
    revolving: form.revolving,
  };
  if (term !== null && term > 0) body.term_years = term;
  if (form.borrowedIn) {
    const latest = today?.slice(0, 7);
    body.start_month = latest && form.borrowedIn > latest ? latest : form.borrowedIn;
  }
  if (form.linkedId) body.linked_holding_id = form.linkedId;
  return loanId
    ? { method: "PATCH", url: `/api/liabilities/${loanId}`, body }
    : { method: "POST", url: "/api/liabilities", body };
}

/** Checks, then sends. A failed check sends nothing and returns its message. */
export async function saveLoan(
  fetchFn: FetchFn,
  form: LoanForm,
  loanId?: string,
  today?: string,
): Promise<SaveResult> {
  const problem = validateLoan(form);
  if (problem) return { ok: false, error: problem };
  const { method, url, body } = toLoanRequest(form, loanId, today);
  return send(fetchFn, method, url, body);
}

/** "None" plus the active Holdings no other active loan secures; an edit also offers its own (LE-06). */
export function linkOptions(data: PortfolioData, editingId?: string): { value: string; label: string }[] {
  const taken = new Set(
    data.liabilities
      .filter((l) => l.archivedAt === null && l.id !== editingId && l.linkedHoldingId)
      .map((l) => l.linkedHoldingId),
  );
  return [
    { value: "", label: "None" },
    ...data.holdings
      .filter((h) => h.archivedAt === null && !taken.has(h.id))
      .map((h) => ({ value: h.id, label: h.name }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  ];
}
