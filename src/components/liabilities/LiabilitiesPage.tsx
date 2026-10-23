import Link from "next/link";
import { Chart } from "@/components/chart/Chart";
import { ProjectionToggle } from "@/components/chart/ProjectionProvider";
import { RowLink } from "@/components/overview/RowLink";
import type { LiabilitiesView } from "@/lib/views/liabilities";

const CARD = "rounded-[14px] border border-line bg-panel shadow-[var(--shadow)]";
const BUTTON =
  "flex h-10 items-center rounded-lg border border-line px-3.5 text-[13.5px] font-medium hover:bg-hover";

// The Liabilities page: header, four stats, the payoff timeline, one row per loan.
export function LiabilitiesPage({ view }: { view: LiabilitiesView }) {
  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2.5">
          <h1 className="font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-ink3">
            Liabilities
          </h1>
          <span className="text-[clamp(36px,6vw,48px)] font-medium leading-none tracking-[-0.035em] tabular-nums">
            {view.header.total}
          </span>
          <span className="text-[13.5px] text-ink2">{view.header.paidDown}</span>
        </div>
        {view.addHref && (
          <Link href={view.addHref} className={BUTTON}>
            + Add loan
          </Link>
        )}
      </header>

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(180px,1fr))]">
        {view.stats.map((stat) => (
          <div key={stat.label} className={`${CARD} flex flex-col gap-1.5 p-4`}>
            <span className="label-mono">{stat.label}</span>
            <span className="text-[22px] font-medium leading-none tabular-nums">{stat.value}</span>
            <span className="text-[12px] text-ink2">{stat.sub}</span>
          </div>
        ))}
      </div>

      {view.timeline && (
        <section className={`${CARD} px-5 pb-3 pt-5`} aria-label="Payoff timeline">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-[15px] font-semibold">Payoff timeline</h2>
            <ProjectionToggle />
          </div>
          <Chart
            series={view.timeline.series}
            today={view.timeline.today}
            height={view.timeline.height}
            zero={view.timeline.zero}
            legend={
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink2">
                {view.timeline.legend.map((l) => (
                  <li key={l.name} className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full" style={{ background: l.color }} />
                    {l.name}
                  </li>
                ))}
              </ul>
            }
          />
        </section>
      )}

      {view.empty ? (
        <section className={`${CARD} flex flex-col gap-2 p-5`}>
          <h2 className="text-[15px] font-semibold">{view.empty.message}</h2>
          {view.empty.addHref && (
            <Link
              href={view.empty.addHref}
              className="mt-1 flex h-10 w-fit items-center rounded-lg bg-ink px-4 text-[13.5px] font-medium text-bg"
            >
              Add loan
            </Link>
          )}
        </section>
      ) : (
        <section className={`${CARD} flex flex-col p-2`}>
          {view.rows.map((row) => (
            <RowLink
              key={row.id}
              href={row.href}
              className="flex flex-col gap-2 rounded-lg px-3 py-3 text-[13.5px]"
            >
              <span className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className="size-2.5 flex-none rounded-full"
                  style={{ background: `var(${row.colorVar})` }}
                />
                <span className="min-w-0 flex-1 truncate font-medium">{row.name}</span>
                <span className="hidden rounded-md border border-line px-1.5 py-0.5 text-[11px] text-ink2 sm:block">
                  {row.badge}
                </span>
                {row.native && (
                  <span className="hidden text-ink2 tabular-nums sm:block">{row.native}</span>
                )}
                <span className="text-right font-medium tabular-nums">{row.usd}</span>
              </span>
              <span aria-hidden className="h-1.5 overflow-hidden rounded-full bg-sel">
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${Math.round(row.paidFraction * 100)}%`,
                    background: `var(${row.colorVar})`,
                  }}
                />
              </span>
              <span className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 text-[12px] text-ink2">
                <span>
                  {row.meta}
                  {row.cue && <span className="text-ink3"> {row.cue}</span>}
                </span>
                <span>{row.secondary}</span>
              </span>
            </RowLink>
          ))}
        </section>
      )}
    </div>
  );
}
