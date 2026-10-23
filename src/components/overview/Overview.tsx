import Link from "next/link";
import { Chart } from "@/components/chart/Chart";
import { ProjectionToggle } from "@/components/chart/ProjectionProvider";
import { RowLink } from "@/components/overview/RowLink";
import type { Overview as OverviewView } from "@/lib/views/overview";

const MONO_LABEL = "font-mono text-[11px] font-medium uppercase leading-tight tracking-[0.06em] text-ink3";
const CARD = "rounded-[14px] border border-line bg-panel shadow-[var(--shadow)]";

// Renders what buildOverview returns; the later cards join below the chart.
export function Overview({ overview }: { overview: OverviewView }) {
  const { header, ranges, chart, firstRun, addHref, stats, allocation, countries, currencyEffect } = overview;
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
          {addHref && (
            <Link
              href={addHref}
              className="mt-1 flex h-10 w-fit items-center rounded-lg bg-ink px-4 text-[13.5px] font-medium text-bg"
            >
              Add
            </Link>
          )}
        </section>
      ) : (
        chart && (
          <section className={`${CARD} px-5 pb-3 pt-5`}>
            <Chart series={chart.series} today={chart.today} height={chart.height} goals={chart.goals} />
          </section>
        )
      )}
      {stats && (
        <div className="grid gap-4 md:grid-cols-3">
          {[stats.assets, stats.liabilities, stats.equity].map((card) => (
            <RowLink key={card.label} href={card.href} className={`${CARD} flex flex-col gap-2 p-5`}>
              <span className={MONO_LABEL}>{card.label}</span>
              <span className="text-[26px] font-medium leading-none tracking-[-0.02em] tabular-nums">
                {card.value}
              </span>
              <span className="text-[12.5px] text-ink2">{card.detail}</span>
            </RowLink>
          ))}
        </div>
      )}
      {allocation && (
        <section className={`${CARD} flex flex-col gap-4 p-5`}>
          <h2 className="text-[15px] font-semibold">Allocation</h2>
          <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-hover" aria-hidden="true">
            {allocation.rows.map((r) => (
              <span key={r.id} style={{ width: `${r.pct}%`, background: `var(${r.dot})` }} />
            ))}
          </div>
          <div className="flex flex-col">
            {allocation.rows.map((r) => (
              <RowLink
                key={r.id}
                href={r.href}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 rounded-lg px-2 py-2.5 text-[13.5px] sm:grid-cols-[1fr_auto_auto_auto_auto]"
              >
                <span className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ background: `var(${r.dot})` }} />
                  {r.name}
                </span>
                <span className="text-ink3 tabular-nums">{r.count}</span>
                <span className="text-right tabular-nums">{r.value}</span>
                <span className="hidden text-right text-ink2 tabular-nums sm:block">{r.share}</span>
                <span className="hidden text-right text-ink2 tabular-nums sm:block">{r.change}</span>
              </RowLink>
            ))}
          </div>
        </section>
      )}
      {countries.length > 0 && (
        <section className={`${CARD} flex flex-col gap-4 p-5`}>
          <h2 className="text-[15px] font-semibold">Where it&apos;s held</h2>
          {countries.map((c) => (
            <div key={c.code} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3 text-[13.5px]">
                <span className="font-medium">{c.name}</span>
                <span className="tabular-nums">{c.net}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-hover" aria-hidden="true">
                <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: `var(${c.dot})` }} />
              </div>
              <div className="flex justify-between gap-3 text-[12px] text-ink3">
                <span>{c.detail}</span>
                <span>{c.share}</span>
              </div>
            </div>
          ))}
          {currencyEffect && (
            <div className="flex flex-col gap-1 border-t border-line pt-3">
              <div className="flex items-baseline justify-between gap-3 text-[13.5px]">
                <span>Currency effect, 12 mo</span>
                <span
                  data-tone={currencyEffect.tone ?? undefined}
                  className={`font-medium tabular-nums ${
                    currencyEffect.tone === "up"
                      ? "text-pos"
                      : currencyEffect.tone === "down"
                        ? "text-neg"
                        : "text-ink2"
                  }`}
                >
                  {currencyEffect.amount}
                </span>
              </div>
              <p className="text-[12px] text-ink3">{currencyEffect.note}</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
