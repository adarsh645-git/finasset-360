import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Overview } from "@/components/overview/Overview";
import { EXISTING_ROUTES, hrefFor } from "@/lib/views/links";
import { buildOverview } from "@/lib/views/overview";
import { holding, liability, portfolio } from "../fixtures/portfolio";

describe("holding entry links", () => {
  it("HD-22 Holding rows link to their detail page and Liability rows link to Loan detail", () => {
    expect(EXISTING_ROUTES.has("holding")).toBe(true);
    expect(hrefFor({ kind: "holding", id: "h1" })).toBe("/holdings/h1");
    expect(hrefFor({ kind: "holding", id: "h2" })).toBe("/holdings/h2");
    expect(hrefFor({ kind: "liability", id: "l1" })).toBe("/liabilities/l1");
  });

  it("HD-22 the Overview Equity and Needs updating rows link a Holding to its page", () => {
    const val = (date: string, value: number) => ({ date, value, source: "user" as const });
    const data = portfolio({
      today: "2026-10-13",
      holdings: [
        holding({
          id: "pune",
          name: "Pune apartment",
          assetClass: "realestate",
          currentValue: 74_340,
          valuations: [val("2025-10-13", 70_000), val("2025-10-13", 74_340)],
        }),
      ],
      liabilities: [
        liability({
          id: "loan",
          name: "Pune loan",
          currentBalance: 41_127,
          linkedHoldingId: "pune",
          valuations: [val("2025-10-13", 44_787), val("2025-10-13", 41_127)],
        }),
      ],
    });
    const overview = buildOverview(data, { range: "All" });
    expect(overview.equity?.rows.map((r) => r.href)).toEqual(["/holdings/pune"]);
    const stale = overview.needsUpdating?.rows ?? [];
    expect(stale.find((r) => r.href === "/holdings/pune")).toBeDefined();
    expect(stale.filter((r) => r.href?.startsWith("/holdings/")).length).toBe(1);
    const html = renderToStaticMarkup(<Overview overview={overview} />);
    const links = [...html.matchAll(/<a [^>]*href="(\/holdings\/pune)"/g)];
    expect(links.length).toBeGreaterThanOrEqual(2);
  });

  it("HE-27 the first-run card has its Add button pointing at the add modal", () => {
    const overview = buildOverview(portfolio(), { range: "All" });
    expect(overview.addHref).toBe("/?modal=add-asset");
    const html = renderToStaticMarkup(<Overview overview={overview} />);
    expect(html).toContain("Add your first account or asset");
    expect(html).toMatch(/<a [^>]*href="\/\?modal=add-asset"/);
    expect(html).toMatch(/<a [^>]*href="\/\?modal=add-liability"[^>]*>or a loan/);
  });

  it("HE-27 without adding the first-run card has no button", () => {
    const overview = buildOverview(portfolio(), { range: "All", adding: false });
    expect(overview.addHref).toBeNull();
    expect(renderToStaticMarkup(<Overview overview={overview} />)).not.toContain("modal=add-asset");
  });
});
