"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  layoutChart,
  nearestIndex,
  tooltipAt,
  type ChartGoal,
  type ChartSeries,
} from "@/lib/chart";
import { createHoverController } from "./hover";
import { useProjection } from "./ProjectionProvider";

export type ChartProps = {
  series: ChartSeries[];
  today: string;
  height?: number;
  zero?: boolean;
  goals?: ChartGoal[];
  legend?: ReactNode;
};

const LABEL = "absolute whitespace-nowrap font-mono text-[10.5px] leading-[14px] text-ink3";
const pct = (n: number, of: number) => `${(n / of) * 100}%`;

export function Chart({ series, today, height = 240, zero, goals, legend }: ChartProps) {
  const { projection } = useProjection();
  const layout = useMemo(
    () => layoutChart({ series, today, height, projection, zero, goals }),
    [series, today, height, projection, zero, goals],
  );
  const [hv, setHv] = useState<number | null>(null);
  const plot = useRef<HTMLDivElement>(null);
  const hover = useRef<ReturnType<typeof createHoverController> | null>(null);
  useEffect(() => {
    const c = createHoverController(setHv);
    hover.current = c;
    return c.dispose;
  }, []);

  const pick = (clientX: number) => {
    const r = plot.current?.getBoundingClientRect();
    if (!r || !r.width) return null;
    return nearestIndex(layout, (clientX - r.left) / r.width);
  };

  const { width: W, height: H } = layout;
  const tip = hv !== null && hv < layout.dates.length ? tooltipAt(layout, hv) : null;
  const vars = { "--ch": `${H}px`, "--ch-phone": `${layout.phoneHeight}px` } as CSSProperties;
  const fillBelow = layout.y.lo < 0 && layout.y.hi > 0;

  return (
    <div>
      <div className="flex select-none gap-2" style={vars}>
        <div
          className="relative h-[var(--ch)] w-[46px] flex-none max-sm:h-[var(--ch-phone)] max-sm:w-[36px]"
          data-chart-axis
          data-phone-axis-width="36px"
        >
          {layout.y.ticks.map((t) => (
            <div key={t.value} className={`${LABEL} right-0`} style={{ top: `calc(${pct(t.y, H)} - 7px)` }}>
              {t.label}
            </div>
          ))}
        </div>
        <div
          ref={plot}
          data-chart-plot
          data-phone-height={`${layout.phoneHeight}px`}
          className="relative h-[var(--ch)] min-w-0 flex-1 cursor-crosshair max-sm:h-[var(--ch-phone)]"
          style={{ touchAction: "pan-y" }}
          onMouseMove={(e) => {
            const i = pick(e.clientX);
            if (i !== null) hover.current?.move(i);
          }}
          onMouseLeave={() => hover.current?.leave()}
          onTouchStart={(e) => {
            const i = pick(e.touches[0]!.clientX);
            if (i !== null) hover.current?.touch(i);
          }}
          onTouchMove={(e) => {
            const i = pick(e.touches[0]!.clientX);
            if (i !== null) hover.current?.touch(i);
          }}
          onTouchEnd={() => hover.current?.touchEnd()}
        >
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            width="100%"
            height="100%"
            className="block overflow-visible"
          >
            {layout.projectionRegion && (
              <rect
                x={layout.projectionRegion.x}
                y={layout.padTop}
                width={layout.projectionRegion.width}
                height={H - layout.padTop - layout.padBottom}
                style={{ fill: "var(--hover)" }}
              />
            )}
            {layout.y.ticks.map((t) => (
              <line
                key={t.value}
                x1={0}
                x2={W}
                y1={t.y}
                y2={t.y}
                vectorEffect="non-scaling-stroke"
                style={{ stroke: t.value === 0 && fillBelow ? "var(--line2)" : "var(--line)", strokeWidth: 1 }}
              />
            ))}
            {layout.series.map(
              (s, k) =>
                s.areaPath && (
                  <path key={`a${k}`} d={s.areaPath} style={{ fill: s.color, fillOpacity: s.areaOpacity }} />
                ),
            )}
            {layout.series.map((s, k) =>
              s.drawLine ? (
                <g key={`l${k}`}>
                  {s.solidPath && (
                    <path
                      d={s.solidPath}
                      vectorEffect="non-scaling-stroke"
                      style={{ stroke: s.color, strokeWidth: s.width, fill: "none", strokeLinejoin: "round" }}
                    />
                  )}
                  {s.dashedPath && (
                    <path
                      d={s.dashedPath}
                      vectorEffect="non-scaling-stroke"
                      style={{
                        stroke: s.color,
                        strokeWidth: s.width,
                        fill: "none",
                        strokeLinejoin: "round",
                        strokeDasharray: "5 4",
                      }}
                    />
                  )}
                </g>
              ) : null,
            )}
            {layout.goals.map((g, k) => (
              <line
                key={`g${k}`}
                x1={0}
                x2={W}
                y1={g.y}
                y2={g.y}
                vectorEffect="non-scaling-stroke"
                style={{ stroke: "var(--ink3)", strokeWidth: 1, strokeDasharray: "2 4" }}
              />
            ))}
            {layout.nowX !== null && (
              <line
                x1={layout.nowX}
                x2={layout.nowX}
                y1={layout.padTop}
                y2={H - layout.padBottom}
                vectorEffect="non-scaling-stroke"
                style={{ stroke: "var(--ink3)", strokeWidth: 1 }}
              />
            )}
          </svg>
          {layout.xLabels.map((l) => (
            <div
              key={l.label + l.x}
              className={`${LABEL} -translate-x-1/2`}
              style={{ top: H - layout.padBottom + 8, left: pct(l.x, W) }}
            >
              {l.label}
            </div>
          ))}
          {layout.todayLabel && layout.nowX !== null && (
            <div className={`${LABEL} translate-x-1.5`} style={{ top: 0, left: pct(layout.nowX, W) }}>
              {layout.todayLabel}
            </div>
          )}
          {layout.goals.map((g, k) => (
            <div key={`gt${k}`} className={LABEL} style={{ left: 6, top: `calc(${pct(g.y, H)} - 16px)` }}>
              {g.label}
            </div>
          ))}
          {tip && (
            <>
              <div
                className="pointer-events-none absolute w-px bg-ink2 opacity-50"
                style={{ top: layout.padTop, bottom: layout.padBottom, left: `${tip.fraction * 100}%` }}
              />
              {tip.dots.map((d, k) => (
                <div
                  key={k}
                  className="pointer-events-none absolute -ml-[4.5px] -mt-[4.5px] size-[9px] rounded-full bg-panel"
                  style={{ left: `${tip.fraction * 100}%`, top: pct(d.y, H), border: `2px solid ${d.color}` }}
                />
              ))}
              <div
                className="pointer-events-none absolute top-1.5 z-[3] flex min-w-[170px] flex-col gap-1.5 rounded-[10px] border border-line2 bg-panel px-3 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,.12)]"
                style={{
                  left: `${tip.fraction * 100}%`,
                  transform: tip.fraction > 0.58 ? "translateX(calc(-100% - 12px))" : "translateX(12px)",
                }}
              >
                <div className="font-mono text-[10.5px] uppercase leading-tight tracking-[.04em] text-ink3">
                  {tip.title}
                </div>
                {tip.rows.map((r, k) => (
                  <div key={k} className="flex justify-between gap-4 text-[12.5px] text-ink tabular-nums">
                    <span className="flex items-center gap-1.5 whitespace-nowrap text-ink2">
                      <span className="size-[7px] rounded-[2px]" style={{ background: r.color }} />
                      {r.name}
                    </span>
                    <span className={r.bold ? "font-semibold" : "font-medium"}>{r.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        {layout.endLabels.length > 0 && (
          <div
            data-chart-end-labels
            className="relative h-[var(--ch)] w-[104px] flex-none max-sm:hidden"
          >
            {layout.endLabels.map((e, k) => (
              <div
                key={k}
                className="absolute left-1 flex flex-col gap-px pl-[7px]"
                style={{ top: Math.max(0, Math.min(H - 30, e.y - 15)), borderLeft: `2px solid ${e.color}` }}
              >
                <span className="whitespace-nowrap text-[11px] text-ink3">{e.name}</span>
                <span className="text-[13px] font-semibold text-ink tabular-nums">{e.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {legend && <div data-chart-legend>{legend}</div>}
    </div>
  );
}
