import { firstNameOrEmail } from "@/lib/auth/display-name";
import { hrefFor, type LinkTarget } from "@/lib/views/links";

export type NavKey = "overview" | "assets" | "liabilities" | "growth" | "goals";

export type NavItem = {
  key: NavKey;
  label: string;
  href: string | null;
  active: boolean;
};

export type Shell = {
  userName: string;
  items: NavItem[];
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
  return { ...shell, items: shell.items.map((item) => ({ ...item, active: item.key === active })) };
}

type ShellUser = { email?: string; user_metadata: Record<string, unknown> };

/** Everything the three nav forms render; `pathname: null` leaves every item inactive. */
export function buildShell(
  input: { user: ShellUser },
  { pathname }: { pathname: string | null },
): Shell {
  const shell: Shell = {
    userName: firstNameOrEmail(input.user),
    items: NAV.map(({ key, label, target }) => ({
      key,
      label,
      href: hrefFor(target),
      active: false,
    })),
  };
  return markActive(shell, pathname);
}
