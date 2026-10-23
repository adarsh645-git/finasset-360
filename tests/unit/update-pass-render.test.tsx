import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: () => {}, refresh: () => {}, replace: () => {} }),
}));
import { renderToStaticMarkup } from "react-dom/server";
import { ModalFrame } from "@/components/modal/ModalFrame";
import { PassFooter } from "@/components/modal/PassFooter";
import { Overview } from "@/components/overview/Overview";
import { buildOverview } from "@/lib/views/overview";
import { holding, portfolio } from "../fixtures/portfolio";

const TODAY = "2026-10-13";
const val = (date: string, value: number) => ({ date, value, source: "user" as const });
const old = (id: string, name: string, date: string) =>
  holding({ id, name, assetClass: "cash", currentValue: 1000, valuations: [val(date, 1000)] });

const render = (data: ReturnType<typeof portfolio>) =>
  renderToStaticMarkup(<Overview overview={buildOverview(data, { range: "All" })} />);

describe("Update all on the Needs updating card", () => {
  it("UP-01 the card offers Update all (N) as a link to step 1", () => {
    const html = render(
      portfolio({ today: TODAY, holdings: [old("a", "A cash", "2026-07-15"), old("b", "B cash", "2026-08-30")] }),
    );
    expect(html).toContain("Update all (2)");
    expect(html).toMatch(/href="\/\?modal=update&amp;holding=a&amp;pass=1&amp;from=2000"/);
  });

  it("UP-02 no Stale items, no card and no Update all", () => {
    const html = render(portfolio({ today: TODAY, holdings: [old("a", "A cash", TODAY)] }));
    expect(html).not.toContain("Update all");
    expect(html).not.toContain("Needs updating");
  });
});

describe("pass footer", () => {
  const html = renderToStaticMarkup(
    <ModalFrame
      title="Update value"
      saveLabel="Save & next"
      error={null}
      saving={false}
      formId="modal-form"
      onClose={() => {}}
      footerSlot={<PassFooter counter="2 of 3" onSkip={() => {}} />}
    >
      <form id="modal-form" />
    </ModalFrame>,
  );

  it("UP-08 Save & next submits the form and Skip does not", () => {
    expect(html).toMatch(/<button type="submit" form="modal-form"[^>]*>Save &amp; next<\/button>/);
    expect(html).toMatch(/<button type="button"[^>]*>Skip<\/button>/);
    expect(html).toContain("2 of 3");
  });
});
