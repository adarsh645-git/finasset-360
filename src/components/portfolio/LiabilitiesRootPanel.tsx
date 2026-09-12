import { formatMoney } from "@/lib/currency/format";

// The rightmost detail panel for the "Liabilities" top-level branch itself
// (user story 56), when no Liability Class within it is selected yet —
// the Liabilities-side analog of what the dashboard shows for the whole
// Portfolio, scoped down to this one branch.
export function LiabilitiesRootPanel({
  homeCurrency,
  liabilitiesTotal,
  liabilityClassCount,
  liabilityCount,
}: {
  homeCurrency: string;
  liabilitiesTotal: number;
  liabilityClassCount: number;
  liabilityCount: number;
}) {
  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-8 py-8">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">Liabilities</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {liabilityClassCount} Liability Class{liabilityClassCount === 1 ? "" : "es"} ·{" "}
          {liabilityCount} Liabilit{liabilityCount === 1 ? "y" : "ies"}
        </p>
      </header>

      <p className="text-2xl font-semibold tracking-tight">
        {formatMoney(liabilitiesTotal, homeCurrency)}
      </p>
    </div>
  );
}
