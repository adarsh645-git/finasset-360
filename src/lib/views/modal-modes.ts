import type { AssetClassId, HoldingData, LiabilityData, PortfolioData } from "@/lib/read-model/types";

// The modal host's mode table (design.md D1, D19): URL params in, what to open
// out. Later changes append rows (add-liability, pass-summary, ...); a
// combination no row claims opens nothing.

/** Identifies one open modal; a different key means a different modal instance. */
export const modalKey = (match: ModalMatch) => `${match.mode}:${match.holding?.id ?? ""}:${match.classId ?? ""}:${match.liability?.id ?? ""}`;

/** The footer error stored for `key`'s modal, or null once another modal (or none) is open. */
export const errorFor = (stored: { key: string; message: string } | null, key: string | null) =>
  stored && stored.key === key ? stored.message : null;

/** The params the modal and the update pass own. Closing removes these and nothing else. */
export const MODAL_PARAMS = ["modal", "holding", "class", "liability", "pass", "from"] as const;

export type ModalMatch = {
  /** Picks the form: "add-asset", "edit", "update-value", "edit-positions", or a row's own id. */
  mode: string;
  title: string;
  saveLabel: string;
  /** The Holding the mode targets; null for modes that don't target one. */
  holding: HoldingData | null;
  /** add-asset only. */
  classId?: AssetClassId;
  /** The Liability a loan mode targets. */
  liability?: LiabilityData | null;
};

export type ModeRow = {
  id: string;
  match: (params: URLSearchParams, data: PortfolioData) => ModalMatch | null;
};

const CLASS_IDS: readonly AssetClassId[] = ["stocks", "realestate", "cash", "crypto", "metals", "other"];

/** The noun in titles and save labels: Stocks, Cash and Crypto are accounts, Real estate is a property. */
const NOUN: Record<AssetClassId, string> = {
  stocks: "account",
  cash: "account",
  crypto: "account",
  realestate: "property",
  metals: "asset",
  other: "asset",
};

const currentHolding = (data: PortfolioData, id: string | null) =>
  (id && data.holdings.find((h) => h.id === id && h.archivedAt === null)) || null;

const addAsset: ModeRow = {
  id: "add-asset",
  match(params) {
    if (params.get("modal") !== "add-asset") return null;
    const asked = params.get("class");
    const classId = CLASS_IDS.find((c) => c === asked) ?? "stocks";
    return {
      mode: "add-asset",
      title: "Add to portfolio",
      saveLabel: `Add ${NOUN[classId]}`,
      holding: null,
      classId,
    };
  },
};

const edit: ModeRow = {
  id: "edit",
  match(params, data) {
    if (params.get("modal") !== "edit") return null;
    const holding = currentHolding(data, params.get("holding"));
    if (!holding) return null;
    return {
      mode: "edit",
      title: `Edit ${NOUN[holding.assetClass]}`,
      saveLabel: "Save",
      holding,
    };
  },
};

const update: ModeRow = {
  id: "update",
  match(params, data) {
    if (params.get("modal") !== "update") return null;
    const holding = currentHolding(data, params.get("holding"));
    if (!holding) return null;
    const stocks = holding.assetClass === "stocks";
    return {
      mode: stocks ? "edit-positions" : "update-value",
      title: stocks ? "Edit positions" : "Update value",
      saveLabel: "Save",
      holding,
    };
  },
};

const updateBalance: ModeRow = {
  id: "update-balance",
  match(params, data) {
    if (params.get("modal") !== "update-balance") return null;
    const id = params.get("liability");
    const liability = (id && data.liabilities.find((l) => l.id === id && l.archivedAt === null)) || null;
    if (!liability) return null;
    return { mode: "update-balance", title: "Update balance", saveLabel: "Save", holding: null, liability };
  },
};

export const BUILTIN_MODES: readonly ModeRow[] = [addAsset, edit, update, updateBalance];

/** The first row that claims the params, or null (render nothing). */
export function resolveModal(
  data: PortfolioData,
  params: URLSearchParams,
  modes: readonly ModeRow[] = BUILTIN_MODES,
): ModalMatch | null {
  for (const row of modes) {
    const match = row.match(params, data);
    if (match) return match;
  }
  return null;
}

/**
 * The current URL without the modal params. Other params stay exactly as they
 * were (`position`, `range`, ...); `~` is kept literal because
 * URLSearchParams.toString() would write it as %7E.
 */
export function closeHref(pathname: string, search: string): string {
  return withoutParams(pathname, search, MODAL_PARAMS);
}

/** The URL without the named params; the rest stays as written, `~` literal. */
export function withoutParams(pathname: string, search: string, names: readonly string[]): string {
  const kept = search
    .replace(/^\?/, "")
    .replace(/%7E/gi, "~")
    .split("&")
    .filter((pair) => {
      if (pair === "") return false;
      const key = decodeURIComponent(pair.split("=")[0].replace(/\+/g, " "));
      return !names.includes(key);
    });
  return kept.length ? `${pathname}?${kept.join("&")}` : pathname;
}
