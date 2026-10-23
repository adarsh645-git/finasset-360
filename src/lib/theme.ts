import { ONE_YEAR_SECONDS } from "@/lib/chart/projection";

export type Theme = "light" | "dark";

export const THEME_COOKIE = "theme";

/** The stored cookie value to a theme. Anything but "dark" is light. */
export function resolveTheme(cookie: string | undefined | null): Theme {
  return cookie === "dark" ? "dark" : "light";
}

export function nextTheme(current: Theme): Theme {
  return current === "dark" ? "light" : "dark";
}

export function themeCookie(theme: Theme): string {
  return `${THEME_COOKIE}=${theme}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
}

/** The sidebar toggle's label names the theme it switches to. */
export function themeLabel(theme: Theme): string {
  return theme === "dark" ? "Light mode" : "Dark mode";
}

/** The top bar's short label. */
export function themeShortLabel(theme: Theme): string {
  return theme === "dark" ? "Light" : "Dark";
}

type ThemeDocument = {
  documentElement: { dataset: Record<string, string | undefined> };
  cookie: string;
};

/** Flips the theme on the page at once and remembers it for a year. */
export function toggleTheme(current: Theme, doc: ThemeDocument): Theme {
  const next = nextTheme(current);
  doc.documentElement.dataset.theme = next;
  doc.cookie = themeCookie(next);
  listeners.forEach((l) => l());
  return next;
}

const listeners = new Set<() => void>();

/** Every ThemeToggle subscribes, so a flip in one reaches the others. Returns the unsubscribe. */
export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

/** The theme the page is showing; `fallback` before the page has set one (server render). */
export function readTheme(
  doc: Pick<ThemeDocument, "documentElement"> | undefined,
  fallback: Theme,
): Theme {
  const set = doc?.documentElement.dataset.theme;
  return set === "dark" || set === "light" ? set : fallback;
}
