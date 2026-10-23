import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => "/assets/stocks",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: () => {}, refresh: () => {}, replace: () => {} }),
}));

const { AssetClassPage } = await import("@/components/assets/AssetClassPage");
const { buildAssetClassView, classIdOfSlug } = await import("@/lib/views/asset-class");
const { holding, portfolio } = await import("../fixtures/portfolio");

const data = portfolio({
  today: "2026-10-13",
  holdings: [
    holding({
      id: "fid",
      assetClass: "stocks",
      name: "Fidelity",
      currentValue: 6963,
      positions: [
        {
          ticker: "AAPL",
          shares: 30,
          avgCost: 165,
          price: 232.1,
          priceSource: "market",
          priceAsOf: null,
          name: "Apple Inc.",
          sector: "Technology",
          exchange: "NASDAQ",
        },
      ],
    }),
    holding({ id: "c", assetClass: "cash", currentValue: 500 }),
  ],
});
const html = (slug: string) =>
  renderToStaticMarkup(<AssetClassPage view={buildAssetClassView(data, classIdOfSlug(slug)!)} />);

describe("Positions card markup", () => {
  it("AC-09 only the Stocks page renders the card, between the chart and Holdings", () => {
    const stocks = html("stocks");
    expect(stocks).toContain("select a stock for details");
    expect(stocks.indexOf("over time")).toBeLessThan(stocks.indexOf("select a stock for details"));
    expect(stocks.indexOf("select a stock for details")).toBeLessThan(stocks.indexOf('id="class-holdings"'));
    expect(html("cash")).not.toContain("select a stock for details");
  });

  it("AC-11 sectors start collapsed under an Expand all control", () => {
    const stocks = html("stocks");
    expect(stocks).toContain("Expand all");
    expect(stocks).toContain("1 stock · AAPL");
    expect(stocks).not.toContain("Apple Inc. · Fidelity");
  });

  it("AC-10 offers both views", () => {
    expect(html("stocks")).toContain("By sector");
    expect(html("stocks")).toContain("All positions");
  });
});
