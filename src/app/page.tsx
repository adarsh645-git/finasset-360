import { redirect } from "next/navigation";
import { firstNameOrEmail } from "@/lib/auth/display-name";
import { HOLDING_COLUMNS } from "@/lib/holdings/columns";
import { LIABILITY_COLUMNS } from "@/lib/liabilities/columns";
import type { PriceCacheRow } from "@/lib/market-data/live-estimate";
import { PROJECTION_COLUMNS } from "@/lib/projection/columns";
import { createClient } from "@/lib/supabase/server";
import { PortfolioShell } from "@/components/portfolio/PortfolioShell";
import type {
  AssetClass,
  Holding,
  HoldingValuation,
  Liability,
  LiabilityClass,
  LiabilityValuation,
  ProjectionAssumptions,
  TargetAllocation,
} from "@/components/portfolio/types";

// The Miller-column shell (ticket 03, extended by ticket 05 for the
// Liabilities branch and ticket 09 for the Plan sibling root): Portfolio
// and Plan are the two breadcrumb roots, Asset/Liability Classes,
// Holdings/Liabilities, and Target Allocation are fetched once here as
// Server Components data, and PortfolioShell owns which root and column is
// selected and renders the rightmost detail panel (or the dashboard, when
// nothing is selected — user story 98).
export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [
    { data: portfolio, error: portfolioError },
    { data: assetClasses, error: assetClassesError },
    { data: holdings, error: holdingsError },
    { data: valuations, error: valuationsError },
    { data: liabilityClasses, error: liabilityClassesError },
    { data: liabilities, error: liabilitiesError },
    { data: liabilityValuations, error: liabilityValuationsError },
    { data: targetAllocations, error: targetAllocationsError },
    { data: priceCache, error: priceCacheError },
    { data: projection, error: projectionError },
  ] = await Promise.all([
    supabase.from("portfolio").select("user_id, home_currency").single(),
    supabase
      .from("asset_class")
      .select("id, owner_id, name")
      .order("owner_id", { ascending: true, nullsFirst: true })
      .order("name", { ascending: true }),
    // Unfiltered by `archived_at` — PortfolioShell needs both the active
    // set (for the tree and current Net Worth) and the archived rows (so
    // the recorded Net Worth timeline still reflects the period each was
    // owned, per ticket 06).
    supabase
      .from("holding")
      .select(HOLDING_COLUMNS)
      .order("created_at", { ascending: true }),
    // Newest-first, so latestValuationByHolding can pick the first row seen
    // per Holding as its latest without a separate per-Holding query.
    supabase
      .from("holding_valuation")
      .select("id, holding_id, amount, fx_rate_to_home, home_currency_at_recording, recorded_at")
      .order("recorded_at", { ascending: false }),
    supabase
      .from("liability_class")
      .select("id, owner_id, name")
      .order("owner_id", { ascending: true, nullsFirst: true })
      .order("name", { ascending: true }),
    // Unfiltered by `archived_at` — mirrors the `holding` query above.
    supabase
      .from("liability")
      .select(LIABILITY_COLUMNS)
      .order("created_at", { ascending: true }),
    // Newest-first, so latestValuationByLiability can pick the first row
    // seen per Liability as its latest without a separate per-Liability
    // query — mirrors the holding_valuation fetch above.
    supabase
      .from("liability_valuation")
      .select("id, liability_id, amount, fx_rate_to_home, home_currency_at_recording, recorded_at")
      .order("recorded_at", { ascending: false }),
    supabase.from("target_allocation").select("asset_class_id, target_percent"),
    // The whole cache, not filtered to this User's own symbols — it's the
    // one non-tenant-scoped table (docs/SPEC.md), small, and RLS already
    // allows any authenticated User to read all of it.
    supabase
      .from("price_cache")
      .select("symbol, price, price_currency, source, last_error, fetched_at"),
    // `null` for a User who has never saved the Plan page's Projection
    // form — there is no auto-created default row, unlike `portfolio`.
    supabase.from("projection").select(PROJECTION_COLUMNS).maybeSingle(),
  ]);

  if (portfolioError || !portfolio) {
    // The on_auth_user_created trigger should make this unreachable, but
    // failing loudly beats silently rendering a broken dashboard.
    throw new Error(`Could not load Portfolio: ${portfolioError?.message ?? "not found"}`);
  }
  if (assetClassesError) {
    throw new Error(`Could not load Asset Classes: ${assetClassesError.message}`);
  }
  if (holdingsError) {
    throw new Error(`Could not load Holdings: ${holdingsError.message}`);
  }
  if (valuationsError) {
    throw new Error(`Could not load Valuations: ${valuationsError.message}`);
  }
  if (liabilityClassesError) {
    throw new Error(`Could not load Liability Classes: ${liabilityClassesError.message}`);
  }
  if (liabilitiesError) {
    throw new Error(`Could not load Liabilities: ${liabilitiesError.message}`);
  }
  if (liabilityValuationsError) {
    throw new Error(`Could not load Liability Valuations: ${liabilityValuationsError.message}`);
  }
  if (targetAllocationsError) {
    throw new Error(`Could not load Target Allocation: ${targetAllocationsError.message}`);
  }
  if (priceCacheError) {
    throw new Error(`Could not load the price cache: ${priceCacheError.message}`);
  }
  if (projectionError) {
    throw new Error(`Could not load the Projection: ${projectionError.message}`);
  }

  return (
    <PortfolioShell
      userName={firstNameOrEmail(user)}
      homeCurrency={portfolio.home_currency}
      currentUserId={user.id}
      assetClasses={assetClasses as AssetClass[]}
      holdings={holdings as Holding[]}
      valuations={valuations as HoldingValuation[]}
      liabilityClasses={liabilityClasses as LiabilityClass[]}
      liabilities={liabilities as Liability[]}
      liabilityValuations={liabilityValuations as LiabilityValuation[]}
      targetAllocations={targetAllocations as TargetAllocation[]}
      priceCache={priceCache as PriceCacheRow[]}
      projectionAssumptions={projection as ProjectionAssumptions | null}
    />
  );
}
