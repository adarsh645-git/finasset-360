import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => "/holdings/h1",
  useRouter: () => ({ push: () => {}, refresh: () => {}, replace: () => {} }),
  useSearchParams: () => new URLSearchParams("range=3Y"),
}));

const { ShellFrame } = await import("@/components/shell/ShellFrame");
const { buildShell } = await import("@/lib/views/shell");
const { holding, portfolio } = await import("../fixtures/portfolio");

const user = { email: "a@example.test", user_metadata: {} };
const render = (adding?: boolean) =>
  renderToStaticMarkup(
    <ShellFrame
      shell={buildShell(
        { user, portfolio: portfolio({ holdings: [holding({ currentValue: 5 })] }) },
        { pathname: null, ...(adding === undefined ? {} : { adding }) },
      )}
      theme="light"
    >
      <p>page</p>
    </ShellFrame>,
  );

describe("shell add buttons", () => {
  it("HE-26 + Add account or asset opens the modal on the current page", () => {
    const html = render();
    const href = 'href="/holdings/h1\\?range=3Y&amp;modal=add-asset"';
    expect(html).toMatch(new RegExp(`<a [^>]*${href}[^>]*>\\+ Add account or asset`));
    expect(html).toMatch(new RegExp(`<a [^>]*${href}[^>]*>\\+ Add<`));
  });

  it("HE-26 with adding off there are no Add buttons", () => {
    expect(render(false)).not.toContain("+ Add");
  });
});
