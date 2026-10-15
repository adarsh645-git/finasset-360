// Validation for the PATCH /api/projection-assumptions body (design D11).
// A key that is sent is validated and written; `null` means "blank" (back to
// the default); a key that is absent is left untouched.

type Range = { min: number; max: number; integer?: boolean };

const RATE: Range = { min: -50, max: 50 };

const PORTFOLIO_FIELDS: Record<string, Range> = {
  horizon_years: { min: 1, max: 40, integer: true },
  savings_growth: RATE,
  crypto_rate: RATE,
  metals_rate: RATE,
  other_rate: RATE,
};

const COUNTRY_FIELDS: Record<string, Range> = {
  inflation: RATE,
  realestate_rate: RATE,
  stocks_rate: RATE,
  cash_rate: RATE,
  monthly_savings: { min: 0, max: Number.POSITIVE_INFINITY },
};

const COUNTRY_CODES = ["US", "IN"];

type FieldValues = Record<string, number | null>;

export type AssumptionsUpdate = {
  portfolio: FieldValues;
  countries: Record<string, FieldValues>;
};

export type ParseResult = { ok: true; update: AssumptionsUpdate } | { ok: false; error: string };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseFields(input: Record<string, unknown>, allowed: Record<string, Range>): FieldValues | string {
  const values: FieldValues = {};
  for (const [key, value] of Object.entries(input)) {
    const range = allowed[key];
    if (!range) return `Unknown field "${key}".`;
    if (value === null) {
      values[key] = null;
      continue;
    }
    const valid =
      typeof value === "number" &&
      value >= range.min &&
      value <= range.max &&
      (!range.integer || Number.isInteger(value));
    if (!valid) return `"${key}" is out of range.`;
    values[key] = value;
  }
  return values;
}

export function parseAssumptionsUpdate(body: unknown): ParseResult {
  if (!isObject(body)) return { ok: false, error: "Expected a JSON object." };

  const { countries: countriesInput, ...portfolioInput } = body;
  const portfolio = parseFields(portfolioInput, PORTFOLIO_FIELDS);
  if (typeof portfolio === "string") return { ok: false, error: portfolio };

  const countries: Record<string, FieldValues> = {};
  if (countriesInput !== undefined) {
    if (!isObject(countriesInput)) return { ok: false, error: '"countries" must be an object.' };
    for (const [code, fields] of Object.entries(countriesInput)) {
      if (!COUNTRY_CODES.includes(code)) return { ok: false, error: `Unknown country "${code}".` };
      if (!isObject(fields)) return { ok: false, error: `"${code}" must be an object.` };
      const parsed = parseFields(fields, COUNTRY_FIELDS);
      if (typeof parsed === "string") return { ok: false, error: parsed };
      countries[code] = parsed;
    }
  }

  return { ok: true, update: { portfolio, countries } };
}
