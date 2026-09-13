// The one column list every Liability route selects — GET, POST, PATCH and
// the archive route all return the exact same shape, so ticket 11's eight
// new Amortization Assumption columns only need adding once (mirrors
// src/lib/holdings/columns.ts's HOLDING_COLUMNS).
// A single string literal, not a concatenation — supabase-js parses this
// exact literal type to infer `.select()`'s return shape, which a
// runtime-built string (even from `+`-joined literals) can't do; splitting
// it would silently widen the type to `string` and fall back to an
// untyped result.
export const LIABILITY_COLUMNS =
  "id, liability_class_id, name, currency, archived_at, created_at, interest_rate, original_loan_amount, term_months, custom_monthly_payment, extra_monthly_payment, escrow_portion, start_date, linked_holding_id";
