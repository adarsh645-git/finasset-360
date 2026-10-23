"use client";

import { useState } from "react";
import { RowLink } from "@/components/overview/RowLink";
import { SECTOR_COLORS } from "@/components/holding/style";
import {
  sectorsControlLabel,
  toggleAllSectors,
  toggleSector,
  type PositionRow,
  type PositionsCard as PositionsCardView,
} from "@/lib/views/positions-card";

const CARD = "rounded-[14px] border border-line bg-panel shadow-[var(--shadow)]";
const HEAD = "font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-ink3";
const PILL = "h-10 rounded-md px-3 text-[13px] font-medium";
// Sector rows and stock rows share these columns so the figures line up. Below 640px only the name and value stay.
const SECTOR_COLS =
  "grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_5rem_5.5rem_6rem_4rem_4.5rem]";
const FLAT_COLS =
  "grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[3.5rem_5rem_minmax(0,1fr)_9rem_4.5rem_5.5rem_6rem_4rem_4.5rem]";

const colorOf = (sector: string) => SECTOR_COLORS[sector] ?? SECTOR_COLORS.Other;

function StockRow({ row }: { row: PositionRow }) {
  return (
    <RowLink
      href={row.href}
      className={`grid ${SECTOR_COLS} items-center gap-x-4 rounded-lg py-2 pl-8 pr-3 text-[13.5px]`}
    >
      <span className="flex min-w-0 flex-col">
        <span className="font-medium">{row.ticker}</span>
        <span className="truncate text-[12px] text-ink3">
          {row.name}
          {row.cue && ` ${row.cue}`}
        </span>
      </span>
      <span className="hidden text-right text-ink2 tabular-nums sm:block">{row.shares}</span>
      <span className="hidden text-right text-ink2 tabular-nums sm:block">{row.price}</span>
      <span className="text-right tabular-nums">{row.value}</span>
      <span className="hidden text-right text-ink2 tabular-nums sm:block">{row.gain}</span>
      <span className="hidden text-right text-ink2 tabular-nums sm:block">{row.weight}</span>
    </RowLink>
  );
}

export function PositionsCard({ card }: { card: PositionsCardView }) {
  const [view, setView] = useState<"sector" | "all">("sector");
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const names = card.sectors.map((s) => s.name);

  return (
    <section className={`${CARD} flex flex-col gap-3 p-4`} aria-labelledby="class-positions">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 id="class-positions" className="text-[15px] font-semibold">
            Positions
          </h2>
          <span className="text-[12.5px] text-ink3">{card.subtitle}</span>
        </div>
        <div className="flex items-center gap-2">
          {view === "sector" && (
            <button
              type="button"
              className={`${PILL} border border-line hover:bg-hover`}
              onClick={() => setOpen(toggleAllSectors(open, names))}
            >
              {sectorsControlLabel(open, names)}
            </button>
          )}
          <div role="group" aria-label="Positions view" className="flex rounded-lg border border-line p-0.5">
            {(
              [
                ["sector", "By sector"],
                ["all", "All positions"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={view === key}
                className={`${PILL} ${view === key ? "bg-hover" : "text-ink2 hover:bg-hover"}`}
                onClick={() => setView(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === "sector" ? (
        <>
          <div className="flex h-2.5 w-full overflow-hidden rounded-full" role="img" aria-label="Sector distribution">
            {card.bar.map((s) => (
              <span key={s.name} style={{ width: `${s.percent}%`, background: colorOf(s.name) }} title={s.name} />
            ))}
          </div>
          <div className="flex flex-col">
            {card.sectors.map((s) => {
              const isOpen = open.has(s.name);
              return (
                <div key={s.name} className="border-t border-line first:border-t-0">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(toggleSector(open, s.name))}
                    className={`grid ${SECTOR_COLS} w-full items-center gap-x-4 rounded-lg px-3 py-2.5 text-left text-[13.5px] hover:bg-hover`}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span aria-hidden className="size-2.5 flex-none rounded-full" style={{ background: colorOf(s.name) }} />
                      <span className="flex min-w-0 flex-col">
                        <span className="font-medium">{s.name}</span>
                        <span className="truncate text-[12px] text-ink3">
                          <span className="hidden sm:inline">{s.summary}</span>
                          <span className="sm:hidden">{s.phoneSummary}</span>
                        </span>
                      </span>
                    </span>
                    <span className="hidden sm:block" />
                    <span className="hidden sm:block" />
                    <span className="text-right font-medium tabular-nums">{s.value}</span>
                    <span className="hidden text-right text-ink2 tabular-nums sm:block">{s.gain}</span>
                    <span className="hidden text-right text-ink2 tabular-nums sm:block">{s.share}</span>
                  </button>
                  {isOpen && s.rows.map((row) => <StockRow key={row.key} row={row} />)}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="flex flex-col">
          <div className={`${HEAD} grid ${FLAT_COLS} gap-x-4 px-3 py-2`}>
            <span>Ticker</span>
            <span className="hidden sm:block">Exch.</span>
            <span className="hidden sm:block">Name</span>
            <span className="hidden sm:block">Sector</span>
            <span className="hidden text-right sm:block">Shares</span>
            <span className="hidden text-right sm:block">Price</span>
            <span className="text-right">Value</span>
            <span className="hidden text-right sm:block">Gain</span>
            <span className="hidden text-right sm:block">Weight</span>
          </div>
          {card.all.map((row) => (
            <RowLink
              key={row.key}
              href={row.href}
              className={`grid ${FLAT_COLS} items-center gap-x-4 rounded-lg px-3 py-2.5 text-[13.5px]`}
            >
              <span className="flex min-w-0 flex-col">
                <span className="font-medium">{row.ticker}</span>
                <span className="truncate text-[12px] text-ink3 sm:hidden">{row.name}</span>
              </span>
              <span className="hidden text-ink2 sm:block">{row.exchange}</span>
              <span className="hidden min-w-0 truncate sm:block">
                {row.name}
                {row.cue && <span className="text-ink3"> {row.cue}</span>}
              </span>
              <span className="hidden items-center gap-1.5 truncate text-ink2 sm:flex">
                <span aria-hidden className="size-2 flex-none rounded-full" style={{ background: colorOf(row.sector) }} />
                {row.sector}
              </span>
              <span className="hidden text-right text-ink2 tabular-nums sm:block">{row.shares}</span>
              <span className="hidden text-right text-ink2 tabular-nums sm:block">{row.price}</span>
              <span className="text-right tabular-nums">{row.value}</span>
              <span className="hidden text-right text-ink2 tabular-nums sm:block">{row.gain}</span>
              <span className="hidden text-right text-ink2 tabular-nums sm:block">{row.weight}</span>
            </RowLink>
          ))}
        </div>
      )}
    </section>
  );
}
