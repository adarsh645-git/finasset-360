import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PositionDrawerPanel } from "@/components/holding/PositionDrawerPanel";
import type { HoldingData, PortfolioData, PositionData } from "@/lib/read-model/types";
import { buildPositionDrawer, drawerCloseHref, escClosesDrawer } from "@/lib/views/position-drawer";
import { holding, portfolio } from "../fixtures/portfolio";

const TODAY = "2026-10-14";
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
const data = (holdings: HoldingData[]): PortfolioData =>
  portfolio({
    today: TODAY,
    fx: { today: { rate: 83.4, asOf: TODAY }, history: [{ date: TODAY, rate: 83.4 }] },
    holdings,
  });

const AAPL = pos({
  ticker: "AAPL",
  shares: 30,
  avgCost: 165,
  price: 232.1,
  name: "Apple Inc.",
  exchange: "NASDAQ",
});
const JPM = pos({
  ticker: "JPM",
  shares: 15,
  avgCost: 170,
  price: 246,
  name: "JPMorgan Chase & Co.",
  sector: "Financials",
  exchange: "NYSE",
});
const fidelity = () => holding({ id: "h5", name: "Fidelity Brokerage", positions: [AAPL, JPM] });
const INFY = pos({
  ticker: "INFY.NS",
  shares: 90,
  avgCost: 1450,
  price: 1880,
  priceSource: "hand",
  priceAsOf: "2026-08-03",
  name: "Infosys Limited",
});
const zerodha = () =>
  holding({ id: "h7", name: "Zerodha", country: "IN", currency: "INR", positions: [INFY] });
const drawer = (holdings: HoldingData[], key: string) => buildPositionDrawer(data(holdings), key);

describe("position drawer", () => {
  it("PD-01 Which params open the drawer", () => {
    const archived = holding({
      id: "h6",
      archivedAt: "2026-01-01T00:00:00Z",
      positions: [pos({ ticker: "MSFT" })],
    });
    const hs = [fidelity(), archived];
    expect(drawer(hs, "h5~AAPL")?.ticker).toBe("AAPL");
    expect(drawer(hs, "h5~TSLA")).toBeNull();
    expect(drawer(hs, "h6~MSFT")).toBeNull();
    expect(drawer(hs, "h5")).toBeNull();
    // The full ticker, suffix included, is the key.
    expect(drawer([zerodha()], "h7~INFY.NS")?.ticker).toBe("INFY");
  });

  it("PD-02 Closing keeps the rest of the URL", () => {
    expect(drawerCloseHref("/assets/stocks", "range=1Y&position=h5~AAPL")).toBe("/assets/stocks?range=1Y");
    expect(drawerCloseHref("/assets/stocks", "?position=h5%7EINFY.NS&range=1Y")).toBe("/assets/stocks?range=1Y");
    expect(drawerCloseHref("/holdings/h5", "position=h5~AAPL")).toBe("/holdings/h5");
  });

  it("PD-03 Header and value", () => {
    expect(drawer([fidelity()], "h5~AAPL")).toMatchObject({
      ticker: "AAPL",
      exchange: "NASDAQ",
      identity: "Apple Inc. · Technology · held in Fidelity Brokerage",
      usd: "$6,963",
      nativeLine: "30 shares × $232",
    });
    expect(drawer([zerodha()], "h7~INFY.NS")).toMatchObject({
      ticker: "INFY",
      exchange: "NSE",
      identity: "Infosys Limited · Technology · held in Zerodha",
      usd: "$2,029",
      nativeLine: "₹1,69,200 at ₹83.40/$",
    });
    const fund = pos({
      ticker: "TDF2055",
      shares: 100,
      price: 45,
      priceSource: "hand",
      priceAsOf: TODAY,
      sector: "Other",
    });
    expect(
      drawer([holding({ id: "h8", name: "Roth IRA", positions: [fund] })], "h8~TDF2055"),
    ).toMatchObject({
      ticker: "TDF2055",
      exchange: "—",
      identity: "TDF2055 · Other · held in Roth IRA",
      usd: "$4,500",
      nativeLine: "100 shares × $45",
    });
  });

  it("PD-04 A market-priced Position's stats", () => {
    const stats = drawer([fidelity()], "h5~AAPL")!.stats;
    expect(stats.map((s) => [s.label, s.value, s.sub])).toEqual([
      ["Price", "$232", "Market price"],
      ["Shares", "30", ""],
      ["Avg cost", "$165", "Per share"],
      ["Cost basis", "$4,950", ""],
      ["Unrealized gain", "+$2,013", "+40.7%"],
      ["Weight in stocks", "65%", ""],
    ]);
  });

  it("PD-05 A hand-priced Position's stats", () => {
    const stats = drawer([zerodha()], "h7~INFY.NS")!.stats;
    expect(stats[0]).toMatchObject({ label: "Price", value: "₹1,880", sub: "as of 3 Aug" });
    expect(stats[3]).toMatchObject({ label: "Cost basis", value: "₹1,30,500" });
    expect(stats[4]).toMatchObject({ label: "Unrealized gain", value: "+₹38,700", sub: "+29.7%" });
  });

  it("PD-06 The Yahoo link rule", () => {
    const hand = (ticker: string) => pos({ ticker, priceSource: "hand", priceAsOf: TODAY });
    const link = (p: PositionData) =>
      drawer([holding({ id: "h9", positions: [p] })], `h9~${p.ticker}`)!.yahooHref;
    expect(link(pos({ ticker: "AAPL" }))).toBe("https://finance.yahoo.com/quote/AAPL");
    expect(link(pos({ ticker: "BRK.B" }))).toBe("https://finance.yahoo.com/quote/BRK.B");
    expect(link(hand("INFY.NS"))).toBe("https://finance.yahoo.com/quote/INFY.NS");
    expect(link(hand("RELIANCE.BO"))).toBe("https://finance.yahoo.com/quote/RELIANCE.BO");
    expect(link(hand("TDF2055"))).toBeNull();

    const html = renderToStaticMarkup(
      <PositionDrawerPanel drawer={drawer([fidelity()], "h5~AAPL")!} closeHref="/" />,
    );
    expect(html).toContain('href="https://finance.yahoo.com/quote/AAPL"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain("Open on Yahoo Finance ↗");
    const fund = hand("TDF2055");
    const none = renderToStaticMarkup(
      <PositionDrawerPanel
        drawer={drawer([holding({ id: "h9", positions: [fund] })], "h9~TDF2055")!}
        closeHref="/"
      />,
    );
    expect(none).not.toContain("Yahoo");
  });

  it("PD-07 View the account", () => {
    const d = drawer([fidelity()], "h5~AAPL")!;
    expect(d.account).toMatchObject({ label: "View Fidelity Brokerage", href: "/holdings/h5" });
    const html = renderToStaticMarkup(<PositionDrawerPanel drawer={d} closeHref="/assets/stocks" />);
    expect(html).toContain('href="/holdings/h5"');
    expect(html).toContain("View Fidelity Brokerage");
  });
});

describe("drawer Esc", () => {
  it("PD-02 Esc closes the drawer, but not while a modal is open over it", () => {
    expect(escClosesDrawer({ key: "Escape", modalOpen: false })).toBe(true);
    expect(escClosesDrawer({ key: "Escape", modalOpen: true })).toBe(false);
    expect(escClosesDrawer({ key: "a", modalOpen: false })).toBe(false);
  });
});
