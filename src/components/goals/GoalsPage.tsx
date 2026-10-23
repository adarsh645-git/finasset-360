import type { GoalsPage as GoalsPageView } from "@/lib/views/goals";

const CARD = "rounded-[14px] border border-line bg-panel shadow-[var(--shadow)]";

// Renders what buildGoalsPage returns. The add form (ticket 2) goes in the
// "goal-form" slot, after the cards or the empty state.
export function GoalsPage({ page }: { page: GoalsPageView }) {
  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[22px] font-medium tracking-[-0.02em]">{page.heading}</h1>
        <p className="text-[13px] text-ink2">{page.subtitle}</p>
      </div>
      {page.empty ? (
        <p data-empty="goals" className="py-6 text-[14px] text-ink2">
          No goals yet
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {page.rows.map((row) => (
            <li key={row.id} data-goal={row.id} className={`${CARD} flex flex-col gap-2.5 p-4`}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span data-field="name" className="text-[15px] font-medium">
                  {row.name}
                </span>
                <span
                  data-field="status"
                  data-colour={row.status.colour}
                  className={`text-[13px] ${row.status.colour === "positive" ? "text-pos" : "text-ink2"}`}
                >
                  {row.status.label}
                </span>
              </div>
              <span data-field="progress" className="text-[13px] tabular-nums text-ink2">
                {row.progressText}
              </span>
              <div className="h-1.5 overflow-hidden rounded-full bg-hover">
                <div
                  data-field="bar"
                  data-percent={row.barPercent}
                  data-colour={row.barColour}
                  className={`h-full rounded-full ${row.barColour === "positive" ? "bg-pos" : "bg-ink"}`}
                  style={{ width: `${row.barPercent}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      <div data-slot="goal-form" />
    </div>
  );
}
