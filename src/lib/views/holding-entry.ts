import type { AssetClassId, CountryCode, HoldingData } from "@/lib/read-model/types";
import { parseAmount, send, type FetchFn, type SaveResult } from "@/lib/views/holding-writes";

// The add/edit asset form as plain functions (design.md D3, D6, D8): what each
// class shows, the first validation failure, and the request to send. The
// component holds no rules. Ticket 5 (the Stocks positions editor) fills
// `positionCount` and `pendingTicker` and adds the Positions to `toRequest`.

export const CLASS_ORDER: readonly AssetClassId[] = ["stocks", "realestate", "cash", "crypto", "metals", "other"];

export const CLASS_LABEL: Record<AssetClassId, string> = {
  stocks: "Stocks",
  realestate: "Real estate",
  cash: "Cash",
  crypto: "Crypto",
  metals: "Metals",
  other: "Vehicles & other",
};

export const PROPERTY_TYPES = ["Residential", "Land", "REIT / fund", "Commercial"] as const;
export const METAL_UNITS = [
  { value: "g", label: "Grams" },
  { value: "oz t", label: "Troy oz" },
] as const;
export const COUNTRIES: readonly { code: CountryCode; label: string }[] = [
  { code: "US", label: "United States · $" },
  { code: "IN", label: "India · ₹" },
];

export type MetalUnit = (typeof METAL_UNITS)[number]["value"];

export type EntryForm = {
  classId: AssetClassId;
  country: CountryCode;
  name: string;
  description: string;
  propertyType: string;
  city: string;
  value: string;
  costBasis: string;
  quantity: string;
  unit: MetalUnit;
  /** Stocks only: set by the positions editor (ticket 5). */
  positionCount: number;
  pendingTicker: string;
};

export const prefixFor = (country: CountryCode) => (country === "IN" ? "₹" : "$");

const NAME: Record<AssetClassId, [label: string, placeholder: string]> = {
  stocks: ["Account name", "e.g. Schwab brokerage"],
  realestate: ["Property name", "e.g. Austin condo"],
  cash: ["Name", "e.g. Chase savings"],
  crypto: ["Name", "e.g. Coinbase"],
  metals: ["Name", "e.g. Gold coins"],
  other: ["Name", "e.g. 2022 Honda CR-V"],
};

const VALUE_FIELDS = ["Current value", "Cost basis (optional)"];

/** The Name label, its placeholder and the class's own fields (HE-04). */
export function formFor(classId: AssetClassId) {
  const [nameLabel, placeholder] = NAME[classId];
  const fields =
    classId === "stocks"
      ? ["Positions"]
      : classId === "realestate"
        ? ["Property type", "City / location", ...VALUE_FIELDS]
        : classId === "metals"
          ? [...VALUE_FIELDS, "Quantity", "Unit"]
          : VALUE_FIELDS;
  return { nameLabel, placeholder, fields };
}

export function initialAdd(classId: AssetClassId): EntryForm {
  return {
    classId,
    country: "US",
    name: "",
    description: "",
    propertyType: "Residential",
    city: "",
    value: "",
    costBasis: "",
    quantity: "",
    unit: "g",
    positionCount: 0,
    pendingTicker: "",
  };
}

export function initialEdit(holding: HoldingData): EntryForm {
  const text = (n: number | null) => (n === null ? "" : String(n));
  return {
    ...initialAdd(holding.assetClass),
    country: holding.country,
    name: holding.name,
    description: holding.description ?? "",
    propertyType: holding.propertyType ?? "Residential",
    city: holding.city ?? "",
    value: String(holding.currentValue),
    costBasis: text(holding.costBasis),
    quantity: text(holding.quantity),
    unit: holding.unit === "oz t" ? "oz t" : "g",
    positionCount: holding.positions.length,
  };
}

/** Everything typed stays; only the class changes (HE-06). */
export const switchClass = (form: EntryForm, classId: AssetClassId): EntryForm => ({ ...form, classId });

/** The first failure in the mockup's order, or null (HE-08). */
export function validate(form: EntryForm): string | null {
  if (form.name.trim() === "") return "Give it a name";
  if (form.classId === "stocks") {
    if (form.positionCount === 0) return "Add at least one position";
    const pending = form.pendingTicker.trim();
    if (pending) return `Add ${pending} or clear it first`;
    return null;
  }
  if (parseAmount(form.value) === null) return "Enter the current value";
  return null;
}

export type EntryRequest = { method: "POST" | "PATCH"; url: string; body: Record<string, unknown> };

/** An add posts; an edit patches, resending class and Country unchanged. Blank optional fields are left out (HE-10). */
export function toRequest(form: EntryForm, holdingId?: string): EntryRequest {
  const body: Record<string, unknown> = { asset_class: form.classId, country: form.country, name: form.name.trim() };
  const description = form.description.trim();
  if (description) body.description = description;

  if (form.classId !== "stocks") {
    body.value = parseAmount(form.value);
    const cost = parseAmount(form.costBasis);
    if (cost !== null) body.cost_basis = cost;
  }
  if (form.classId === "realestate") {
    body.property_type = form.propertyType;
    const city = form.city.trim();
    if (city) body.city = city;
  }
  if (form.classId === "metals") {
    const quantity = parseAmount(form.quantity);
    if (quantity !== null) {
      body.quantity = quantity;
      body.unit = form.unit;
    }
  }
  return holdingId
    ? { method: "PATCH", url: `/api/holdings/${holdingId}`, body }
    : { method: "POST", url: "/api/holdings", body };
}

/** Checks, then sends. A failed check sends nothing and returns its message. */
export async function saveHolding(fetchFn: FetchFn, form: EntryForm, holdingId?: string): Promise<SaveResult> {
  const problem = validate(form);
  if (problem) return { ok: false, error: problem };
  const { method, url, body } = toRequest(form, holdingId);
  return send(fetchFn, method, url, body);
}

/** Where a save goes: an add opens the new Holding (HE-11); an edit closes in place. */
export function defaultAfterSave(mode: string, result: Record<string, unknown>): string | null {
  return mode === "add-asset" && typeof result.id === "string" ? `/holdings/${result.id}` : null;
}
