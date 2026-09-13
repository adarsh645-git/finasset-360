// The one column list the Projection route and the dashboard's Server
// Component fetch both select — mirrors src/lib/holdings/columns.ts. Kept in
// one place after `inflation_rate` (ticket 12) shipped in the route but was
// never added to the dashboard's own select, silently leaving it
// `undefined` on the page that actually renders the form.
export const PROJECTION_COLUMNS =
  "growth_rate, monthly_contribution, contribution_escalation_rate, horizon_years, inflation_rate, target_amount, target_date";
