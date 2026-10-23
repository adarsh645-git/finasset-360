import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => "/liabilities/stu",
  useRouter: () => ({ push: () => {}, refresh: () => {}, replace: () => {} }),
}));

const { ShellFrame } = await import("@/components/shell/ShellFrame");
const { Overview } = await import("@/components/overview/Overview");
const { LiabilitiesPage } = await import("@/components/liabilities/LiabilitiesPage");
const { buildShell, markActive } = await import("@/lib/views/shell");
const { buildOverview } = await import("@/lib/views/overview");
const { buildLiabilities } = await import("@/lib/views/liabilities");
const { holding, liability, portfolio } = await import("../fixtures/portfolio");

const TODAY = "2026-10-13";
const user = { email: "a@example.test", user_metadata: { full_name: "Adarsh Reddy" } };
const val = (date: string, value: number) => ({ date, value, source: "user" as const });

const data = () =>
  portfolio({
    today: TODAY,
    holdings: [holding({ currentValue: 5_000, valuations: [val(TODAY, 5_000)] })],
    liabilities: [
      liability({
        id: "stu",
        name: "Student loan",
        currentBalance: 8_000,
        principal: 10_000,
        monthlyPayment: 200,
        valuations: [val("2026-08-27", 8_000)],
      }),
    ],
  });

describe("liabilities links", () => {
  it("LB-13 incoming links point at the Liabilities pages", () => {
    const shellHtml = renderToStaticMarkup(
      <ShellFrame
        shell={markActive(buildShell({ user, portfolio: data() }, { pathname: null }), "/liabilities/stu")}
        theme="light"
      >
        <p>page</p>
      </ShellFrame>,
    );
    for (const form of ["sidebar", "tabs", "bottom"]) {
      const nav = shellHtml.match(new RegExp(`<nav[^>]*data-nav="${form}"[^>]*>([\\s\\S]*?)</nav>`))![1];
      const link = [...nav.matchAll(/<a [^>]*>/g)].map((m) => m[0]).find((a) => a.includes('data-label="Liabilities"'))!;
      expect(link).toContain('href="/liabilities"');
      expect(link).toContain('aria-current="page"');
    }

    const html = renderToStaticMarkup(<Overview overview={buildOverview(data(), { range: "All" })} />);
    expect(html).toContain('href="/liabilities"');
    expect(html).toContain('href="/liabilities/stu"');
  });
});

describe("liabilities page render", () => {
  it("LB-06 renders rows as links with the header and stats", () => {
    const html = renderToStaticMarkup(<LiabilitiesPage view={buildLiabilities(data())} />);
    expect(html).toContain("$8,000");
    expect(html).toContain("Student loan");
    expect(html).toContain('href="/liabilities/stu"');
    expect(html).toContain("var(--loan-1)");
    expect(html).toContain("Monthly payments");
    expect(html).toContain("· 47 days old");
    expect(html).toContain("+ Add loan");
    expect(html).toContain("Payoff timeline");
  });

  it("LB-12 the empty state shows No loans and an Add loan button, with no chart", () => {
    const html = renderToStaticMarkup(
      <LiabilitiesPage view={buildLiabilities(portfolio({ today: TODAY }))} />,
    );
    expect(html).toContain("No loans");
    expect(html).toMatch(/<a [^>]*href="\/liabilities\?modal=add-liability"[^>]*>Add loan/);
    expect(html).not.toContain("<svg");
  });
});
