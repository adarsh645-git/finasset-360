import Link from "next/link";
import { Chart } from "@/components/chart/Chart";
import { ProjectionToggle } from "@/components/chart/ProjectionProvider";
import { PositionsCard } from "@/components/assets/PositionsCard";
import { RowLink } from "@/components/overview/RowLink";
import { RealEstateCards } from "@/components/assets/RealEstateCards";
import type { AssetClassView } from "@/lib/views/asset-class";

const CARD = "rounded-[14px] border border-line bg-panel shadow-[var(--shadow)]";
const BUTTON =
  "flex h-10 items-center rounded-lg border border-line px-3.5 text-[13.5px] font-medium hover:bg-hover";
const HEAD = "font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-ink3";
const COLS = "grid-cols-[1fr_auto] sm:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto]";

// Renders what buildAssetClassView returns; class-specific cards (Positions, distributions) come in later tickets.
export function AssetClassPage({ view }: { view: AssetClassView }) {
  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-[13px] text-ink3">
        {view.breadcrumb.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden="true">/</span>}
            {crumb.href ? (
              <Link href={crumb.href} className="hover:text-ink">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-ink2">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2.5">
          <h1 className={`${HEAD} flex items-center gap-2`}>
            <span
              aria-hidden
              className="size-2.5 flex-none rounded-full"
              style={{ background: `var(${view.dot})` }}
            />
            {view.name}
          </h1>
          <span className="text-[clamp(36px,6vw,48px)] font-medium leading-none tracking-[-0.035em] tabular-nums">
            {view.total}
          </span>
          <span className="text-[13.5px] text-ink2">{view.line}</span>
        </div>
        {view.add.href && (
          <Link href={view.add.href} className={BUTTON}>
            {view.add.label}
          </Link>
        )}
      </header>

      {view.empty ? (
        <section className={`${CARD} flex flex-col gap-2 p-5`}>
          <h2 className="text-[15px] font-semibold">{view.empty.message}</h2>
          {view.empty.addHref && (
            <Link href={view.empty.addHref} className={`${BUTTON} self-start`}>
              + Add
            </Link>
          )}
        </section>
      ) : (
        <>
          {view.chart && (
            <section className={`${CARD} px-5 pb-3 pt-5`} aria-labelledby="class-chart">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <h2 id="class-chart" className="text-[15px] font-semibold">
                  {view.name} over time
                </h2>
                <ProjectionToggle />
              </div>
              <Chart series={view.chart.series} today={view.chart.today} height={view.chart.height} />
            </section>
          )}
          {view.positions && <PositionsCard card={view.positions} />}
          {view.realEstate && <RealEstateCards cards={view.realEstate} />}
          <section className={`${CARD} flex flex-col p-2`} aria-labelledby="class-holdings">
            <h2 id="class-holdings" className="sr-only">
              Holdings
            </h2>
            <div className={`${HEAD} grid ${COLS} gap-x-4 px-3 py-2`}>
              <span>Holding</span>
              <span className="hidden w-8 sm:block">Where</span>
              <span className="hidden w-28 text-right sm:block">Native</span>
              <span className="w-24 text-right">USD</span>
              <span className="hidden w-28 text-right sm:block">Gain</span>
            </div>
            {view.rows.map((row) => (
              <RowLink
                key={row.id}
                href={row.href}
                className={`grid ${COLS} items-center gap-x-4 rounded-lg px-3 py-2.5 text-[13.5px]`}
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{row.name}</span>
                  {row.subtitle && (
                    <span className="hidden truncate text-[12px] text-ink3 sm:block">{row.subtitle}</span>
                  )}
                </span>
                <span className="hidden w-8 rounded-md border border-line px-1.5 py-0.5 text-center text-[11px] text-ink2 sm:block">
                  {row.badge}
                </span>
                <span className="hidden w-28 text-right text-ink2 tabular-nums sm:block">{row.native}</span>
                <span className="w-24 text-right tabular-nums">{row.usd}</span>
                <span className="hidden w-28 text-right text-ink2 tabular-nums sm:block">{row.gain}</span>
              </RowLink>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
