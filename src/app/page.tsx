import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PortfolioShell } from "@/components/portfolio/PortfolioShell";
import type { AssetClass, Holding } from "@/components/portfolio/types";

// The Miller-column shell (ticket 03): Portfolio is the breadcrumb root,
// Asset Classes and Holdings are fetched once here as Server Components
// data, and PortfolioShell owns which column is selected and renders the
// rightmost detail panel (or the dashboard, when nothing is selected —
// user story 98).
export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: portfolio, error: portfolioError }, { data: assetClasses, error: assetClassesError }, { data: holdings, error: holdingsError }] =
    await Promise.all([
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

  return (
    <PortfolioShell
      userEmail={user.email ?? ""}
      homeCurrency={portfolio.home_currency}
      currentUserId={user.id}
      assetClasses={assetClasses as AssetClass[]}
      holdings={holdings as Holding[]}
    />
  );
}
