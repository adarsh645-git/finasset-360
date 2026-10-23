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

function render(count: number): string {
  const goals = Array.from({ length: count }, (_, i) => ({
    id: `g${i}`,
    name: null,
    targetUsd: (i + 1) * 1000,
  }));
  const data = portfolio({ holdings: [holding({ currentValue: 5 })], goals });
  return renderToStaticMarkup(
    <ShellFrame shell={buildShell({ user, portfolio: data }, { pathname: null })} theme="light">
      <p>page</p>
    </ShellFrame>,
  );
}

function goalsEntry(html: string, form: string): string {
  const nav = html.match(new RegExp(`<nav[^>]*data-nav="${form}"[^>]*>([\\s\\S]*?)</nav>`))![1];
  const entry = nav.match(/<a [^>]*data-label="Goals"[^>]*>[\s\S]*?<\/a>/);
  expect(entry, `Goals link in ${form}`).not.toBeNull();
  return entry![0];
}

describe("goals nav", () => {
  it.each([
    [0, "0"],
    [4, "4"],
  ])("GO-17 with %s Goals the nav links to /goals and shows %s", (count, shown) => {
    const html = render(count);
    for (const form of ["sidebar", "tabs", "bottom"]) {
      expect(goalsEntry(html, form)).toContain('href="/goals"');
    }
    for (const form of ["sidebar", "bottom"]) {
      expect(goalsEntry(html, form)).toMatch(new RegExp(`>${shown}</span>`));
    }
  });
});
