import Link from "next/link";
import { MONO_LABEL } from "@/components/holding/style";
import { ConfirmDeleteButton } from "@/components/holding/ConfirmDeleteButton";
import { StocksSections } from "@/components/holding/StocksSections";
import { Chart } from "@/components/chart/Chart";
import { ProjectionToggle } from "@/components/chart/ProjectionProvider";
import type { HoldingDetail as HoldingDetailView } from "@/lib/views/holding-detail";

const CARD = "rounded-[14px] border border-line bg-panel shadow-[var(--shadow)]";
const BUTTON = "flex h-10 items-center rounded-lg border border-line px-3.5 text-[13.5px] font-medium hover:bg-hover";

// Renders what buildHoldingDetail returns; later tickets add the Positions, chart and Value log below the stats.
export function HoldingDetail({ detail }: { detail: HoldingDetailView }) {
  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-[13px] text-ink3">
        {detail.breadcrumb.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden="true">/</span>}
            {crumb.href ? (
              <Link href={crumb.href} className="hover:text-ink">
                {crumb.label}
              </Link>
            ) : (
              <span className={i === detail.breadcrumb.length - 1 ? "text-ink2" : undefined}>{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[22px] font-semibold tracking-[-0.02em]">{detail.name}</h1>
            <span className="rounded-md bg-hover px-2 py-0.5 text-[12px] text-ink2">{detail.kind}</span>
            {detail.badges.map((badge) => (
              <span key={badge} className="rounded-md border border-line px-2 py-0.5 text-[12px] text-ink2">
                {badge}
              </span>
            ))}
          </div>
          <span className="text-[clamp(36px,6vw,48px)] font-medium leading-none tracking-[-0.035em] tabular-nums">
            {detail.usd}
          </span>
          {detail.nativeLine && <span className="text-[13.5px] text-ink2">{detail.nativeLine}</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={detail.actions.update.href} className={BUTTON}>
            {detail.actions.update.label}
          </Link>
          <Link href={detail.actions.edit.href} className={BUTTON}>
            Edit
          </Link>
          <ConfirmDeleteButton url={`/api/holdings/${detail.id}/archive`} to="/" className={BUTTON} />
        </div>
      </header>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {detail.stats.map((stat) => (
          <div key={stat.label} className={`${CARD} flex flex-col gap-2 p-4`}>
            <span className={MONO_LABEL}>{stat.label}</span>
            <span className="text-[20px] font-medium leading-none tracking-[-0.02em] tabular-nums">
              {stat.value}
            </span>
            {stat.sub && <span className="text-[12.5px] text-ink2">{stat.sub}</span>}
          </div>
        ))}
      </div>
      {detail.stocks && <StocksSections stocks={detail.stocks} />}
      <section className={`${CARD} px-5 pb-3 pt-5`} aria-labelledby="value-chart">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <h2 id="value-chart" className="text-[15px] font-semibold">
              {detail.chart.title}
            </h2>
            <span className="text-[12.5px] text-ink2">{detail.chart.sub}</span>
          </div>
          <ProjectionToggle />
        </div>
        <Chart series={detail.chart.series} today={detail.chart.today} height={detail.chart.height} />
      </section>
      <section className={`${CARD} p-5`} aria-labelledby="value-log">
        <h2 id="value-log" className="mb-3 text-[15px] font-semibold">
          {detail.valueLog.title}
        </h2>
        <ul className="flex flex-col divide-y divide-line">
          {detail.valueLog.rows.map((row, i) => (
            <li key={i} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5 text-[13.5px]">
              <span className="text-ink2">{row.date}</span>
              <span className="flex items-baseline gap-4">
                <span className="tabular-nums font-medium">{row.value}</span>
                <span className="min-w-[8ch] text-right text-[12.5px] tabular-nums text-ink2">{row.change}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
