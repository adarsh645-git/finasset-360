// Pure chart geometry: no DOM. The Chart component only renders what
// `layoutChart` returns. Geometry lives in a fixed 1000 x H viewBox, so
// the phone rules (height, axis width, hidden end labels) are CSS.
import { compact, monthLong, usd, monthAxis } from "@/lib/format";

export type Point = { date: string; value: number };

export type ChartSeries = {
  name?: string;
  color: string;
  /** Drawn values. */
  points: Point[];
  /** Area fills down to zero, or to `base` (same length and dates as `points`). */
  area?: boolean;
  areaOpacity?: number;
  base?: Point[];
  /** false: not drawn as a line (default true). */
  line?: boolean;
  width?: number;
  /** Values shown in the tooltip row and end label instead of `points`. */
  tip?: Point[];
  dot?: boolean;
  bold?: boolean;
  endLabel?: boolean;
  endName?: string;
  /** false: does not move the y-range (default true). */
  scaled?: boolean;
};

export type ChartGoal = { label: string; value: number };

export type ChartInput = {
  series: ChartSeries[];
  /** ISO date. */
  today: string;
  height?: number;
  projection: boolean;
  /** Force $0 onto the y-axis. */
  zero?: boolean;
  goals?: ChartGoal[];
};

export const VIEW_W = 1000;
const PAD_TOP = 16;
const PAD_BOTTOM = 26;
const MIN_LABEL_GAP = 32;

const DAY = 86_400_000;
export const toDay = (iso: string) => Math.round(Date.parse(iso.slice(0, 10) + "T00:00:00Z") / DAY);
const fromDay = (d: number) => new Date(d * DAY).toISOString().slice(0, 10);

/** Step of 1, 2, 5 or 10 x a power of ten, for about `n` steps over `span`. */
export function niceStep(span: number, n = 4): number {
  const raw = span / n;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / p;
  return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
}

/** Layers whose own values stack: each is drawn on the running total, tipped at its own value. */
export function stackSeries(layers: ChartSeries[]): ChartSeries[] {
  let running: Point[] | null = null;
  return layers.map((layer) => {
    const base: Point[] | undefined = running ?? undefined;
    const drawn: Point[] = layer.points.map((p, i) => ({
      date: p.date,
      value: p.value + (base ? base[i]!.value : 0),
    }));
    running = drawn;
    return { area: true, ...layer, points: drawn, base, tip: layer.points };
  });
}

type LaidSeries = {
  name?: string;
  color: string;
  solidPath: string;
  dashedPath: string;
  areaPath: string | null;
  areaOpacity: number;
  /** Data values of the area edges, per drawn point. */
  upper: number[];
  lower: number[];
  drawLine: boolean;
  width: number;
  dot: boolean;
};

export type EndLabel = { name: string; value: string; y: number; color: string };

export type ChartLayout = {
  width: number;
  height: number;
  phoneHeight: number;
  padTop: number;
  padBottom: number;
  x0: number;
  x1: number;
  /** Selectable dates (ISO), ascending. */
  dates: string[];
  nowX: number | null;
  projectionRegion: { x: number; width: number } | null;
  todayLabel: string | null;
  y: {
    lo: number;
    hi: number;
    step: number;
    ticks: { value: number; label: string; y: number }[];
    zeroY: number;
  };
  series: LaidSeries[];
  goals: { label: string; value: number; y: number }[];
  xLabels: { label: string; x: number }[];
  endLabels: EndLabel[];
  today: string;
  input: ChartInput & { series: ChartSeries[] };
};

const trim = (pts: Point[] | undefined, last: string) => pts?.filter((p) => p.date <= last);

