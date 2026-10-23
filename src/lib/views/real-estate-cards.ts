import { usd } from "@/lib/format";
import type { HoldingRow } from "@/lib/views/holding-row";

export type DistributionRow = {
  label: string;
  /** Names of the Holdings in the group, joined with ", ". */
  names: string;
  value: string;
  /** One decimal: "80.0%". */
  share: string;
  color: string;
};

export type DistributionCard = {
  title: string;
  subtitle: string;
  /** Stacked bar segments, in row order. */
  bar: { label: string; share: number; color: string }[];
  rows: DistributionRow[];
};

export type RealEstateCards = { byType: DistributionCard; byLocation: DistributionCard };

export const NOT_SET = "Not set";

// Property type colours are fixed per type; locations cycle through four neutral tones.
const TYPE_COLORS: Record<string, string> = {
  Residential: "var(--cls-realestate)",
  Land: "var(--cls-metals)",
  "REIT / fund": "var(--cls-stocks)",
  Commercial: "var(--cls-crypto)",
};
const TYPE_FALLBACK = "var(--cls-other)";
const LOCATION_TONES = [55, 40, 28, 18].map((p) => `color-mix(in oklab, var(--ink) ${p}%, transparent)`);

type Entry = { name: string; usdValue: number; key: string };

function card(
  title: string,
  subtitle: string,
  entries: Entry[],
  colorOf: (label: string, index: number) => string,
): DistributionCard {
  const groups = new Map<string, Entry[]>();
  for (const e of entries) groups.set(e.key, [...(groups.get(e.key) ?? []), e]);
  const total = entries.reduce((sum, e) => sum + e.usdValue, 0);
  const sorted = [...groups]
    .map(([label, members]) => ({ label, members, value: members.reduce((s, m) => s + m.usdValue, 0) }))
    .sort((a, b) => b.value - a.value);
  const rows = sorted.map((g, i) => ({
    label: g.label,
    names: g.members.map((m) => m.name).join(", "),
    value: usd(g.value),
    share: (total === 0 ? "0.0" : ((g.value / total) * 100).toFixed(1)) + "%",
    color: colorOf(g.label, i),
  }));
  return {
    title,
    subtitle,
    bar: sorted.map((g, i) => ({ label: g.label, share: total === 0 ? 0 : g.value / total, color: rows[i]!.color })),
    rows,
  };
}

/** By property type and By location for the current Real estate Holdings, with their built rows. */
export function buildRealEstateCards(
  holdings: { id: string; name: string; propertyType: string | null; city: string | null }[],
  rows: HoldingRow[],
): RealEstateCards {
  const value = new Map(rows.map((r) => [r.id, r.usdValue]));
  const entries = (keyOf: (h: (typeof holdings)[number]) => string): Entry[] =>
    holdings.map((h) => ({ name: h.name, usdValue: value.get(h.id) ?? 0, key: keyOf(h) }));
  const n = holdings.length;
  return {
    byType: card(
      "By property type",
      `${n} ${n === 1 ? "property" : "properties"}`,
      entries((h) => h.propertyType || "Other"),
      (label) => TYPE_COLORS[label] ?? TYPE_FALLBACK,
    ),
    byLocation: card(
      "By location",
      "City or market",
      entries((h) => h.city?.trim() || NOT_SET),
      (_, i) => LOCATION_TONES[i % LOCATION_TONES.length]!,
    ),
  };
}
