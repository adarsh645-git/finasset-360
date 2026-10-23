// Validation for a Liability's fields, shared by create and edit (design.md
// D8). A flat loan: its balance lives only in Valuations, so `balance` here is
// the amount for today's Valuation, not a column.

export type LiabilityInput = {
  country: string;
  name: string;
  balance: number;
  principal: number;
  apr: number;
  monthlyPayment: number;
  termYears: number | null;
  /** First of the month, `YYYY-MM-01`. */
  startMonth: string;
  revolving: boolean;
  linkedHoldingId: string | null;
};

type Parsed = { ok: true; input: LiabilityInput } | { ok: false; error: string };

const absent = (value: unknown) => value === undefined || value === null;
const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

/** A Liability balance of 0 or more, or `null`. */
export function parseBalance(value: unknown): number | null {
  return isNumber(value) && value >= 0 ? value : null;
}

export function parseLiability(
  body: Record<string, unknown>,
  knownCountries: readonly string[],
  today: string,
): Parsed {
  const fail = (error: string): Parsed => ({ ok: false, error });

  const country = body.country;
  if (typeof country !== "string" || !knownCountries.includes(country)) return fail("Country must be a known country.");
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return fail("Name is required.");

  const balance = parseBalance(body.balance);
  if (balance === null) return fail("Balance must be a number of 0 or more.");

  let principal = balance;
  if (!absent(body.principal)) {
    if (!isNumber(body.principal) || body.principal < 0) return fail("Principal must be a number of 0 or more.");
    principal = Math.max(body.principal, balance);
  }

  if (!isNumber(body.apr) || body.apr < 0) return fail("APR must be a number of 0 or more.");
  if (!isNumber(body.monthly_payment) || body.monthly_payment <= 0) {
    return fail("Monthly payment must be a number above 0.");
  }

  let termYears: number | null = null;
  if (!absent(body.term_years)) {
    if (!isNumber(body.term_years) || body.term_years <= 0) return fail("Term must be a number of years above 0.");
    termYears = body.term_years;
  }

  let startMonth = `${today.slice(0, 7)}-01`;
  if (!absent(body.start_month)) {
    const text = body.start_month;
    if (typeof text !== "string" || !/^\d{4}-(0[1-9]|1[0-2])$/.test(text)) {
      return fail("Start month must look like 2021-03.");
    }
    startMonth = `${text}-01`;
  }

  if (!absent(body.revolving) && typeof body.revolving !== "boolean") return fail("Revolving must be true or false.");

  let linkedHoldingId: string | null = null;
  if (!absent(body.linked_holding_id)) {
    if (typeof body.linked_holding_id !== "string") return fail("Linked Holding must be a Holding id.");
    linkedHoldingId = body.linked_holding_id;
  }

  return {
    ok: true,
    input: {
      country,
      name,
      balance,
      principal,
      apr: body.apr,
      monthlyPayment: body.monthly_payment,
      termYears,
      startMonth,
      revolving: body.revolving === true,
      linkedHoldingId,
    },
  };
}
