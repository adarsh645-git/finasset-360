// One registry decides link versus plain text: a target is a link only when its
// route family exists in the app. Each later change adds its own family here
// in its first ticket.
export type RouteFamily =
  | "overview"
  | "assets"
  | "assetClass"
  | "holding"
  | "liabilities"
  | "liability"
  | "growth"
  | "goals";

export const EXISTING_ROUTES: ReadonlySet<RouteFamily> = new Set<RouteFamily>([
  "overview",
  "assets",
  "assetClass",
  "holding",
  "growth",
  "goals",
]);

/** "+ Add" buttons and the first-run card's action render only when adding exists. */
export const ADDING = true;

/** The add modal opens on the page the User is on, keeping the page's other params. */
export function addAssetHref(pathname: string, search?: string | URLSearchParams | null): string {
  const params = new URLSearchParams(search ?? undefined);
  params.set("modal", "add-asset");
  return `${pathname}?${params.toString()}`;
}

export type LinkTarget =
  | { kind: "overview" }
  | { kind: "assets" }
  | { kind: "assetClass"; id: string }
  | { kind: "holding"; id: string }
  | { kind: "liabilities" }
  | { kind: "liability"; id: string }
  | { kind: "growth" }
  | { kind: "goals" };

function pathOf(target: LinkTarget): string {
  switch (target.kind) {
    case "overview":
      return "/";
    case "assets":
      return "/assets";
    case "assetClass":
      return `/assets/${target.id}`;
    case "holding":
      return `/holdings/${target.id}`;
    case "liabilities":
      return "/liabilities";
    case "liability":
      return `/liabilities/${target.id}`;
    case "growth":
      return "/growth";
    case "goals":
      return "/goals";
  }
}

/** The path when the target's route exists, otherwise null (render plain text). */
export function hrefFor(
  target: LinkTarget,
  existing: ReadonlySet<RouteFamily> = EXISTING_ROUTES,
): string | null {
  return existing.has(target.kind) ? pathOf(target) : null;
}
