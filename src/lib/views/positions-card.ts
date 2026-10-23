import { staleness } from "@/lib/calc";
import { DASH, signedPct, usd } from "@/lib/format";
import { shortTicker } from "@/lib/market-data/ticker";
import type { HoldingData } from "@/lib/read-model/types";
import { ageCue } from "@/lib/views/age-cue";

/** One Position on one line, in a sector or in the flat table. */
export type PositionRow = {
  key: string;
  /** Without `.NS` / `.BO`. */
  ticker: string;
  exchange: string;
  /** Company name, then " · <Holding name>" when the class has several Holdings. */
  name: string;
  sector: string;
  /** "30 sh". */
  shares: string;
  /** Native currency of the Holding. */
  price: string;
  value: string;
  gain: string;
  /** Share of all Positions' USD value, one decimal. */
  weight: string;
  /** "· price 47 days old" for a stale Hand Price. */
  cue: string | null;
  /** The position drawer over the class page. */
  href: string;
  usdValue: number;
};

export type SectorRow = {
  name: string;
  /** "3 stocks · AAPL, MSFT, INFY". */
  summary: string;
  /** "79.3% · 3 stocks · AAPL, MSFT, INFY". */
  phoneSummary: string;
  value: string;
  gain: string;
  share: string;
  rows: PositionRow[];
};

export type PositionsCard = {
  subtitle: string;
  /** Distribution bar segments, largest sector first. */
  bar: { name: string; percent: number }[];
  sectors: SectorRow[];
  all: PositionRow[];
};

/** Prices keep their cents: "$232.10"; rupees drop a zero fraction ("₹245"). */
const priceOf = (v: number, india: boolean) =>
  india
    ? `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
    : `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const oneDecimal = (n: number) => n.toFixed(1);
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function buildPositionsCard(
  holdings: HoldingData[],
  { today, fxRate, path }: { today: string; fxRate: number; path: string },
): PositionsCard | null {
  const asOf = new Date(`${today}T00:00:00Z`);
  const entries = holdings.flatMap((h) =>
    h.positions.map((p) => {
      const rate = h.country === "IN" ? fxRate : 1;
      return { h, p, usdValue: (p.shares * p.price) / rate, usdCost: (p.shares * p.avgCost) / rate };
    }),
  );
  if (entries.length === 0) return null;

  const total = entries.reduce((s, e) => s + e.usdValue, 0);
  const weightOf = (v: number) => (total === 0 ? "0.0%" : `${oneDecimal((v / total) * 100)}%`);
  const several = holdings.length > 1;

  const rowOf = ({ h, p, usdValue }: (typeof entries)[number]): PositionRow => {
    const { ageDays } = staleness(
      { kind: "stocks", positions: [{ handPriceDate: p.priceSource === "hand" ? (p.priceAsOf ?? undefined) : undefined }] },
      asOf,
    );
    const cue = ageCue("position", ageDays);
    const company = p.name || p.ticker;
    return {
      key: `${h.id}~${p.ticker}`,
      ticker: shortTicker(p.ticker),
      exchange: p.exchange ?? DASH,
      name: several ? `${company} · ${h.name}` : company,
      sector: p.sector || "Other",
      shares: `${p.shares} sh`,
      price: priceOf(p.price, h.country === "IN"),
      value: usd(usdValue),
      gain: p.avgCost === 0 ? DASH : signedPct((p.price - p.avgCost) / p.avgCost, 0),
      weight: weightOf(usdValue),
      cue: cue ? `· ${cue}` : null,
      href: `${path}?position=${encodeURIComponent(`${h.id}~${p.ticker}`)}`,
      usdValue,
    };
  };

  const sorted = [...entries].sort((a, b) => b.usdValue - a.usdValue);
  const all = sorted.map(rowOf);

  const groups = new Map<string, typeof sorted>();
  for (const e of sorted) {
    const key = e.p.sector || "Other";
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  const sectorTotal = (g: typeof sorted) => g.reduce((s, e) => s + e.usdValue, 0);
  const ordered = [...groups].sort((a, b) => sectorTotal(b[1]) - sectorTotal(a[1]));

  const sectors = ordered.map(([name, g]): SectorRow => {
    const value = sectorTotal(g);
    const cost = g.reduce((s, e) => s + e.usdCost, 0);
    const share = total === 0 ? "0.0%" : `${oneDecimal((value / total) * 100)}%`;
    const summary = `${plural(g.length, "stock", "stocks")} · ${g.map((e) => shortTicker(e.p.ticker)).join(", ")}`;
    return {
      name,
      summary,
      phoneSummary: `${share} · ${summary}`,
      value: usd(value),
      gain: cost === 0 ? DASH : signedPct((value - cost) / cost, 0),
      share,
      rows: g.map(rowOf),
    };
  });

  return {
    subtitle: `${plural(entries.length, "position", "positions")} across ${plural(holdings.length, "account", "accounts")} · select a stock for details`,
    bar: ordered.map(([name, g]) => ({
      name,
      percent: total === 0 ? 0 : Number(oneDecimal((sectorTotal(g) / total) * 100)),
    })),
    sectors,
    all,
  };
}

/** Opens or closes one sector. */
export function toggleSector(open: ReadonlySet<string>, name: string): ReadonlySet<string> {
  const next = new Set(open);
  if (!next.delete(name)) next.add(name);
  return next;
}

/** "Expand all" only while every sector is collapsed, otherwise "Collapse all". */
export function sectorsControlLabel(open: ReadonlySet<string>, names: string[]): string {
  return names.some((n) => open.has(n)) ? "Collapse all" : "Expand all";
}

/** The control's action: close every sector when any is open, otherwise open them all. */
export function toggleAllSectors(open: ReadonlySet<string>, names: string[]): ReadonlySet<string> {
  return sectorsControlLabel(open, names) === "Collapse all" ? new Set() : new Set(names);
}