export function layoutChart(raw: ChartInput): ChartLayout {
  const H = raw.height ?? 240;
  const W = VIEW_W;
  const today = raw.today.slice(0, 10);

  const series: ChartSeries[] = raw.series.map((s) =>
    raw.projection
      ? s
      : { ...s, points: trim(s.points, today)!, base: trim(s.base, today), tip: trim(s.tip, today) },
  );

  const allDays = series.flatMap((s) => s.points.map((p) => toDay(p.date)));
  const dayList = [...new Set(allDays)].sort((a, b) => a - b);
  const x0 = dayList.length ? dayList[0]! : toDay(today);
  const x1 = Math.max(dayList.length ? dayList[dayList.length - 1]! : x0, x0 + 1);
  const span = x1 - x0;
  const nowDay = toDay(today);
  const X = (d: number) => ((d - x0) / span) * W;
  const hasProjection = nowDay > x0 && nowDay < x1;

  // y-domain
  let mn = raw.zero ? 0 : Infinity;
  let mx = raw.zero ? 0 : -Infinity;
  for (const s of series) {
    if (s.scaled === false) continue;
    s.points.forEach((p, i) => {
      mn = Math.min(mn, p.value);
      mx = Math.max(mx, p.value);
      const b = s.base?.[i];
      if (b) {
        mn = Math.min(mn, b.value);
        mx = Math.max(mx, b.value);
      }
    });
  }
  if (!Number.isFinite(mn)) {
    mn = 0;
    mx = 1;
  }
  if (mn === mx) mx = mn + 1;
  const goals = (raw.goals ?? []).filter((g) => g.value >= mn && g.value <= mx * 1.15);
  for (const g of goals) mx = Math.max(mx, g.value);

  const step = niceStep(mx - mn, 4);
  const lo = Math.floor(mn / step + 1e-9) * step;
  const hi = Math.ceil(mx / step - 1e-9) * step;
  const count = Math.round((hi - lo) / step);
  const Y = (v: number) => PAD_TOP + (1 - (v - lo) / (hi - lo)) * (H - PAD_TOP - PAD_BOTTOM);
  const ticks = Array.from({ length: count + 1 }, (_, k) => {
    const value = lo + k * step;
    return { value, label: compact(value), y: Y(value) };
  });
  const zeroY = Y(lo < 0 && hi > 0 ? 0 : lo);

  const fmt = (n: number) => n.toFixed(1);
  const pathOf = (pts: { d: number; v: number }[]) =>
    pts.map((p, i) => `${i ? "L" : "M"}${fmt(X(p.d))} ${fmt(Y(p.v))}`).join("");

  const laid: LaidSeries[] = series.map((s) => {
    const pts = s.points.map((p) => ({ d: toDay(p.date), v: p.value }));
    let solid = pts;
    let dashed: typeof pts = [];
    if (hasProjection) {
      solid = pts.filter((p) => p.d <= nowDay);
      dashed = pts.filter((p) => p.d >= nowDay);
      const before = pts.filter((p) => p.d < nowDay).at(-1);
      const after = pts.find((p) => p.d > nowDay);
      const onNow = pts.some((p) => p.d === nowDay);
      if (!onNow && before && after) {
        const v = before.v + ((after.v - before.v) * (nowDay - before.d)) / (after.d - before.d);
        solid = [...solid, { d: nowDay, v }];
        dashed = [{ d: nowDay, v }, ...dashed];
      }
    }
    const lower = s.points.map((_, i) => (s.base ? s.base[i]!.value : 0));
    const upper = s.points.map((p) => p.value);
    let areaPath: string | null = null;
    if (s.area && pts.length) {
      const back = pts
        .map((p, i) => ({ d: p.d, v: s.base ? lower[i]! : lo < 0 && hi > 0 ? 0 : lo }))
        .reverse();
      areaPath = pathOf(pts) + back.map((p) => `L${fmt(X(p.d))} ${fmt(Y(p.v))}`).join("") + "Z";
    }
    return {
      name: s.name,
      color: s.color,
      solidPath: solid.length ? pathOf(solid) : "",
      dashedPath: dashed.length > 1 ? pathOf(dashed) : "",
      areaPath,
      areaOpacity: s.areaOpacity ?? 0.12,
      upper,
      lower,
      drawLine: s.line !== false,
      width: s.width ?? 1.5,
      dot: !!s.dot,
    };
  });

  // end labels: last visible point, own value if given
  const ends: EndLabel[] = series
    .filter((s) => s.endLabel && s.points.length)
    .map((s) => {
      const lastDrawn = s.points[s.points.length - 1]!;
      const own = (s.tip ?? s.points).at(-1)!;
      return { name: s.endName ?? s.name ?? "", value: compact(own.value), y: Y(lastDrawn.value), color: s.color };
    });

  return {
    width: W,
    height: H,
    phoneHeight: Math.round(H * 0.78),
    padTop: PAD_TOP,
    padBottom: PAD_BOTTOM,
    x0,
    x1,
    dates: dayList.map(fromDay),
    nowX: hasProjection ? X(nowDay) : null,
    projectionRegion: hasProjection ? { x: X(nowDay), width: W - X(nowDay) } : null,
    todayLabel: hasProjection ? "Today → projected" : null,
    y: { lo, hi, step, ticks, zeroY },
    series: laid,
    goals: goals.map((g) => ({ ...g, y: Y(g.value) })),
    xLabels: xLabelsFor(x0, x1).map((l) => ({ label: l.label, x: X(l.day) })),
    endLabels: placeEndLabels(ends),
    today,
    input: { ...raw, series },
  };
}

