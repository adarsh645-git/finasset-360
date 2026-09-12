import { formatMoney } from "@/lib/currency/format";
import { daysAgoLabel, isStale } from "@/lib/valuations/staleness";
import { Sparkline } from "./Sparkline";

type HistoryRow = { amount: number; recorded_at: string };

// A Holding's or Liability's full Valuation History as a table with a
// sparkline (user story 27), each row dimmed once its Valuation is stale
// and labelled with how many days old it is (user stories 29-30).
export function ValuationHistoryTable({
  currency,
  history,
}: {
  currency: string;
  history: HistoryRow[];
}) {
  if (history.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">No Valuations recorded yet.</p>;
  }

  // Newest first for the table, oldest first for the sparkline (a trend
  // line reads left-to-right as time moving forward).
  const newestFirst = [...history].sort((a, b) => (a.recorded_at < b.recorded_at ? 1 : -1));
  const oldestFirst = [...newestFirst].reverse();

  return (
    <div className="flex flex-col gap-3">
      <div className="text-zinc-500 dark:text-zinc-400">
        <Sparkline values={oldestFirst.map((row) => row.amount)} />
      </div>

      <table className="w-full text-sm">
        <caption className="sr-only">Valuation History</caption>
        <tbody>
          {newestFirst.map((row) => {
            const stale = isStale(row.recorded_at);
            return (
              <tr
                key={row.recorded_at}
                className={stale ? "text-zinc-400 dark:text-zinc-600" : undefined}
              >
                <td className="py-1 pr-3">{row.recorded_at}</td>
                <td className="py-1 pr-3 tabular-nums">{formatMoney(row.amount, currency)}</td>
                <td className="py-1 text-xs">{daysAgoLabel(row.recorded_at)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
