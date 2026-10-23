import { firstNameOrEmail } from "@/lib/auth/display-name";
import {
  ASSET_CLASSES,
  netWorthOn,
  yearBefore,
  type Country,
  type HistoryItem,
} from "@/lib/calc";
import { compact, DASH, signed, signedPct, usd } from "@/lib/format";
import type { AssetClassId, HoldingData, LiabilityData, PortfolioData } from "@/lib/read-model/types";
import { CLASS_TOKENS } from "@/lib/tokens";
import { fxRatesOf, usableItems } from "@/lib/views/fx";
import { ADDING, EXISTING_ROUTES, hrefFor, type LinkTarget, type RouteFamily } from "@/lib/views/links";

export type NavKey = "overview" | "assets" | "liabilities" | "growth" | "goals";

export type NavItem = {
  key: NavKey;
  label: string;
  /** Compact total (Assets and Liabilities only). */
  value: string | null;
  href: string | null;
  active: boolean;
};

export type ClassRow = {
  id: string;
  name: string;
  /** CSS variable of the class colour dot. */
  dot: string;
  value: string;
  href: string | null;
  /** The class page being viewed. */
  selected: boolean;
};

export type NetWorthBlock = {
  total: string;
  /** "+$48,200 (+4.3%) 12 mo", or "—" without a year of history. */
  change: string;
  tone: "up" | "down" | null;
};

export type Shell = {
  userName: string;
  netWorth: NetWorthBlock;
  items: NavItem[];
  /** Classes with current Holdings, in the fixed order; empty hides the list. */
  classes: ClassRow[];
  /** Whether the "+ Add" buttons show (the link registry's ADDING flag). */
  adding: boolean;
};

const NAV: { key: NavKey; label: string; target: LinkTarget }[] = [
  { key: "overview", label: "Overview", target: { kind: "overview" } },
  { key: "assets", label: "Assets", target: { kind: "assets" } },
  { key: "liabilities", label: "Liabilities", target: { kind: "liabilities" } },
  { key: "growth", label: "Growth", target: { kind: "growth" } },
  { key: "goals", label: "Goals", target: { kind: "goals" } },
];

/** Which nav item a path belongs to: Assets covers /assets, class pages and Holding detail. */
export function activeNavKey(pathname: string | null): NavKey | null {
  if (pathname === null) return null;
  const first = pathname.split("/").filter(Boolean)[0];
  switch (first) {
    case undefined:
      return "overview";
    case "assets":
    case "holdings":
      return "assets";
    case "liabilities":
      return "liabilities";
    case "growth":
      return "growth";
    case "goals":
      return "goals";
    default:
      return null;
  }
}

export function markActive(shell: Shell, pathname: string | null): Shell {
  const active = activeNavKey(pathname);
  const slug = pathname?.match(/^\/assets\/([^/?#]+)/)?.[1];
  return {
    ...shell,
    items: shell.items.map((item) => ({ ...item, active: item.key === active })),
    classes: shell.classes.map((row) => ({ ...row, selected: row.id === slug })),
  };
}

type ShellUser = { email?: string; user_metadata: Record<string, unknown> };

// The read model and calc/ name two classes differently; class pages use calc's ids.
const CLASS_ORDER: { id: AssetClassId; slug: string }[] = [
  { id: "realestate", slug: "real-estate" },
  { id: "stocks", slug: "stocks" },
  { id: "cash", slug: "cash" },
  { id: "crypto", slug: "crypto" },
  { id: "metals", slug: "metals" },
  { id: "other", slug: "vehicles-and-other" },
];

export const calcCountry = (code: "US" | "IN"): Country => (code === "US" ? "US" : "India");

export const calcClassId = (id: AssetClassId) => CLASS_ORDER.find((c) => c.id === id)!.slug;

export function historyItem(item: HoldingData | LiabilityData): HistoryItem {
  const archived = item.archivedAt !== null;
  return {
    country: calcCountry(item.country),
    valuations: item.valuations.map((v) => ({ date: v.date, amount: v.value })),
    // An archived item counts up to its archive day and has no current value.
    currentValue: archived
      ? undefined
      : "currentValue" in item
        ? item.currentValue
        : item.currentBalance,
    archivedOn: archived ? item.archivedAt!.slice(0, 10) : undefined,
  };
}

function changeText(now: number, then: number): string {
  const amount = signed(now - then);
  return then > 0 ? `${amount} (${signedPct((now - then) / then)}) 12 mo` : `${amount} 12 mo`;
}

/** Everything the three nav forms render; `pathname: null` leaves every item inactive. */
export function buildShell(
  input: { user: ShellUser; portfolio: PortfolioData },
  {
    pathname,
    existing = EXISTING_ROUTES,
    adding = ADDING,
  }: { pathname: string | null; existing?: ReadonlySet<RouteFamily>; adding?: boolean },
): Shell {
  const { portfolio } = input;
  const { today } = portfolio;
  const rates = fxRatesOf(portfolio);

  const holdings = usableItems(portfolio.holdings, rates);
  const liabilities = usableItems(portfolio.liabilities, rates);
  const held = holdings.map(historyItem);
  const owedItems = liabilities.map(historyItem);
  const worth = (h: HistoryItem[], l: HistoryItem[], date = today) =>
    netWorthOn({ holdings: h, liabilities: l }, rates, date, today);

  const assets = worth(held, []);
  const owed = -worth([], owedItems);
  const netWorth = assets - owed;

  const start = yearBefore(today);
  const earliest = [...portfolio.holdings, ...portfolio.liabilities]
    .flatMap((i) => i.valuations.map((v) => v.date))
    .sort()[0];
  const hasYear = earliest !== undefined && earliest <= start;
  const then = hasYear ? worth(held, owedItems, start) : 0;

  const current = holdings.filter((h) => h.archivedAt === null);
  const classes: ClassRow[] = CLASS_ORDER.flatMap(({ id, slug }) => {
    const inClass = current.filter((h) => h.assetClass === id);
    if (inClass.length === 0) return [];
    return [
      {
        id: slug,
        name: ASSET_CLASSES.find((c) => c.id === slug)!.name,
        dot: CLASS_TOKENS[id].cssVar,
        value: compact(worth(inClass.map(historyItem), [])),
        href: hrefFor({ kind: "assetClass", id: slug }, existing),
        selected: false,
      },
    ];
  });

  const shell: Shell = {
    userName: firstNameOrEmail(input.user),
    netWorth: {
      total: usd(netWorth),
      change: hasYear ? changeText(netWorth, then) : DASH,
      tone: hasYear && netWorth !== then ? (netWorth > then ? "up" : "down") : null,
    },
    items: NAV.map(({ key, label, target }) => ({
      key,
      label,
      value:
        key === "assets"
          ? compact(assets)
          : key === "liabilities"
            ? compact(owed)
            : key === "goals"
              ? String(portfolio.goals.length)
              : null,
      href: hrefFor(target, existing),
      active: false,
    })),
    classes,
    adding,
  };
  return markActive(shell, pathname);
}
