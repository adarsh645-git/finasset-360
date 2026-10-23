import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { Document } from "@/components/Document";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { nextTheme, readTheme, resolveTheme, subscribeTheme, themeCookie, toggleTheme } from "@/lib/theme";
import { CLASS_TOKENS, COUNTRY_TOKENS } from "@/lib/tokens";

describe("theme", () => {
  it.each([
    [undefined, "light", "Dark mode"],
    ["light", "light", "Dark mode"],
    ["dark", "dark", "Light mode"],
    ["purple", "light", "Dark mode"],
  ] as const)(
    "TH-01 the server renders the remembered theme (stored %s gives %s, label %s)",
    (stored, theme, label) => {
      expect(resolveTheme(stored)).toBe(theme);
      const html = renderToStaticMarkup(
        <Document theme={resolveTheme(stored)} className="x">
          <ThemeToggle theme={resolveTheme(stored)} />
        </Document>,
      );
      expect(html).toContain(`data-theme="${theme}"`);
      expect(html).toContain(label);
    },
  );

  it.each([
    ["light", "dark"],
    ["dark", "light"],
  ] as const)("TH-02 toggling flips %s to %s and remembers it for a year", (from, to) => {
    expect(nextTheme(from)).toBe(to);
    const doc = {
      documentElement: { dataset: { theme: from } as Record<string, string> },
      cookie: "",
    };
    expect(toggleTheme(from, doc)).toBe(to);
    expect(doc.documentElement.dataset.theme).toBe(to);
    expect(doc.cookie).toBe(`theme=${to}; Path=/; Max-Age=31536000; SameSite=Lax`);
    expect(themeCookie(to)).toBe(doc.cookie);
  });

  it("TH-02 every toggle hears a flip made by another, and the next click flips from the page's theme", () => {
    const doc = {
      documentElement: { dataset: { theme: "light" } as Record<string, string> },
      cookie: "",
    };
    const heard: string[] = [];
    const off = subscribeTheme(() => heard.push(readTheme(doc, "light")));
    // The sidebar toggle flips; the top bar's toggle still holds the stale "light".
    toggleTheme("light", doc);
    expect(heard).toEqual(["dark"]);
    expect(readTheme(doc, "light")).toBe("dark");
    // Clicking the top bar toggle reads the page, so it flips back instead of re-applying dark.
    toggleTheme(readTheme(doc, "light"), doc);
    expect(doc.documentElement.dataset.theme).toBe("light");
    off();
    toggleTheme("light", doc);
    expect(heard).toHaveLength(2);
  });

  it("TH-03 each Asset Class and Country has its token colour, and no two classes share one", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    // globals.css is the one place the colour values live.
    const colorOf = (t: { cssVar: string }) =>
      new RegExp(`${t.cssVar}: (oklch\\([^)]*\\));`).exec(css)?.[1];
    expect(colorOf(CLASS_TOKENS.stocks)).toBe("oklch(0.62 0.12 255)");
    expect(colorOf(COUNTRY_TOKENS.IN)).toBe("oklch(0.72 0.12 60)");
    const colors = Object.values(CLASS_TOKENS).map(colorOf);
    expect(Object.keys(CLASS_TOKENS)).toHaveLength(6);
    expect(new Set(colors).size).toBe(6);
    expect(Object.keys(COUNTRY_TOKENS).sort()).toEqual(["IN", "US"]);
    for (const t of [...Object.values(CLASS_TOKENS), ...Object.values(COUNTRY_TOKENS)]) {
      expect(colorOf(t)).toBeDefined();
    }
  });
});
