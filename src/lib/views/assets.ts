import { ASSET_CLASSES, fxRateOn, setTwelveMonthChange } from "@/lib/calc";
import { share, signedCompact, usd } from "@/lib/format";
import type { AssetClassId, PortfolioData } from "@/lib/read-model/types";
import { CLASS_TOKENS } from "@/lib/tokens";
import { countNoun } from "@/lib/views/class-nouns";
import { fxRatesOf, usableItems } from "@/lib/views/fx";
import { buildHoldingRow, type HoldingRow } from "@/lib/views/holding-row";
import { ADDING, EXISTING_ROUTES, addAssetHref, type RouteFamily } from "@/lib/views/links";
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

export type AssetsView = {
  /** `subtitle` is null with no Holdings. */
  header: { total: string; subtitle: string | null };
  /** "+ Add asset"; null while adding is off. */
  addHref: string | null;
  /** The first-step card, in place of the list; null when there are Holdings. */
  empty: { message: string; addHref: string | null } | null;
  groups: AssetGroup[];
  /** "Expand all" only when every group is collapsed. */
  toggleAll: "Collapse all" | "Expand all";
};

export type AssetsState = {
  /** Keys of collapsed groups. */
  collapsed?: ReadonlySet<string>;
};

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
// The token table lists the classes in the fixed display order.
const CLASS_ORDER = Object.keys(CLASS_TOKENS) as AssetClassId[];

export const toggleGroup = (collapsed: ReadonlySet<string>, key: string): Set<string> => {
  const next = new Set(collapsed);
  if (!next.delete(key)) next.add(key);
  return next;
};

/** Collapse every group of the view, or expand them all when each is already collapsed. */
export const toggleAllGroups = (view: AssetsView): Set<string> =>
  view.toggleAll === "Expand all" ? new Set() : new Set(view.groups.map((g) => g.key));

export function buildAssetsView(
  data: PortfolioData,
  {
    collapsed = new Set<string>(),
    existing = EXISTING_ROUTES,
    adding = ADDING,
  }: AssetsState & { existing?: ReadonlySet<RouteFamily>; adding?: boolean } = {},
): AssetsView {
  const { today } = data;
  const rates = fxRatesOf(data);
  const current = usableItems(data.holdings, rates).filter((h) => h.archivedAt === null);
  const fxRate = rates.length ? fxRateOn(rates, today).rate : 1;
  const addHref = adding ? addAssetHref("/assets") : null;

  if (current.length === 0) {
    return {
      header: { total: usd(0), subtitle: null },
      addHref,
      empty: { message: "No accounts or assets yet", addHref },
      groups: [],
      toggleAll: "Collapse all",
    };
  }

  const rows = new Map(current.map((h) => [h.id, buildHoldingRow(h, { today, fxRate, existing })]));
  const total = [...rows.values()].reduce((s, r) => s + r.usdValue, 0);

  const classes = CLASS_ORDER.filter((id) => current.some((h) => h.assetClass === id));
  const change = setTwelveMonthChange(current.map(historyItem), { fxRates: rates, today }, "holdings");
  const n = current.length;
  const m = classes.length;
  const subtitle = `${n} ${plural(n, "account or asset", "accounts & assets")} in ${m} ${plural(m, "class", "classes")} · ${signedCompact(change?.amount)} in 12 mo`;

  const groups: AssetGroup[] = classes.map((id) => {
    const key = `class:${id}`;
    const inClass = current
      .filter((h) => h.assetClass === id)
      .map((h) => rows.get(h.id)!)
      .sort((a, b) => b.usdValue - a.usdValue);
    const sum = inClass.reduce((s, r) => s + r.usdValue, 0);
    const isCollapsed = collapsed.has(key);
    return {
      key,
      label: ASSET_CLASSES.find((c) => c.id === calcClassId(id))!.name,
      dot: CLASS_TOKENS[id].cssVar,
      count: countNoun(id, inClass.length),
      share: share(sum, total),
      total: usd(sum),
      collapsed: isCollapsed,
      rows: isCollapsed ? [] : inClass,
    };
  });

  return {
    header: { total: usd(total), subtitle },
    addHref,
    empty: null,
    groups,
    toggleAll: groups.every((g) => g.collapsed) ? "Expand all" : "Collapse all",
  };
}
