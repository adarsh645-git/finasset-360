import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { HoldingDetail } from "@/components/holding/HoldingDetail";
import type { HoldingData, PortfolioData, PositionData } from "@/lib/read-model/types";
import { buildHoldingDetail } from "@/lib/views/holding-detail";
import { holding, portfolio } from "../fixtures/portfolio";

// HoldingDetail Delete button reads the router and path.
vi.mock("next/navigation", () => ({
  usePathname: () => "/holdings/h1",
  useRouter: () => ({ push: () => {}, refresh: () => {}, replace: () => {} }),
}));

const TODAY = "2026-10-14";
const data = (holdings: HoldingData[]): PortfolioData =>
  portfolio({
    today: TODAY,
    fx: {
      today: { rate: 83.4, asOf: TODAY },
      history: [
        { date: "2025-10-14", rate: 82.1 },
        { date: TODAY, rate: 83.4 },
      ],
    },
    holdings,
  });
const detail = (h: HoldingData) => buildHoldingDetail(data([h]), { holdingId: h.id })!;

const pos = (over: Partial<PositionData>): PositionData => ({
  ticker: "AAPL",
  shares: 1,
  avgCost: 1,
  price: 1,
  priceSource: "market",
  priceAsOf: null,
  name: "",
  sector: "Technology",
  exchange: null,
  ...over,
});
const AAPL = pos({ ticker: "AAPL", shares: 30, avgCost: 165, price: 232.1, name: "Apple Inc." });
const JPM = pos({
  ticker: "JPM",
  shares: 15,
  avgCost: 170,
  price: 246,
  name: "JPMorgan Chase & Co.",
  sector: "Financials",
});
// Listed in the opposite order of value, to prove the sort.
const brokerage = () => holding({ id: "h1", assetClass: "stocks", positions: [JPM, AAPL] });

describe("stocks detail", () => {
  it("HD-12 Cost basis and gain come from the Positions", () => {
    const stats = detail(brokerage()).stats;
    expect(stats.find((s) => s.label === "Cost basis")).toMatchObject({ value: "$7,500", sub: "What you paid" });
    expect(stats.find((s) => s.label === "Unrealized gain")).toMatchObject({ value: "+$3,153", sub: "+42.0%" });
  });

  it("HD-13 Positions rows are sorted by value with weight and gain", () => {
    const { stocks } = detail(brokerage());
    expect(stocks!.subheading).toBe("2 positions");
    expect(stocks!.positions[0]).toMatchObject({
      ticker: "AAPL",
      line: "30 sh · Apple Inc.",
      price: "$232",
      value: "$6,963",
      gain: "+41%",
      weight: "65%",
    });
    expect(stocks!.positions[1]).toMatchObject({
      ticker: "JPM",
      line: "15 sh · JPMorgan Chase & Co.",
      price: "$246",
      value: "$3,690",
      gain: "+45%",
      weight: "35%",
    });
    const html = renderToStaticMarkup(<HoldingDetail detail={detail(brokerage())} />);
    expect(html).toContain("Positions in this account");
    expect(html).toContain("By sector");
    expect(html).toContain("@[820px]:grid-cols");
  });

  it("HD-14 By sector lists shares to one decimal with tickers", () => {
    expect(detail(brokerage()).stocks!.sectors).toEqual([
      { sector: "Technology", share: "65.4%", tickers: "AAPL" },
      { sector: "Financials", share: "34.6%", tickers: "JPM" },
    ]);
  });

  it("HD-14 an exact half still shows one decimal", () => {
    const half = holding({
      id: "h6",
      assetClass: "stocks",
      positions: [pos({ ticker: "AAPL", shares: 1, price: 100 }), pos({ ticker: "JPM", shares: 1, price: 100, sector: "Financials" })],
    });
    expect(detail(half).stocks!.sectors.map((s) => s.share)).toEqual(["50.0%", "50.0%"]);
  });

  const indian = () =>
    holding({
      id: "h5",
      assetClass: "stocks",
      country: "IN",
      currency: "INR",
      positions: [
        pos({
          ticker: "INFY.NS",
          shares: 90,
          avgCost: 1400,
          price: 1500,
          priceSource: "hand",
          priceAsOf: "2026-08-03",
          name: "Infosys Limited",
        }),
        pos({
          ticker: "TCS.NS",
          shares: 10,
          avgCost: 3500,
          price: 3600,
          priceSource: "hand",
          priceAsOf: "2026-10-01",
          name: "Tata Consultancy Services Limited",
        }),
      ],
    });

  it("HD-15 each row points to the drawer param", () => {
    const row = detail(indian()).stocks!.positions.find((r) => r.ticker === "INFY")!;
    expect(row.href).toBe("/holdings/h5?position=h5~INFY.NS");
    const html = renderToStaticMarkup(<HoldingDetail detail={detail(indian())} />);
    expect(html).toContain('href="/holdings/h5?position=h5~INFY.NS"');
  });

  it("HD-16 a stale Hand Price is flagged on its row", () => {
    const rows = detail(indian()).stocks!.positions;
    expect(rows.find((r) => r.ticker === "INFY")!.line).toBe("90 sh · Infosys Limited · price 72 days old");
    expect(rows.find((r) => r.ticker === "TCS")!.line).toBe("10 sh · Tata Consultancy Services Limited");
  });
});
