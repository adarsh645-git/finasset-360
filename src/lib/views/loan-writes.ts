import { formatDay, native } from "@/lib/format";
import type { LiabilityData } from "@/lib/read-model/types";
import { parseAmount, send, type FetchFn, type SaveResult } from "@/lib/views/holding-writes";
import { calcCountry } from "@/lib/views/shell";

// What the loan modals send to the liability routes. Kept free of React so each step is a plain test.

/** Update balance's input: its label, pre-filled balance and the "Was ..." line (LE-08). */
export function updateBalanceView(loan: LiabilityData, today: string) {
  return {
    label: `Current balance of ${loan.name}`,
    prefix: loan.country === "IN" ? "₹" : "$",
    initial: String(loan.currentBalance),
    was: `Was ${native(loan.currentBalance, calcCountry(loan.country))} · logged as today’s value, ${formatDay(today)}`,
  };
}

/** Always posts, so an unchanged balance still records today's Valuation (LE-08). */
export async function saveBalance(fetchFn: FetchFn, loanId: string, raw: string): Promise<SaveResult> {
  const balance = parseAmount(raw);
  if (balance === null) return { ok: false, error: "Enter the current balance" };
  return send(fetchFn, "POST", `/api/liabilities/${loanId}/valuations`, { balance });
}
