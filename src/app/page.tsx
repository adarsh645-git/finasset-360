import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignOutButton } from "@/components/SignOutButton";
import { HomeCurrencyPicker } from "@/components/HomeCurrencyPicker";

// The rightmost-column dashboard from docs/SPEC.md's UI structure will land
// in later tickets. This is the ticket 01 slice of it: proof that sign-in
// worked, the Portfolio exists, and its home currency is editable — no
// Holdings, no Net Worth headline yet.
export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: portfolio, error } = await supabase
    .from("portfolio")
    .select("user_id, home_currency")
    .single();

  if (error || !portfolio) {
    // The on_auth_user_created trigger should make this unreachable, but
    // failing loudly beats silently rendering a broken dashboard.
    throw new Error(`Could not load Portfolio: ${error?.message ?? "not found"}`);
  }

  return (
    <div className="flex flex-1 flex-col gap-8 px-6 py-12 sm:px-16">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">FinAsset 360</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{user.email}</p>
        </div>
        <SignOutButton />
      </header>

      <section className="flex flex-col gap-6 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
        <div>
          <h2 className="text-lg font-medium">Your Portfolio</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Nothing recorded yet — Holdings and Liabilities land in a later build step.
          </p>
        </div>
        <HomeCurrencyPicker currentCurrency={portfolio.home_currency} />
      </section>
    </div>
  );
}
