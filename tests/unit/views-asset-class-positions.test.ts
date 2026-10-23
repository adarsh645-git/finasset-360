import { describe, expect, it } from "vitest";
import type { HoldingData, PositionData } from "@/lib/read-model/types";
import {
  buildAssetClassView,
  classIdOfSlug,
  sectorsControlLabel,
  toggleAllSectors,
  toggleSector,
} from "@/lib/views/asset-class";
import { holding, portfolio } from "../fixtures/portfolio";

const TODAY = "2026-10-13";

const pos = (over: Partial<PositionData>): PositionData => ({
  ticker: "AAPL",
  shares: 1,
  avgCost: 1,
  price: 1,
  priceSource: "market",
  priceAsOf: null,
  name: "Apple Inc.",
  sector: "Technology",
  exchange: "NASDAQ",
  ...over,
});

const stk = (id: string, name: string, positions: PositionData[], over: Partial<HoldingData> = {}) =>
  holding({
    id,
    assetClass: "stocks",
    name,
    positions,
    currentValue: positions.reduce((s, p) => s + p.shares * p.price, 0),
    ...over,
  });

const AAPL = pos({ ticker: "AAPL", shares: 30, avgCost: 165, price: 232.1 });
const MSFT = pos({ ticker: "MSFT", shares: 12, avgCost: 310, price: 428.4, name: "Microsoft Corp." });
const JPM = pos({
  ticker: "JPM",
  shares: 15,
  avgCost: 170,
  price: 246,
  name: "JPMorgan Chase",
  sector: "Financials",
  exchange: "NYSE",
});
const INFY = pos({
  ticker: "INFY.NS",
  shares: 100,
  avgCost: 1252,
  price: 1623.2,
  name: "Infosys",
  exchange: "NSE",
});

const fidelity = stk("fid", "Fidelity Brokerage", [AAPL, MSFT, JPM]);
const zerodha = stk("zer", "Zerodha", [INFY], { country: "IN", currency: "INR" });

const stocks = (holdings: HoldingData[]) =>
  buildAssetClassView(portfolio({ today: TODAY, holdings }), classIdOfSlug("stocks")!);

describe("which cards render", () => {
  const all = [
    fidelity,
    zerodha,
    holding({ id: "c", assetClass: "cash", currentValue: 100 }),
    holding({ id: "r", assetClass: "realestate", currentValue: 100 }),
    holding({ id: "o", assetClass: "other", currentValue: 100 }),
  ];
  it.each([
    ["stocks", true],
    ["cash", false],
    ["other", false],
    ["realestate", false],
    ["crypto", false],
    ["metals", false],
  ])("AC-09 %s has a Positions card: %s", (slug, has) => {
    const v = buildAssetClassView(portfolio({ today: TODAY, holdings: all }), classIdOfSlug(slug)!);
    expect(v.positions !== null).toBe(has);
  });

  it("AC-09 an empty Stocks page has no card", () => {
    expect(stocks([]).positions).toBeNull();
  });
});

describe("sector rows", () => {
  const card = stocks([fidelity, zerodha]).positions!;

  it("AC-10 subtitle, sector rows and distribution bar", () => {
    expect(card.subtitle).toBe("4 positions across 2 accounts · select a stock for details");
    const [tech, fin] = card.sectors;
    expect(tech).toMatchObject({
      name: "Technology",
      summary: "3 stocks · AAPL, MSFT, INFY",
      value: "$14,133",
      gain: "+38%",
      share: "79.3%",
    });
    expect(fin).toMatchObject({
      name: "Financials",
      summary: "1 stock · JPM",
      value: "$3,690",
      gain: "+45%",
      share: "20.7%",
    });
    expect(card.sectors).toHaveLength(2);
    expect(card.bar.map((s) => [s.name, s.percent])).toEqual([
      ["Technology", 79.3],
      ["Financials", 20.7],
    ]);
  });

  it("AC-10 singular subtitle", () => {
    expect(stocks([stk("a", "Solo", [AAPL])]).positions!.subtitle).toBe(
      "1 position across 1 account · select a stock for details",
    );
  });

  it("AC-11 sectors start collapsed and the control toggles them all", () => {
    const keys = card.sectors.map((s) => s.name);
    let open: ReadonlySet<string> = new Set();
    expect(sectorsControlLabel(open, keys)).toBe("Expand all");
    open = toggleSector(open, "Technology");
    expect(open.has("Technology")).toBe(true);
    expect(sectorsControlLabel(open, keys)).toBe("Collapse all");
    open = toggleAllSectors(open, keys);
    expect([...open]).toEqual([]);
    expect(sectorsControlLabel(open, keys)).toBe("Expand all");
    open = toggleAllSectors(open, keys);
    expect(keys.every((k) => open.has(k))).toBe(true);
    expect(sectorsControlLabel(open, keys)).toBe("Collapse all");
  });

  it("AC-12 a Position row inside a sector", () => {
    const aapl = card.sectors[0]!.rows[0]!;
    expect(aapl).toMatchObject({
      ticker: "AAPL",
      name: "Apple Inc. · Fidelity Brokerage",
      shares: "30 sh",
      price: "$232.10",
      value: "$6,963",
      gain: "+41%",
      weight: "39.1%",
    });
    expect(card.sectors[0]!.rows.map((r) => r.ticker)).toEqual(["AAPL", "MSFT", "INFY"]);
  });

  it("AC-13 phone subtitle leads with the share", () => {
    expect(card.sectors[0]!.phoneSummary).toBe("79.3% · 3 stocks · AAPL, MSFT, INFY");
  });
});

