// Validation for the fields of a manually valued Holding (every Asset Class
// but Stocks), shared by create and edit (design.md D3). Class-specific
// fields are rejected on any other class rather than ignored, so a client
// bug surfaces.

export const MANUAL_ASSET_CLASSES = ["realestate", "cash", "crypto", "metals", "other"] as const;
export type ManualAssetClass = (typeof MANUAL_ASSET_CLASSES)[number];

const PROPERTY_TYPES: readonly string[] = ["Residential", "Land", "REIT / fund", "Commercial"];
const METAL_UNITS: readonly string[] = ["g", "oz t"];

export type ManualHoldingInput = {
  assetClass: ManualAssetClass;
  country: string;
  name: string;
  description: string | null;
  value: number;
  costBasis: number | null;
  propertyType: string | null;
  city: string | null;
  quantity: number | null;
  unit: string | null;
};

type Parsed = { ok: true; input: ManualHoldingInput } | { ok: false; error: string };

const absent = (value: unknown) => value === undefined || value === null;

function trimmedOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

/** `undefined` when the field is absent, `null` when present but not a finite number. */
function optionalNumber(value: unknown): number | null | undefined {
  if (absent(value)) return undefined;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** An Update value amount, or `null` when it is not a number of 0 or more. */
export function parseValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

export function parseManualHolding(body: Record<string, unknown>, knownCountries: readonly string[]): Parsed {
  const fail = (error: string): Parsed => ({ ok: false, error });

  const assetClass = body.asset_class;
  if (typeof assetClass !== "string" || !(MANUAL_ASSET_CLASSES as readonly string[]).includes(assetClass)) {
    return fail("Asset class must be one of real estate, cash, crypto, metals or other.");
  }
  const country = body.country;
  if (typeof country !== "string" || !knownCountries.includes(country)) {
    return fail("Country must be a known country.");
  }
  const name = trimmedOrNull(body.name);
  if (!name) return fail("Name is required.");

  if (absent(body.value)) return fail("Value is required.");
  const value = parseValue(body.value);
  if (value === null) return fail("Value must be a number of 0 or more.");

  const costBasis = optionalNumber(body.cost_basis);
  if (costBasis === null || (costBasis !== undefined && costBasis < 0)) {
    return fail("Cost basis must be a number of 0 or more.");
  }

  const isRealEstate = assetClass === "realestate";
  const isMetals = assetClass === "metals";

  if (!isRealEstate && (!absent(body.property_type) || !absent(body.city))) {
    return fail("Property type and city belong only to real estate.");
  }
  if (!isMetals && (!absent(body.quantity) || !absent(body.unit))) {
    return fail("Quantity and unit belong only to metals.");
  }

  let propertyType: string | null = null;
  if (isRealEstate) {
    propertyType = absent(body.property_type) ? "Residential" : String(body.property_type);
    if (!PROPERTY_TYPES.includes(propertyType)) {
      return fail("Property type must be Residential, Land, REIT / fund or Commercial.");
    }
  }

  let quantity: number | null = null;
  let unit: string | null = null;
  if (isMetals) {
    const parsedQuantity = optionalNumber(body.quantity);
    if (parsedQuantity === null || (parsedQuantity !== undefined && parsedQuantity <= 0)) {
      return fail("Quantity must be a number above 0.");
    }
    if (parsedQuantity === undefined && !absent(body.unit)) return fail("A unit needs a quantity.");
    if (parsedQuantity !== undefined) {
      unit = absent(body.unit) ? "g" : String(body.unit);
      if (!METAL_UNITS.includes(unit)) return fail("Unit must be g or oz t.");
      quantity = parsedQuantity;
    }
  }

  return {
    ok: true,
    input: {
      assetClass: assetClass as ManualAssetClass,
      country,
      name,
      description: trimmedOrNull(body.description),
      value,
      costBasis: costBasis ?? null,
      propertyType,
      city: isRealEstate ? trimmedOrNull(body.city) : null,
      quantity,
      unit,
    },
  };
}
