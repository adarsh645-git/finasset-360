import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PortfolioShell } from "@/components/portfolio/PortfolioShell";
import type {
  AssetClass,
  Holding,
  HoldingValuation,
  Liability,
  LiabilityClass,
  LiabilityValuation,
} from "@/components/portfolio/types";

// The Miller-column shell (ticket 03, extended by ticket 05 for the
// Liabilities branch): Portfolio is the breadcrumb root, Asset/Liability
// Classes and Holdings/Liabilities are fetched once here as Server
// Components data, and PortfolioShell owns which column is selected and
// renders the rightmost detail panel (or the dashboard, when nothing is
// selected — user story 98).
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
  ] = await Promise.all([
    supabase.from("portfolio").select("user_id, home_currency").single(),
    supabase
      .from("asset_class")
      .select("id, owner_id, name")
      .order("owner_id", { ascending: true, nullsFirst: true })
      .order("name", { ascending: true }),
    supabase
      .from("holding")
      .select("id, asset_class_id, name, currency, created_at")
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
    supabase
      .from("liability")
      .select("id, liability_class_id, name, currency, created_at")
      .order("created_at", { ascending: true }),
    // Newest-first, so latestValuationByLiability can pick the first row
    // seen per Liability as its latest without a separate per-Liability
    // query — mirrors the holding_valuation fetch above.
    supabase
      .from("liability_valuation")
      .select("id, liability_id, amount, fx_rate_to_home, home_currency_at_recording, recorded_at")
      .order("recorded_at", { ascending: false }),
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

  return (
    <PortfolioShell
      userEmail={user.email ?? ""}
      homeCurrency={portfolio.home_currency}
      currentUserId={user.id}
      assetClasses={assetClasses as AssetClass[]}
      holdings={holdings as Holding[]}
      valuations={valuations as HoldingValuation[]}
      liabilityClasses={liabilityClasses as LiabilityClass[]}
      liabilities={liabilities as Liability[]}
      liabilityValuations={liabilityValuations as LiabilityValuation[]}
    />
  );
}
