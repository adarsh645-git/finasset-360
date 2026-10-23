import { ASSET_CLASSES, fxRateOn, setTwelveMonthChange } from "@/lib/calc";
import { compact, share, signedCompact, usd } from "@/lib/format";
import type {
  AssetClassId,
  HoldingData,
  PortfolioData,
} from "@/lib/read-model/types";
import { CLASS_TOKENS } from "@/lib/tokens";
import { countNoun } from "@/lib/views/class-nouns";
import { fxRatesOf, usableItems } from "@/lib/views/fx";
import { buildHoldingRow, type HoldingRow } from "@/lib/views/holding-row";
import {
  ADDING,
  EXISTING_ROUTES,
  addAssetHref,
  type RouteFamily,
} from "@/lib/views/links";
import { calcClassId, historyItem } from "@/lib/views/shell";

export type AssetGroup = {
  /** Prefixed with the grouping, so keys never collide across groupings. */
  key: string;
  label: string;
  /** CSS variable of the class colour. */
  dot: string;
  /** "3 accounts". */
  count: string;
  share: string;
  total: string;
  collapsed: boolean;
  /** Empty while collapsed. */
  rows: HoldingRow[];
};

export type AssetTile = {
  id: "all" | AssetClassId;
  label: string;
  /** Compact total: "$100K". */
  total: string;
  /** "7 items", or "25% · 3 properties". */
  detail: string;
  selected: boolean;
};

export type Grouping = "class" | "country" | "none";

export type AssetsView = {
  /** `subtitle` is null with no Holdings. */
  header: { total: string; subtitle: string | null };
  /** "+ Add asset"; null while adding is off. */
  addHref: string | null;
  /** The first-step card, in place of the list; null when there are Holdings. */
  empty: { message: string; addHref: string | null } | null;
  /** "All assets" then one per class with Holdings; empty with no Holdings. */
  tiles: AssetTile[];
  groups: AssetGroup[];
  /** "No holdings match." when the filter and search leave nothing. */
  noMatch: string | null;
  /** "Expand all" only when every group is collapsed. */
  toggleAll: "Collapse all" | "Expand all";
};

export type AssetsState = {
  /** The selected class tile; null or absent shows every class. */
  filter?: AssetClassId | null;
  grouping?: Grouping;
  query?: string;
  /** Keys of collapsed groups. */
  collapsed?: ReadonlySet<string>;
};

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
// The token table lists the classes in the fixed display order.
const CLASS_ORDER = Object.keys(CLASS_TOKENS) as AssetClassId[];

export const toggleGroup = (
  collapsed: ReadonlySet<string>,
  key: string,
): Set<string> => {
  const next = new Set(collapsed);
  if (!next.delete(key)) next.add(key);
  return next;
};

/** Selecting the selected tile again, or "All assets", clears the filter. */
export const toggleFilter = (
  current: AssetClassId | null,
  picked: "all" | AssetClassId,
): AssetClassId | null =>
  picked === "all" || picked === current ? null : picked;

const normalise = (text: string | null | undefined) =>
  (text ?? "").trim().toLowerCase();

function matches(h: HoldingData, query: string): boolean {
  return [
    h.name,
    h.description,
    h.city,
    ...h.positions.flatMap((p) => [p.ticker, p.name]),
  ].some((field) => normalise(field).includes(query));
}

/** Collapse every group of the view, or expand them all when each is already collapsed. */
export const toggleAllGroups = (view: AssetsView): Set<string> =>
  view.toggleAll === "Expand all"
    ? new Set()
    : new Set(view.groups.map((g) => g.key));

