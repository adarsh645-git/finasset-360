import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

let pathname = "/";
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: () => {}, refresh: () => {}, replace: () => {} }),
}));

const { ShellFrame } = await import("@/components/shell/ShellFrame");
const { Overview } = await import("@/components/overview/Overview");
const { buildShell } = await import("@/lib/views/shell");
const { buildOverview } = await import("@/lib/views/overview");
const { holding, portfolio } = await import("../fixtures/portfolio");

const user = { email: "a@example.test", user_metadata: { full_name: "Adarsh Reddy" } };
const data = portfolio({
  today: "2026-10-13",
  holdings: [holding({ id: "h1", assetClass: "stocks", currentValue: 412_000 })],
});

function nav(form: string, at: string): string {
  pathname = at;
  const html = renderToStaticMarkup(
    <ShellFrame shell={buildShell({ user, portfolio: data }, { pathname: null })} theme="light">
      <p>page</p>
    </ShellFrame>,
  );
  const match = html.match(new RegExp(`<nav[^>]*data-nav="${form}"[^>]*>([\\s\\S]*?)</nav>`));
  expect(match, `nav ${form}`).not.toBeNull();
  return match![1];
}

const assetsEntry = (navHtml: string): string => {
  const tag = [...navHtml.matchAll(/<(a|span)\b[^>]*data-label="Assets"[^>]*>/g)][0];
  expect(tag).toBeDefined();
  return tag[0];
};

describe("assets nav item", () => {
  it.each([
    ["/", false],
    ["/assets", true],
    ["/assets/stocks", true],
    ["/holdings/h1", true],
  ])("AS-19 on %s the Assets item links to /assets and active is %s", (at, active) => {
    for (const form of ["sidebar", "tabs", "bottom"]) {
      const tag = assetsEntry(nav(form, at));
      expect(tag).toMatch(/^<a /);
      expect(tag).toContain('href="/assets"');
      expect(tag.includes('aria-current="page"')).toBe(active);
    }
  });
});

describe("total assets stat card", () => {
  it("AS-20 links to /assets", () => {
    const html = renderToStaticMarkup(<Overview overview={buildOverview(data, { range: "All" })} />);
    expect(html).toMatch(/<a [^>]*href="\/assets"[^>]*>(?:(?!<\/a>)[\s\S])*Total assets/);
  });
});
