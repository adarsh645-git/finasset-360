import { COUNTRY_DEFAULTS, DEFAULT_HORIZON_YEARS, SHARED_DEFAULTS } from "@/lib/calc";
import { compact } from "@/lib/format";
import type { AssetClassId, PortfolioData } from "@/lib/read-model/types";
import { fxRatesOf } from "@/lib/views/fx";
import { growthHref, type GrowthViewState, type Tab } from "@/lib/views/growth";

// The Projection assumptions card's view-model: each field's value, placeholder
// and hint, the tab, and the pure validation and save plan the card calls.

export type FieldKind = "rate" | "savings";
/** Where a field lives in the route's body: top level, or under a Country. */
export type FieldTarget = { country: "US" | "IN" | null; column: string };
export type FieldSpec = { kind: FieldKind; target: FieldTarget };

export type AssumptionField = FieldSpec & {
  label: string;
  /** Percent as stored, or the amount; "" when blank. */
  value: string;
  /** The default, shown while the field is blank. */
  placeholder: string;
  hint: string;
  /** "%" for rates; the currency symbol for Monthly savings. */
  unit: string;
  /** The stored number, for telling an unchanged commit. */
  saved: number | null;
};

export type Assumptions = {
  tabs: { value: Tab; label: string; href: string; selected: boolean }[];
  tab: Tab;
  fields: AssumptionField[];
  shared: AssumptionField[];
  /** The horizon, which sits in the card header (ticket 6 renders it). */
  horizon: AssumptionField;
};

const RATE_MESSAGE = "Enter a rate from −50 to 50";
const SAVINGS_MESSAGE = "Enter an amount of 0 or more";
const MINUS = "−";

export type ParseResult = { ok: true; value: number | null } | { ok: false; message: string };

/** A typed entry: separators, "%" and currency symbols are ignored, U+2212 is a minus, blank is valid. */
export function parseField(kind: FieldKind, text: string): ParseResult {
  const cleaned = text.replace(/[,\s%$₹]/g, "").replace(/−/g, "-");
  if (cleaned === "") return { ok: true, value: null };
  const message = kind === "rate" ? RATE_MESSAGE : SAVINGS_MESSAGE;
  if (!/^[+-]?(\d+\.?\d*|\.\d+)$/.test(cleaned)) return { ok: false, message };
  const value = Number(cleaned);
  const valid = kind === "rate" ? value >= -50 && value <= 50 : value >= 0;
  return valid ? { ok: true, value } : { ok: false, message };
}

export type SavePatch = {
  countries?: Partial<Record<"US" | "IN", Record<string, number | null>>>;
} & Record<string, unknown>;
export type SavePlan =
  | { kind: "none" }
  | { kind: "error"; message: string }
  | { kind: "save"; patch: SavePatch };

/** What committing `text` in a field does: nothing, an inline error, or a one-field patch (blank is null). */
export function planSave(spec: FieldSpec, text: string, saved: number | null): SavePlan {
  const parsed = parseField(spec.kind, text);
  if (!parsed.ok) return { kind: "error", message: parsed.message };
  if (parsed.value === saved) return { kind: "none" };
  const { country, column } = spec.target;
  return {
    kind: "save",
    patch: country
      ? { countries: { [country]: { [column]: parsed.value } } }
      : { [column]: parsed.value },
  };
}

const num = (n: number) => String(Math.round(n * 100) / 100).replace("-", MINUS);
const shown = (n: number | null) => (n === null ? "" : num(n));

const CLASS_FIELDS: { label: string; id: AssetClassId; country: string }[] = [
  { label: "Real estate", id: "realestate", country: "realestate_rate" },
  { label: "Stocks", id: "stocks", country: "stocks_rate" },
  { label: "Cash", id: "cash", country: "cash_rate" },
];

/** The default placeholder: the Country's own row when read, else calc's. */
function countryDefault(
  data: PortfolioData,
  code: "US" | "IN",
  key: "inflation" | "realestate" | "stocks" | "cash",
): number {
  const row = data.countries.find((c) => c.code === code)?.defaults;
  if (row) return row[key];
  const calc = COUNTRY_DEFAULTS[code === "US" ? "US" : "India"];
  return calc[key === "realestate" ? "realEstate" : key] * 100;
}

export function buildAssumptions(data: PortfolioData, view: GrowthViewState): Assumptions {
  const tab: Tab = view.tab ?? (view.scope === "in" ? "in" : "us");
  const code = tab === "in" ? "IN" : "US";
  const stored = data.assumptions.byCountry[code];
  const rate = fxRatesOf(data).at(-1)?.rate;
  const usdHeld = (id: AssetClassId, only?: "US" | "IN") =>
    data.holdings
      .filter((h) => h.archivedAt === null && h.assetClass === id && (!only || h.country === only))
      .reduce((sum, h) => (h.country === "US" ? sum + h.currentValue : rate ? sum + h.currentValue / rate : sum), 0);
  const held = (id: AssetClassId, only?: "US" | "IN") => {
    const v = usdHeld(id, only);
    return v > 0 ? `${compact(v)} held` : "none held";
  };

  const rateField = (
    label: string,
    country: "US" | "IN" | null,
    column: string,
    value: number | null,
    placeholder: number,
    hint: string,
  ): AssumptionField => ({
    label,
    kind: "rate",
    target: { country, column },
    value: shown(value),
    placeholder: num(placeholder),
    hint,
    unit: "%",
    saved: value,
  });

  const savings = stored.monthlySavings;
  const fields: AssumptionField[] = [
    rateField("Inflation", code, "inflation", stored.inflation, countryDefault(data, code, "inflation"), "Used for today's dollars"),
    ...CLASS_FIELDS.map((f) =>
      rateField(
        f.label,
        code,
        f.country,
        stored[f.id as "realestate" | "stocks" | "cash"],
        countryDefault(data, code, f.id as "realestate" | "stocks" | "cash"),
        held(f.id, code),
      ),
    ),
    {
      label: "Monthly savings",
      kind: "savings",
      target: { country: code, column: "monthly_savings" },
      value: savings === null ? "" : savings.toLocaleString(code === "IN" ? "en-IN" : "en-US"),
      placeholder: "0",
      hint: `${code === "IN" ? "₹" : "$"} per month, invested at the Stocks rate`,
      unit: code === "IN" ? "₹" : "$",
      saved: savings,
    },
  ];

  const s = data.assumptions.shared;
  const shared: AssumptionField[] = [
    rateField("Crypto", null, "crypto_rate", s.crypto, SHARED_DEFAULTS.crypto * 100, held("crypto")),
    rateField("Metals", null, "metals_rate", s.metals, SHARED_DEFAULTS.metals * 100, held("metals")),
    rateField("Vehicles & other", null, "other_rate", s.other, SHARED_DEFAULTS.vehiclesAndOther * 100, held("other")),
    rateField("Savings growth", null, "savings_growth", data.assumptions.savingsGrowth, 0, "Raises monthly savings once a year"),
  ];

  const horizon = data.assumptions.horizonYears;
  return {
    tab,
    tabs: (["us", "in"] as const).map((value) => ({
      value,
      label: value === "us" ? "United States" : "India",
      href: growthHref(view, { tab: value }),
      selected: value === tab,
    })),
    fields,
    shared,
    horizon: {
      label: "Horizon",
      kind: "rate",
      target: { country: null, column: "horizon_years" },
      value: horizon === null ? "" : String(horizon),
      placeholder: String(DEFAULT_HORIZON_YEARS),
      hint: "",
      unit: "yrs",
      saved: horizon,
    },
  };
}