export function buildAssetsView(
  data: PortfolioData,
  {
    filter = null,
    grouping = "class",
    query = "",
    collapsed = new Set<string>(),
    existing = EXISTING_ROUTES,
    adding = ADDING,
  }: AssetsState & {
    existing?: ReadonlySet<RouteFamily>;
    adding?: boolean;
  } = {},
): AssetsView {
  const { today } = data;
  const rates = fxRatesOf(data);
  const current = usableItems(data.holdings, rates).filter(
    (h) => h.archivedAt === null,
  );
  const fxRate = rates.length ? fxRateOn(rates, today).rate : 1;
  const addHref = adding ? addAssetHref("/assets") : null;

  if (current.length === 0) {
    return {
      header: { total: usd(0), subtitle: null },
      addHref,
      empty: { message: "No accounts or assets yet", addHref },
      tiles: [],
      groups: [],
      noMatch: null,
      toggleAll: "Collapse all",
    };
  }

  const badge = grouping === "country" ? "class" : "country";
  const rows = new Map(
    current.map((h) => [
      h.id,
      buildHoldingRow(h, { today, fxRate, badge, existing }),
    ]),
  );
  const total = [...rows.values()].reduce((s, r) => s + r.usdValue, 0);

  const classes = CLASS_ORDER.filter((id) =>
    current.some((h) => h.assetClass === id),
  );
  const change = setTwelveMonthChange(
    current.map(historyItem),
    { fxRates: rates, today },
    "holdings",
  );
  const n = current.length;
  const m = classes.length;
  const subtitle = `${n} ${plural(n, "account or asset", "accounts & assets")} in ${m} ${plural(m, "class", "classes")} · ${signedCompact(change?.amount)} in 12 mo`;

  const classTotal = (id: AssetClassId) =>
    current
      .filter((h) => h.assetClass === id)
      .reduce((s, h) => s + rows.get(h.id)!.usdValue, 0);
  const tiles: AssetTile[] = [
    {
      id: "all",
      label: "All assets",
      total: compact(total),
      detail: `${n} ${plural(n, "item", "items")}`,
      selected: filter === null,
    },
    ...classes.map((id) => {
      const sum = classTotal(id);
      return {
        id,
        label: ASSET_CLASSES.find((c) => c.id === calcClassId(id))!.name,
        total: compact(sum),
        detail: `${share(sum, total)} · ${countNoun(id, current.filter((h) => h.assetClass === id).length)}`,
        selected: filter === id,
      };
    }),
  ];

  const needle = normalise(query);
  const visible = current
    .filter((h) => filter === null || h.assetClass === filter)
    .filter((h) => needle === "" || matches(h, needle));
  const byValue = (list: HoldingData[]) =>
    list.map((h) => rows.get(h.id)!).sort((a, b) => b.usdValue - a.usdValue);

  type Bucket = {
    key: string;
    label: string;
    dot: string;
    count: string;
    list: HoldingData[];
  };
  const buckets: Bucket[] = [];
  if (grouping === "class") {
    for (const id of classes) {
      const list = visible.filter((h) => h.assetClass === id);
      if (list.length)
        buckets.push({
          key: `class:${id}`,
          label: ASSET_CLASSES.find((c) => c.id === calcClassId(id))!.name,
          dot: CLASS_TOKENS[id].cssVar,
          count: countNoun(id, list.length),
          list,
        });
    }
  } else if (grouping === "country") {
    for (const [code, label] of [
      ["US", "United States"],
      ["IN", "India"],
    ] as const) {
      const list = visible.filter((h) => h.country === code);
      if (list.length)
        buckets.push({
          key: `country:${code}`,
          label,
          dot: "--ink3",
          count: `${list.length} ${plural(list.length, "item", "items")}`,
          list,
        });
    }
  } else if (visible.length) {
    buckets.push({
      key: "none:all",
      label: "All holdings",
      dot: "--ink3",
      count: `${visible.length} ${plural(visible.length, "item", "items")}`,
      list: visible,
    });
  }

  const searching = needle !== "";
  const groups: AssetGroup[] = buckets.map(({ list, ...b }) => {
    const sorted = byValue(list);
    const sum = sorted.reduce((s, r) => s + r.usdValue, 0);
    const isCollapsed = !searching && collapsed.has(b.key);
    return {
      ...b,
      share: share(sum, total),
      total: usd(sum),
      collapsed: isCollapsed,
      rows: isCollapsed ? [] : sorted,
    };
  });

  return {
    header: { total: usd(total), subtitle },
    addHref,
    empty: null,
    tiles,
    groups,
    noMatch: groups.length === 0 ? "No holdings match." : null,
    toggleAll:
      groups.length > 0 && groups.every((g) => g.collapsed)
        ? "Expand all"
        : "Collapse all",
  };
}
