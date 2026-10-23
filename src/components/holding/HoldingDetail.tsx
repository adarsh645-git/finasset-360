import Link from "next/link";
import { ConfirmDeleteButton } from "@/components/holding/ConfirmDeleteButton";
import type { HoldingDetail as HoldingDetailView } from "@/lib/views/holding-detail";

const MONO_LABEL = "font-mono text-[11px] font-medium uppercase leading-tight tracking-[0.06em] text-ink3";
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
    </div>
  );
}
