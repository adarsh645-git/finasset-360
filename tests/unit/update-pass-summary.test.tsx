import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: () => {}, refresh: () => {}, replace: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}));
import { renderToStaticMarkup } from "react-dom/server";
import { PassSummary } from "@/components/modal/PassSummary";
import { BUILTIN_MODES, resolveModal } from "@/lib/views/modal-modes";
import { netWorthNow, passSummary } from "@/lib/views/update-pass";
import { holding, portfolio } from "../fixtures/portfolio";

const TODAY = "2026-10-13";
const cash = (id: string, value: number, date = TODAY) =>
  holding({ id, name: id, assetClass: "cash", currentValue: value, valuations: [{ date, value, source: "user" as const }] });
const stale = (id: string) => cash(id, 10, "2026-07-01");
const withNow = (now: number, extra: ReturnType<typeof holding>[] = []) =>
  portfolio({ today: TODAY, holdings: [cash("main", now - extra.length * 10), ...extra] });

describe("passSummary", () => {
  it.each([
    [1284300, 1291050, "Net worth $1,284,300 → $1,291,050 (+$6,750)"],
    [1291050, 1288900, "Net worth $1,291,050 → $1,288,900 (−$2,150)"],
  ])("UP-15 the Net Worth line from %i to %i", (from, now, line) => {
    const data = withNow(now);
    expect(netWorthNow(data)).toBe(now);
    expect(passSummary(data, from, TODAY).line).toBe(line);
  });

  it("UP-15 the three figures reconcile in whole dollars", () => {
    const data = portfolio({ today: TODAY, holdings: [cash("a", 100.6)] });
    expect(passSummary(data, 100, TODAY).line).toBe("Net worth $100 → $101 (+$1)");
  });

  it.each([
    [0, null],
    [1, "1 item still needs updating"],
    [2, "2 items still need updating"],
  ])("UP-16 %i skipped items", (n, note) => {
    const data = withNow(1000, Array.from({ length: n }, (_, i) => stale(`s${i}`)));
    expect(passSummary(data, 1000, TODAY).stillStale).toBe(note);
  });

  it("UP-17 a missing from shows only today's Net Worth", () => {
    const data = withNow(1291050);
    expect(passSummary(data, null, TODAY).line).toBe("Net worth $1,291,050");
  });
});

describe("pass-summary mode", () => {
  const data = withNow(1291050);
  const modes = (q: string) => resolveModal(data, new URLSearchParams(q), BUILTIN_MODES);

  it("UP-15 is a built-in mode that opens from the last step's target", () => {
    expect(modes("modal=pass-summary&from=5")?.mode).toBe("pass-summary");
  });

  it("UP-17 an invalid from renders only today's Net Worth", () => {
    const match = modes("modal=pass-summary&from=abc")!;
    const html = renderToStaticMarkup(
      <PassSummary match={match} data={data} formId="modal-form" setBusy={() => {}} setError={() => {}} onSaved={() => {}} />,
    );
    expect(html).toContain("Net worth $1,291,050");
    expect(html).not.toContain("→");
  });

  it("UP-15 renders the line with the arrow and change", () => {
    const match = modes("modal=pass-summary&from=1284300")!;
    const html = renderToStaticMarkup(
      <PassSummary match={match} data={data} formId="modal-form" setBusy={() => {}} setError={() => {}} onSaved={() => {}} />,
    );
    expect(html).toContain("Net worth $1,284,300 → $1,291,050 (+$6,750)");
  });
});
