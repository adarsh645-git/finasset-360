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
  archived_at: string | null;
  created_at: string;
};

/** The editable fields of a Holding — name, Asset Class, and currency
 * (user story 17) — as one type, since HoldingDetailPanel's edit form,
 * PortfolioShell's save handler, and the PATCH body it sends all pass this
 * same trio around together. */
export type HoldingPatch = Pick<Holding, "name" | "asset_class_id" | "currency">;

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
