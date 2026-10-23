import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => "/",
  useRouter: () => ({ push: () => {}, refresh: () => {}, replace: () => {} }),
}));

const { ShellFrame } = await import("@/components/shell/ShellFrame");
const { buildShell } = await import("@/lib/views/shell");

const user = { email: "a@example.test", user_metadata: { full_name: "Adarsh Reddy" } };
const html = renderToStaticMarkup(
  <ShellFrame shell={buildShell({ user }, { pathname: null })} theme="light">
    <p>page</p>
  </ShellFrame>,
);

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
});
