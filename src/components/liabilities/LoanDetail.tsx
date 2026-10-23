import Link from "next/link";
import { ConfirmDeleteButton } from "@/components/holding/ConfirmDeleteButton";
import { Chart } from "@/components/chart/Chart";
import { ProjectionToggle } from "@/components/chart/ProjectionProvider";
import { MONO_LABEL } from "@/components/holding/style";
import type { LoanDetail as LoanDetailView } from "@/lib/views/loan-detail";

const BUTTON = "flex h-10 items-center rounded-lg border border-line px-3.5 text-[13.5px] font-medium hover:bg-hover";
const CARD = "rounded-[14px] border border-line bg-panel shadow-[var(--shadow)]";

// Renders what buildLoanDetail returns. Edit arrives with ticket 4.
export function LoanDetail({ detail }: { detail: LoanDetailView }) {
  const card = detail.securedAgainst;
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
              <span className="text-ink2">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[22px] font-semibold tracking-[-0.02em]">{detail.name}</h1>
            {detail.badges.map((badge) => (
              <span key={badge} className="rounded-md border border-line px-2 py-0.5 text-[12px] text-ink2">
                {badge}
              </span>
            ))}
          </div>
          <span className="text-[clamp(36px,6vw,48px)] font-medium leading-none tracking-[-0.035em] tabular-nums">
            {detail.usd}
          </span>
          <span className="text-[13.5px] text-ink2">{detail.nativeLine}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={detail.actions.updateBalance.href} className={BUTTON}>
            Update balance
          </Link>
          <ConfirmDeleteButton url={`/api/liabilities/${detail.id}/archive`} to={detail.afterArchive} className={BUTTON} />
        </div>
      </header>

      <section className={`${CARD} flex flex-col gap-2 p-4`} aria-label="Paid off">
        <div className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 text-[13.5px]">
          <span className="font-medium">{detail.bar.label}</span>
          <span className="text-ink2">{detail.bar.sub}</span>
        </div>
        <span aria-hidden className="h-1.5 overflow-hidden rounded-full bg-sel">
          <span
            className="block h-full rounded-full"
            style={{ width: `${Math.round(detail.bar.fraction * 100)}%`, background: `var(${detail.bar.colorVar})` }}
          />
        </span>
      </section>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {detail.stats.map((stat) => (
          <div key={stat.label} className={`${CARD} flex flex-col gap-2 p-4`}>
            <span className={MONO_LABEL}>{stat.label}</span>
            <span className="text-[20px] font-medium leading-none tracking-[-0.02em] tabular-nums">{stat.value}</span>
            {stat.sub && <span className="text-[12.5px] text-ink2">{stat.sub}</span>}
          </div>
        ))}
      </div>

      <section className={`${CARD} px-5 pb-3 pt-5`} aria-labelledby="balance-chart">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <h2 id="balance-chart" className="text-[15px] font-semibold">
              {detail.chart.title}
            </h2>
            <span className="text-[12.5px] text-ink2">{detail.chart.sub}</span>
          </div>
          <ProjectionToggle />
        </div>
        <Chart series={detail.chart.series} today={detail.chart.today} height={detail.chart.height} zero={detail.chart.zero} />
      </section>

      {card && (
        <section className={`${CARD} flex flex-col gap-2 p-5`} aria-labelledby="secured-against">
          <h2 id="secured-against" className={MONO_LABEL}>
            Secured against
          </h2>
          {card.href ? (
            <Link href={card.href} className="flex flex-col gap-1 hover:opacity-80">
              <CardBody name={card.name} worth={card.worth} equity={card.equity} />
            </Link>
          ) : (
            <div className="flex flex-col gap-1">
              <CardBody name={card.name} worth={card.worth} equity={card.equity} />
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function CardBody({ name, worth, equity }: { name: string; worth: string; equity: string }) {
  return (
    <>
      <span className="text-[15px] font-medium">{name}</span>
      <span className="text-[13.5px] text-ink2">{worth}</span>
      <span className="text-[13.5px] font-medium">{equity}</span>
    </>
  );
}
