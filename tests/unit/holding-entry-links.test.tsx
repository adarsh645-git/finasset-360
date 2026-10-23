import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Overview } from "@/components/overview/Overview";
import { EXISTING_ROUTES, hrefFor } from "@/lib/views/links";
import { buildOverview } from "@/lib/views/overview";
import { portfolio } from "../fixtures/portfolio";

describe("holding entry links", () => {
  it("HD-22 Holding rows link to their detail page and Liability rows stay plain text", () => {
    expect(EXISTING_ROUTES.has("holding")).toBe(true);
    expect(hrefFor({ kind: "holding", id: "h1" })).toBe("/holdings/h1");
    expect(hrefFor({ kind: "holding", id: "h2" })).toBe("/holdings/h2");
    expect(hrefFor({ kind: "liability", id: "l1" })).toBeNull();
  });

  it("HE-27 the first-run card has its Add button pointing at the add modal", () => {
    const overview = buildOverview(portfolio(), { range: "All" });
    expect(overview.addHref).toBe("/?modal=add-asset");
    const html = renderToStaticMarkup(<Overview overview={overview} />);
    expect(html).toContain("Add your first account or asset");
    expect(html).toMatch(/<a [^>]*href="\/\?modal=add-asset"/);
    expect(html).not.toMatch(/or a loan/);
  });

  it("HE-27 without adding the first-run card has no button", () => {
    const overview = buildOverview(portfolio(), { range: "All", adding: false });
    expect(overview.addHref).toBeNull();
    expect(renderToStaticMarkup(<Overview overview={overview} />)).not.toContain("modal=add-asset");
  });
});
