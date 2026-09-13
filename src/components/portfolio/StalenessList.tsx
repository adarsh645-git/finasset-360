import { daysAgoLabel } from "@/lib/valuations/staleness";

export type StaleItem = {
  id: string;
  name: string;
  recordedAt: string;
  onSelect: () => void;
};

// Dashboard staleness list (user story 31): everything older than 30 days,
// so the User knows what to update without hunting through the tree —
// clicking a row navigates straight to that Holding or Liability.
export function StalenessList({ items }: { items: StaleItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Nothing is stale.</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-hairline">
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            onClick={item.onSelect}
            className="flex min-h-11 w-full items-center justify-between gap-2 py-2 text-left text-sm hover:opacity-70"
          >
            <span className="truncate">{item.name}</span>
            <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
              {daysAgoLabel(item.recordedAt)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
