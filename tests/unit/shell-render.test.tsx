import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => "/",
  useRouter: () => ({ push: () => {}, refresh: () => {}, replace: () => {} }),
}));

const { ShellFrame } = await import("@/components/shell/ShellFrame");
const { buildShell } = await import("@/lib/views/shell");

const { holding, portfolio } = await import("../fixtures/portfolio");

const user = { email: "a@example.test", user_metadata: { full_name: "Adarsh Reddy" } };
function render(data: ReturnType<typeof portfolio>): string {
  return renderToStaticMarkup(
    <ShellFrame shell={buildShell({ user, portfolio: data }, { pathname: null, adding: false })} theme="light">
      <p>page</p>
    </ShellFrame>,
  );
}

const html = render(portfolio({ holdings: [holding({ currentValue: 412_000 })] }));

const LABELS = ["Overview", "Assets", "Liabilities", "Growth", "Goals"];

function navHtml(form: string): string {
  const nav = html.match(new RegExp(`<nav[^>]*data-nav="${form}"[^>]*>([\\s\\S]*?)</nav>`));
  expect(nav, `nav ${form}`).not.toBeNull();
  return nav![1];
}

describe("shell render", () => {
  it("SH-02 all three nav forms list the same items with Overview active", () => {
    for (const form of ["sidebar", "tabs", "bottom"]) {
      const nav = navHtml(form);
      expect([...nav.matchAll(/data-label="([^"]+)"/g)].map((m) => m[1])).toEqual(LABELS);
      expect(nav.match(/aria-current="page"/g)).toHaveLength(1);
      expect(nav).toMatch(/data-label="Overview"[^>]*aria-current="page"|aria-current="page"[^>]*data-label="Overview"/);
    }
  });

  it("SH-10 the shell shows the first name and a Sign out action", () => {
    expect(html).toContain("Adarsh");
    expect(html).not.toContain("Reddy");
    expect(html).toContain("Sign out");
  });

  it("SH-08 the five nav items and the class rows are links and nothing offers adding", () => {
    expect(html).toMatch(/<a [^>]*href="\/"[^>]*data-label="Overview"|<a [^>]*data-label="Overview"[^>]*href="\/"/);
    expect(html.match(/<a /g)?.length).toBe(16); // Overview, Assets, Liabilities, Growth and Goals in the sidebar, tabs and bottom bar, plus the Stocks row
    expect(html).toMatch(/<a [^>]*data-class="stocks"/);
    expect(html).toContain("Stocks");
    expect(html).not.toContain("+ Add");
    expect(html).not.toContain("Add account");
  });

  it("SH-04 the totals show in the sidebar and the phone tab bar", () => {
    expect(navHtml("sidebar")).toContain("$412K");
    expect(navHtml("bottom")).toContain("$412K");
    expect(html).toContain("$412,000");
  });

  it("SH-11 an empty Portfolio's shell shows $0 and — with no Asset classes heading", () => {
    const empty = render(portfolio());
    expect(empty).toContain("$0");
    expect(empty).toContain("—");
    expect(empty).not.toContain("Asset classes");
  });
});
