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
  // Resolved lazily from Finnhub the first time this Holding's symbol is
  // picked from the stock-picker (ticket 18) — display-only, `null` for a
  // manually-entered Holding.
  sector: string | null;
  archived_at: string | null;
  created_at: string;
};

/** The editable fields of a Holding — name, Asset Class, currency, and its
 * optional market symbol/quantity pair (user story 17; ticket 07), plus
 * Sector (ticket 18) — as one type, since HoldingDetailPanel's edit form,
 * PortfolioShell's save handler, and the PATCH body it sends all pass this
 * same set around together. */
export type HoldingPatch = Pick<
  Holding,
  "name" | "asset_class_id" | "currency" | "price_lookup_symbol" | "quantity" | "sector"
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

/** A Liability's optional Amortization Assumptions (ticket 11, user
 * stories 57–61) — any Liability opts in by filling these in, never keyed
 * to a Liability Class. `extra_monthly_payment`/`escrow_portion` default to
 * 0 at the schema layer (mirroring `contribution_escalation_rate`) so they
 * are always present; the rest stay `null` until entered.
 * `linked_holding_id` pairs this Liability with the Holding it financed
 * (user story 64) and is otherwise unrelated to the payoff math. */
export type AmortizationAssumptions = {
  interest_rate: number | null;
  original_loan_amount: number | null;
  term_months: number | null;
  custom_monthly_payment: number | null;
  extra_monthly_payment: number;
  escrow_portion: number;
  /** Display-only, read by no formula (docs/SPEC.md). */
  start_date: string | null;
  linked_holding_id: string | null;
};

export type Liability = {
  id: string;
  liability_class_id: string;
  name: string;
  currency: string;
  archived_at: string | null;
  created_at: string;
} & AmortizationAssumptions;

/** The editable fields of a Liability — name, Liability Class, currency,
 * and its optional Amortization Assumptions — mirrors HoldingPatch. Every
 * Amortization field is independently optional on a PATCH (the route
 * leaves an omitted one as-is); `Partial` lets a caller send any subset. */
export type LiabilityPatch = Pick<Liability, "name" | "liability_class_id" | "currency"> &
  Partial<AmortizationAssumptions>;

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

/** The Projection assumption set (user stories 67, 68, 70, 72, 80) — one
 * active set per Portfolio, not multiple named scenarios. Rates are decimal
 * fractions (0.07, not 7). */
export type ProjectionAssumptions = {
  growth_rate: number;
  monthly_contribution: number;
  contribution_escalation_rate: number;
  horizon_years: number;
  /** Applied once, at display time, to derive the real line from the
   * nominal one (docs/SPEC.md, ticket 12) — every stored and entered rate,
   * this one included, stays nominal; only the projection engine's output
   * gets deflated. Defaults to 0.03 (user story 81). */
  inflation_rate: number;
  /** The Target Net Worth (ticket 13, user stories 85-90) — an amount and a
   * date, always set or cleared together (`null` alongside `target_date`):
   * a Projection without a Target is valid. Stated in today's purchasing
   * power, so it's compared against `realNetWorth`, never `netWorth`. */
  target_amount: number | null;
  target_date: string | null;
};
