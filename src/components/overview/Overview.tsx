import Link from "next/link";
import { Chart } from "@/components/chart/Chart";
import { ProjectionToggle } from "@/components/chart/ProjectionProvider";
import type { Overview as OverviewView } from "@/lib/views/overview";

const MONO_LABEL = "font-mono text-[11px] font-medium uppercase leading-tight tracking-[0.06em] text-ink3";
const CARD = "rounded-[14px] border border-line bg-panel shadow-[var(--shadow)]";

// Renders what buildOverview returns; the later cards join below the chart.
export function Overview({ overview }: { overview: OverviewView }) {
  const { header, ranges, chart, firstRun } = overview;
  return (
    <div className="flex flex-col gap-4">
      <div className="mb-1 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2.5">
          <span className={MONO_LABEL}>{header.label}</span>
          <span className="text-[clamp(40px,6vw,56px)] font-medium leading-none tracking-[-0.035em] tabular-nums">
            {header.total}
          </span>
          {header.change !== null && (
            <div className="flex flex-wrap items-baseline gap-2 text-[14px]">
              <span
                data-tone={header.tone ?? undefined}
                className={`font-medium tabular-nums ${
                  header.tone === "up" ? "text-pos" : header.tone === "down" ? "text-neg" : "text-ink2"
                }`}
              >
                {header.change}
              </span>
              {header.since && <span className="text-ink3">{header.since}</span>}
            </div>
          )}
        </div>
        {!firstRun && (
          <div className="flex flex-wrap items-center gap-2">
            <nav aria-label="Range" className="flex gap-0.5 rounded-[10px] bg-hover p-[3px]">
              {ranges.map((r) => (
                <Link
                  key={r.label}
                  href={r.href}
                  replace
                  scroll={false}
                  aria-current={r.selected ? "true" : undefined}
                  className={`flex h-9 items-center rounded-[7px] px-[11px] text-[12.5px] ${
                    r.selected ? "bg-panel text-ink shadow-sm" : "text-ink2"
                  }`}
                >
                  {r.label}
                </Link>
              ))}
            </nav>
            <ProjectionToggle />
          </div>
        )}
      </div>
      {firstRun ? (
        <section className={`${CARD} flex flex-col gap-2 p-5`}>
          <h2 className="text-[15px] font-semibold">Add your first account or asset</h2>
          <p className="text-[13.5px] text-ink2">
            Your net worth, allocation and projection appear here once you&apos;ve added something.
          </p>
        </section>
      ) : (
        chart && (
          <section className={`${CARD} px-5 pb-3 pt-5`}>
            <Chart series={chart.series} today={chart.today} height={chart.height} goals={chart.goals} />
          </section>
        )
      )}
    </div>
  );
}
