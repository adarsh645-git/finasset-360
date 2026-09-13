import { hasKey } from "@/lib/http/body";

// Field-level validators and a PATCH-body reader for a Liability's
// Amortization Assumptions (ticket 11) — mirrors
// src/lib/holdings/price-lookup.ts's readPriceLookupPatch: a pure function
// the route calls to turn a JSON body into either an error or the columns
// to write, rather than inlining per-field validation in the route itself.

/** `interest_rate`, `original_loan_amount`, `custom_monthly_payment`,
 * `extra_monthly_payment`, `escrow_portion` — every dollar amount and rate
 * in the Amortization Assumptions must be zero or positive; none of them
 * has a sensible negative value. */
export function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/** `term_months` — a loan term measured in whole months, at least one. */
export function isPositiveIntegerMonths(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

/** `start_date` — display-only (docs/SPEC.md: "read by no formula"), so the
 * only requirement is that it parses as a real calendar date, unlike
 * `recorded_at` on a Valuation there's no "not in the future" rule to
 * enforce here. */
export function isWellFormedDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

export type AmortizationPatchFields = {
  interest_rate?: number | null;
  original_loan_amount?: number | null;
  term_months?: number | null;
  custom_monthly_payment?: number | null;
  extra_monthly_payment?: number;
  escrow_portion?: number;
  start_date?: string | null;
};

/** Reads every Amortization Assumption field except `linked_holding_id`
 * (that one needs an async ownership check against `holding`, which — like
 * `liability_class_id`'s own visibility check — stays in the route rather
 * than here) from a PATCH body: an object holding only the keys present in
 * `body` (each independently optional; docs/SPEC.md: "any Liability opts
 * in by filling the fields"), or an error string naming the first invalid
 * one. */
export function readAmortizationPatch(body: unknown): AmortizationPatchFields | string {
  const patch: AmortizationPatchFields = {};
  const raw = body as Record<string, unknown>;

  for (const field of ["interest_rate", "original_loan_amount", "custom_monthly_payment"] as const) {
    if (!hasKey(body, field)) continue;
    const value = raw[field];
    if (value !== null && !isFiniteNonNegative(value)) {
      return `${field} must be a non-negative number or null.`;
    }
    patch[field] = value as number | null;
  }

  if (hasKey(body, "term_months")) {
    const value = raw.term_months;
    if (value !== null && !isPositiveIntegerMonths(value)) {
      return "term_months must be a positive integer or null.";
    }
    patch.term_months = value as number | null;
  }

  for (const field of ["extra_monthly_payment", "escrow_portion"] as const) {
    if (!hasKey(body, field)) continue;
    const value = raw[field];
    if (!isFiniteNonNegative(value)) {
      return `${field} must be a non-negative number.`;
    }
    patch[field] = value as number;
  }

  if (hasKey(body, "start_date")) {
    const value = raw.start_date;
    if (value !== null && !isWellFormedDate(value)) {
      return "start_date must be a YYYY-MM-DD date or null.";
    }
    patch.start_date = value as string | null;
  }

  return patch;
}
