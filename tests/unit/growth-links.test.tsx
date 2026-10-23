import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => "/growth",
  useRouter: () => ({ push: () => {}, refresh: () => {}, replace: () => {} }),
}));

const { ShellFrame } = await import("@/components/shell/ShellFrame");
const { Overview } = await import("@/components/overview/Overview");
const { buildShell, markActive } = await import("@/lib/views/shell");
const { buildOverview } = await import("@/lib/views/overview");
const { holding, liability, portfolio } = await import("../fixtures/portfolio");

const user = { email: "a@example.test", user_metadata: { full_name: "Adarsh Reddy" } };

describe("growth links", () => {
  it("GR-18 the Growth item links to /growth in every nav form and is active", () => {
    const data = portfolio({ holdings: [holding({ currentValue: 5 })] });
    const html = renderToStaticMarkup(
      <ShellFrame
        shell={markActive(buildShell({ user, portfolio: data }, { pathname: null }), "/growth")}
        theme="light"
      >
        <p>page</p>
      </ShellFrame>,
    );
    for (const form of ["sidebar", "tabs", "bottom"]) {
      const nav = html.match(new RegExp(`<nav[^>]*data-nav="${form}"[^>]*>([\\s\\S]*?)</nav>`))![1]!;
      const entry = nav.match(/<a [^>]*data-label="Growth"[^>]*>/);
      expect(entry, `Growth link in ${form}`).not.toBeNull();
      expect(entry![0]).toContain('href="/growth"');
      expect(entry![0]).toContain('aria-current="page"');
    }
  });

  it("GR-19 the Equity built stat card links to /growth", () => {
    const data = portfolio({
      holdings: [holding({ id: "home", currentValue: 300_000 })],
      liabilities: [liability({ currentBalance: 120_000, linkedHoldingId: "home" })],
    });
    const html = renderToStaticMarkup(<Overview overview={buildOverview(data, { range: "All" })} />);
    const card = html.match(/<a [^>]*>(?:(?!<\/a>)[\s\S])*Equity built[\s\S]*?<\/a>/);

    expect(card).not.toBeNull();
    expect(card![0]).toContain('href="/growth"');
  });
});