/** Pushes labels apart to at least 32px, top to bottom. */
export function placeEndLabels(labels: EndLabel[]): EndLabel[] {
  const out = labels.map((l) => ({ ...l })).sort((a, b) => a.y - b.y);
  for (let k = 1; k < out.length; k++) {
    if (out[k]!.y < out[k - 1]!.y + MIN_LABEL_GAP) out[k]!.y = out[k - 1]!.y + MIN_LABEL_GAP;
  }
  return out;
}

function xLabelsFor(x0: number, x1: number): { label: string; day: number }[] {
  const [y0, m0] = fromDay(x0).split("-").map(Number) as [number, number];
  const [y1, m1] = fromDay(x1).split("-").map(Number) as [number, number];
  const startIdx = y0 * 12 + (m0 - 1);
  const endIdx = y1 * 12 + (m1 - 1);
  const months = endIdx - startIdx;
  // anchor on the month's last day, kept inside the range
  const anchor = (idx: number) => {
    const y = Math.floor(idx / 12);
    const m = (idx % 12) + 1;
    return Math.min(x1, Math.max(x0, Math.round(Date.UTC(y, m, 0) / DAY)));
  };
  const out: { label: string; day: number }[] = [];
  if (months <= 30) {
    for (let idx = startIdx; idx <= endIdx; idx++) {
      if (idx % 3 !== 0) continue;
      out.push({ label: monthLabel(idx), day: anchor(idx) });
    }
    return out;
  }
  const stp = months / 12 > 16 ? 4 : months / 12 > 8 ? 2 : 1;
  let n = 0;
  for (let idx = startIdx; idx <= endIdx; idx++) {
    if (idx % 12 !== 0) continue;
    if (n++ % stp === 0) out.push({ label: String(Math.floor(idx / 12)), day: anchor(idx) });
  }
  return out;
}

const monthLabel = (idx: number) =>
  monthAxis(`${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}-01`);

/** Index into `layout.dates` of the point nearest a pointer fraction (0..1) of the plot width. */
export function nearestIndex(layout: ChartLayout, fraction: number): number {
  const f = Math.max(0, Math.min(1, fraction));
  const target = layout.x0 + f * (layout.x1 - layout.x0);
  let best = 0;
  let bestDist = Infinity;
  layout.dates.forEach((d, i) => {
    const dist = Math.abs(toDay(d) - target);
    if (dist < bestDist) {
      best = i;
      bestDist = dist;
    }
  });
  return best;
}

export type Tooltip = {
  title: string;
  /** Position as a fraction of the plot width. */
  fraction: number;
  rows: { name: string; color: string; value: string; bold: boolean }[];
  dots: { color: string; y: number }[];
};

export function tooltipAt(layout: ChartLayout, index: number): Tooltip {
  const date = layout.dates[index]!;
  const at = (pts: Point[] | undefined) => pts?.find((p) => p.date === date)?.value;
  const rows = layout.input.series
    .filter((s) => s.name)
    .map((s) => ({
      name: s.name!,
      color: s.color,
      value: usd(at(s.tip) ?? at(s.points) ?? null),
      bold: !!s.bold,
    }));
  const { y } = layout;
  const H = layout.height;
  const dots = layout.input.series.flatMap((s) => {
    const v = at(s.points);
    if (!s.dot || s.line === false || v === undefined) return [];
    return [{ color: s.color, y: layout.padTop + (1 - (v - y.lo) / (y.hi - y.lo)) * (H - layout.padTop - layout.padBottom) }];
  });
  return {
    title: monthLong(date) + (date > layout.today ? " · projected" : ""),
    fraction: (toDay(date) - layout.x0) / (layout.x1 - layout.x0),
    rows,
    dots,
  };
}
