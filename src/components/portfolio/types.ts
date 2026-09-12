export type AssetClass = {
  id: string;
  owner_id: string | null;
  name: string;
};

export type Holding = {
  id: string;
  asset_class_id: string;
  name: string;
  currency: string;
  // Populated together, or both null (ticket 07 — enforced by
  // src/lib/holdings/price-lookup.ts, not a DB constraint): a Holding with
  // a symbol gets a Live Estimate (quantity × the latest price_cache row
  // for that symbol); one without (e.g. a house) has neither.
  price_lookup_symbol: string | null;
  quantity: number | null;
  archived_at: string | null;
  created_at: string;
};

/** The editable fields of a Holding — name, Asset Class, currency, and its
 * optional market symbol/quantity pair (user story 17; ticket 07) — as one
 * type, since HoldingDetailPanel's edit form, PortfolioShell's save
 * handler, and the PATCH body it sends all pass this same set around
 * together. */
export type HoldingPatch = Pick<
  Holding,
  "name" | "asset_class_id" | "currency" | "price_lookup_symbol" | "quantity"
>;

export type HoldingValuation = {
  id: string;
  holding_id: string;
  amount: number;
  fx_rate_to_home: number;
  home_currency_at_recording: string;
  recorded_at: string;
};

export type LiabilityClass = {
  id: string;
  owner_id: string | null;
  name: string;
};

export type Liability = {
  id: string;
  liability_class_id: string;
  name: string;
  currency: string;
  archived_at: string | null;
  created_at: string;
};

/** The editable fields of a Liability — name, Liability Class, and currency
 * — mirrors HoldingPatch. */
export type LiabilityPatch = Pick<Liability, "name" | "liability_class_id" | "currency">;

export type LiabilityValuation = {
  id: string;
  liability_id: string;
  amount: number;
  fx_rate_to_home: number;
  home_currency_at_recording: string;
  recorded_at: string;
};
