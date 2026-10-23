import Link from "next/link";
import { Chart } from "@/components/chart/Chart";
import { ProjectionToggle } from "@/components/chart/ProjectionProvider";
import { AssumptionsCard } from "@/components/growth/AssumptionsCard";
import type { Growth } from "@/lib/views/growth";
import type { Assumptions } from "@/lib/views/projection-assumptions";

const CARD = "rounded-[14px] border border-line bg-panel shadow-[var(--shadow)]";
const TONE = { up: "text-pos", down: "text-neg" } as const;

function Segments({
  label,
  items,
}: {
  label: string;
  items: { label: string; href: string; selected: boolean }[];
}) {
  return (
    <nav aria-label={label} className="flex gap-0.5 rounded-[10px] bg-hover p-[3px]">
      {items.map((s) => (
        <Link
          key={s.label}
          href={s.href}
          replace
          scroll={false}
          aria-current={s.selected ? "true" : undefined}
          className={`flex h-10 items-center rounded-[7px] px-[11px] text-[12.5px] sm:h-9 ${
            s.selected ? "bg-panel text-ink shadow-sm" : "text-ink2"
          }`}
        >
          {s.label}
        </Link>
      ))}
    </nav>
  );
}

// Renders what buildGrowth returns.
export function GrowthPage({
  growth,
  assumptions,
}: {
  growth: Growth;
  assumptions?: Assumptions;
}) {
  const card = assumptions && <AssumptionsCard assumptions={assumptions} />;
  const { header, chart, empty, addHref, ranges, scopes } = growth;
  if (empty || !header || !chart) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-[22px] font-semibold tracking-[-0.02em]">Growth</h1>
        <section className={`${CARD} flex flex-col gap-2 p-5`}>
          <h2 className="text-[15px] font-semibold">Nothing to chart yet</h2>
          <p className="text-[13.5px] text-ink2">
            Your net worth history and projection appear here once you&apos;ve added something.
          </p>
          {addHref && (
            <Link
              href={addHref}
              className="mt-1 flex h-10 w-fit items-center rounded-lg bg-ink px-4 text-[13.5px] font-medium text-bg"
            >
              Add an account or asset
            </Link>
          )}
        </section>
        {card}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="mb-1 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2.5">
          <h1 className="font-mono text-[11px] font-medium uppercase leading-tight tracking-[0.06em] text-ink3">
            Growth
          </h1>
          <span
            data-tone={header.tone ?? undefined}
            className={`text-[clamp(40px,6vw,56px)] font-medium leading-none tracking-[-0.035em] tabular-nums ${
              header.tone ? TONE[header.tone] : "text-ink"
            }`}
          >
            {header.change}
          </span>
          <span className="text-[14px] text-ink3">{header.line}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segments label="Country scope" items={scopes} />
          <Segments label="Range" items={ranges} />
          <ProjectionToggle />
        </div>
      </div>
      <section className={`${CARD} px-5 pb-3 pt-5`}>
        <Chart
          series={chart.series}
          today={chart.today}
          height={chart.height}
          zero={chart.zero}
          legend={
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink2">
              {chart.legend.map((l) => (
                <li key={l.name} className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full" style={{ background: l.color }} />
                  {l.name}
                </li>
              ))}
            </ul>
          }
        />
      </section>
      {card}
    </div>
  );
}
