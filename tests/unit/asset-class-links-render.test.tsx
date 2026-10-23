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
const { HoldingDetail } = await import("@/components/holding/HoldingDetail");
const { buildShell } = await import("@/lib/views/shell");
const { buildOverview } = await import("@/lib/views/overview");
const { buildHoldingDetail } = await import("@/lib/views/holding-detail");
const { holding, portfolio } = await import("../fixtures/portfolio");

const user = { email: "a@example.test", user_metadata: { full_name: "Adarsh Reddy" } };
const data = portfolio({
  today: "2026-10-13",
  holdings: [
    holding({ id: "h1", assetClass: "stocks", currentValue: 412_000 }),
    holding({ id: "h2", assetClass: "cash", currentValue: 20_000 }),
    holding({ id: "h3", assetClass: "realestate", name: "Pune apartment", currentValue: 90_000 }),
  ],
});

const tag = (html: string, href: string) => {
  const match = html.match(new RegExp(`<a [^>]*href="${href}"[^>]*>`));
  expect(match, href).not.toBeNull();
  return match![0];
};

describe("class links", () => {
  it("AC-19 sidebar class rows link, and the class page's row is selected", () => {
    pathname = "/assets/stocks";
    const html = renderToStaticMarkup(
      <ShellFrame shell={buildShell({ user, portfolio: data }, { pathname })} theme="light">
        <p>page</p>
      </ShellFrame>,
    );
    expect(tag(html, "/assets/stocks")).toContain('aria-current="page"');
    expect(tag(html, "/assets/cash")).not.toContain("aria-current");
  });

  it("AC-20 Allocation rows link to their class page", () => {
    const html = renderToStaticMarkup(<Overview overview={buildOverview(data, { range: "All" })} />);
    expect(html).toMatch(/<a [^>]*href="\/assets\/stocks"[^>]*>(?:(?!<\/a>)[\s\S])*Stocks/);
    expect(html).toMatch(/<a [^>]*href="\/assets\/realestate"[^>]*>(?:(?!<\/a>)[\s\S])*Real estate/);
  });

  it("AC-21 Holding detail breadcrumb links Assets and the class", () => {
    const html = renderToStaticMarkup(<HoldingDetail detail={buildHoldingDetail(data, { holdingId: "h3" })!} />);
    expect(html).toMatch(/<a [^>]*href="\/assets"[^>]*>Assets<\/a>/);
    expect(html).toMatch(/<a [^>]*href="\/assets\/realestate"[^>]*>Real estate<\/a>/);
  });
});