describe("all positions", () => {
  it("AC-14 one row per Position per Holding, largest first", () => {
    const nvda = pos({ ticker: "NVDA", shares: 10, avgCost: 100, price: 150, name: "NVIDIA" });
    const v = stocks([
      stk("fid", "Fidelity Brokerage", [pos({ ticker: "AAPL", shares: 10, avgCost: 100, price: 200 })]),
      stk("roth", "Roth IRA", [pos({ ticker: "AAPL", shares: 20, avgCost: 100, price: 200 }), nvda]),
    ]);
    const rows = v.positions!.all;
    expect(rows.map((r) => r.ticker)).toEqual(["AAPL", "AAPL", "NVDA"]);
    expect(rows[0]!.name.endsWith("· Roth IRA")).toBe(true);
    expect(rows[1]!.name.endsWith("· Fidelity Brokerage")).toBe(true);
    expect(rows.map((r) => r.usdValue)).toEqual([4000, 2000, 1500]);
  });

  it("AC-15 exchange, name, Sector and price", () => {
    const zomato = pos({
      ticker: "ZOMATO.NS",
      shares: 10,
      avgCost: 200,
      price: 245,
      priceSource: "hand",
      priceAsOf: TODAY,
      name: "Zomato",
      sector: "Consumer Discretionary",
      exchange: "NSE",
    });
    const tdf = pos({
      ticker: "TDF2055",
      shares: 1,
      avgCost: 30,
      price: 31.2,
      priceSource: "hand",
      priceAsOf: TODAY,
      name: "TDF2055",
      sector: "Other",
      exchange: null,
    });
    const v = stocks([
      stk("a", "Acct", [AAPL]),
      stk("z", "Zerodha", [zomato], { country: "IN", currency: "INR" }),
      stk("t", "401k", [tdf]),
    ]);
    const by = Object.fromEntries(v.positions!.all.map((r) => [r.ticker, r]));
    expect(by.AAPL).toMatchObject({ exchange: "NASDAQ", sector: "Technology", price: "$232.10" });
    expect(by.ZOMATO).toMatchObject({ exchange: "NSE", sector: "Consumer Discretionary", price: "₹245" });
    expect(by.ZOMATO!.name.startsWith("Zomato")).toBe(true);
    expect(by.TDF2055).toMatchObject({ exchange: "—", sector: "Other", price: "$31.20" });
    expect(by.TDF2055!.name.startsWith("TDF2055")).toBe(true);
  });

  it("AC-16 a hand-priced Position carries its age cue", () => {
    const old = pos({ ticker: "OLD", shares: 1, price: 10, priceSource: "hand", priceAsOf: "2026-08-27" });
    const rows = stocks([stk("a", "Acct", [old, AAPL])]).positions!.all;
    expect(rows.find((r) => r.ticker === "OLD")!.cue).toBe("· price 47 days old");
    expect(rows.find((r) => r.ticker === "AAPL")!.cue).toBeNull();
  });
});

describe("opening the drawer", () => {
  it("AC-17 rows target the position drawer in both views", () => {
    const card = stocks([fidelity, zerodha]).positions!;
    const href = `/assets/stocks?position=${encodeURIComponent("zer~INFY.NS")}`;
    const inSector = card.sectors.flatMap((s) => s.rows).find((r) => r.ticker === "INFY")!;
    const flat = card.all.find((r) => r.ticker === "INFY")!;
    expect(inSector.href).toBe(href);
    expect(flat.href).toBe(href);
  });
});
