import Link from "next/link";
import type { StocksSections as StocksSectionsView } from "@/lib/views/holding-detail";

const CARD = "rounded-[14px] border border-line bg-panel shadow-[var(--shadow)]";
const MONO_LABEL = "font-mono text-[11px] font-medium uppercase leading-tight tracking-[0.06em] text-ink3";

const SECTOR_COLORS: Record<string, string> = {
  Technology: "#4f7cff",
  Financials: "#2fa36b",
  Healthcare: "#e0577d",
  Energy: "#e08a2f",
  "Consumer Discretionary": "#a463d9",
  "Consumer Staples": "#7aa83a",
  "Communication Services": "#27a5b8",
  Industrials: "#8a7a5c",
  Utilities: "#5c6fb0",
  Materials: "#b8893a",
  "Real Estate": "#c9524a",
  Other: "#8b8f98",
};
const dot = (sector: string) => ({ backgroundColor: SECTOR_COLORS[sector] ?? SECTOR_COLORS.Other });

// "Positions in this account" beside "By sector"; the two stack under 820px of content (the shell's @container).
export function StocksSections({ stocks }: { stocks: StocksSectionsView }) {
  return (
    <div className="grid grid-cols-1 gap-4 @[820px]:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <section className={`${CARD} flex flex-col gap-3 p-4`}>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[15px] font-semibold">Positions in this account</h2>
          <span className="text-[12.5px] text-ink3">{stocks.subheading}</span>
        </div>
        <ul className="flex flex-col">
          {stocks.positions.map((row) => (
            <li key={row.href} className="border-t border-line first:border-t-0">
              <Link href={row.href} className="flex items-center gap-3 py-2.5 hover:bg-hover">
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={dot(row.sector)}
                  title={row.sector}
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[14px] font-medium">{row.ticker}</span>
                  <span className="truncate text-[12.5px] text-ink2">
                    <span className="hidden sm:inline">{row.line}</span>
                    <span className="sm:hidden">{row.line.replace(/^[\d.,]+ sh · /, "")}</span>
                  </span>
                </span>
                <span className="text-[13.5px] tabular-nums text-ink2">{row.price}</span>
                <span className="w-20 text-right text-[14px] font-medium tabular-nums">{row.value}</span>
                <span className="hidden w-12 text-right text-[13px] tabular-nums text-ink2 sm:inline">
                  {row.gain}
                </span>
                <span className="hidden w-12 text-right text-[13px] tabular-nums text-ink2 sm:inline">
                  {row.weight}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section className={`${CARD} flex flex-col gap-3 p-4`}>
        <h2 className="text-[15px] font-semibold">By sector</h2>
        <ul className="flex flex-col gap-2.5">
          {stocks.sectors.map((s) => (
            <li key={s.sector} className="flex items-start gap-2.5">
              <span
                aria-hidden="true"
                className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                style={dot(s.sector)}
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[13.5px]">{s.sector}</span>
                <span className={`${MONO_LABEL} normal-case`}>{s.tickers}</span>
              </span>
              <span className="text-[13.5px] font-medium tabular-nums">{s.share}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
