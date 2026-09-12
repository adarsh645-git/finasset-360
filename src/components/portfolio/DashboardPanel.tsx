import { HomeCurrencyPicker } from "@/components/HomeCurrencyPicker";
import { SignOutButton } from "@/components/SignOutButton";

// Shown in the rightmost column when nothing is selected (user story 98) —
// the ticket 01 dashboard content, now living inside the Miller shell
// instead of being the whole page.
export function DashboardPanel({
  userEmail,
  homeCurrency,
}: {
  userEmail: string;
  homeCurrency: string;
}) {
  return (
    <div className="flex flex-1 flex-col gap-8 overflow-y-auto px-8 py-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight">FinAsset 360</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{userEmail}</p>
      </header>

      <section className="flex flex-col gap-6 rounded-lg border border-hairline p-6">
        <div>
          <h2 className="text-lg font-medium">Your Portfolio</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Select an Asset Class on the left to browse your Holdings, or add one to get started.
          </p>
        </div>
        <HomeCurrencyPicker currentCurrency={homeCurrency} />
      </section>

      <SignOutButton />
    </div>
  );
}
