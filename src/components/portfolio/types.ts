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

/** A User's goal percent for one Asset Class (user stories 52–54, 112–113).
 * Asset Class only — there is no Liability Class equivalent. */
export type TargetAllocation = {
  asset_class_id: string;
  target_percent: number;
};

/** The Projection assumption set (user stories 67, 68, 70, 72) — one active
 * set per Portfolio, not multiple named scenarios. Rates are decimal
 * fractions (0.07, not 7), matching `inflation_rate`'s documented default in
 * docs/SPEC.md. `target_amount`/`target_date` (ticket 13) and
 * `inflation_rate` (ticket 12) aren't part of this ticket's shape. */
export type ProjectionAssumptions = {
  growth_rate: number;
  monthly_contribution: number;
  contribution_escalation_rate: number;
  horizon_years: number;
};
