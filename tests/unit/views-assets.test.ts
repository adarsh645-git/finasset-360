import { describe, expect, it } from "vitest";
import type { HoldingData, PositionData } from "@/lib/read-model/types";
import {
  buildAssetsView,
  toggleAllGroups,
  toggleFilter,
  toggleGroup,
} from "@/lib/views/assets";
import { holding, portfolio } from "../fixtures/portfolio";

const TODAY = "2026-10-13";
const YEAR_AGO = "2025-10-13";

const pos = (over: Partial<PositionData> = {}): PositionData => ({
  ticker: "AAPL",
  shares: 1,
  avgCost: 1,
  price: 1,
  priceSource: "market",
  priceAsOf: null,
  name: "Apple Inc.",
  sector: "Technology",
  exchange: "XNAS",
  ...over,
});

let n = 0;
const h = (over: Partial<HoldingData>) => holding({ id: `h${++n}`, ...over });
const view = (holdings: HoldingData[], state = {}) =>
  buildAssetsView(portfolio({ today: TODAY, holdings }), state);
const rowOf = (holdings: HoldingData[], id: string) =>
  view(holdings)
    .groups.flatMap((g) => g.rows)
    .find((r) => r.id === id)!;

describe("assets header", () => {
  it("AS-01 the header shows the total, the counts and the set 12-month change", () => {
    const v = view([
      h({
        assetClass: "stocks",
        currentValue: 200_000,
        valuations: [{ date: YEAR_AGO, value: 170_000, source: "user" }],
      }),
      h({
        assetClass: "stocks",
        currentValue: 100_000,
        valuations: [{ date: YEAR_AGO, value: 90_000, source: "user" }],
      }),
      h({
        assetClass: "cash",
        currentValue: 62_900,
        valuations: [{ date: YEAR_AGO, value: 58_600, source: "user" }],
      }),
      h({
        assetClass: "cash",
        currentValue: 20_000,
        valuations: [{ date: YEAR_AGO, value: 20_000, source: "user" }],
      }),
      h({
        assetClass: "realestate",
        currentValue: 30_000,
        valuations: [{ date: YEAR_AGO, value: 30_000, source: "user" }],
      }),
    ]);
    expect(v.header.total).toBe("$412,900");
    expect(v.header.subtitle).toBe(
      "5 accounts & assets in 3 classes · +$44.3K in 12 mo",
    );
  });

  it("AS-02 no Holding a year old reads a dash for the change", () => {
    const v = view([
      h({
        assetClass: "cash",
        currentValue: 500,
        valuations: [{ date: "2026-08-01", value: 400, source: "user" }],
      }),
    ]);
    expect(v.header.subtitle).toBe(
      "1 account or asset in 1 class · — in 12 mo",
    );
  });
});

describe("assets groups", () => {
  it.each([
    ["stocks", 1, "1 account"],
    ["cash", 3, "3 accounts"],
    ["crypto", 2, "2 accounts"],
    ["realestate", 1, "1 property"],
    ["realestate", 3, "3 properties"],
    ["metals", 2, "2 assets"],
    ["other", 1, "1 asset"],
  ] as const)("AS-03 %s x%i reads %s", (assetClass, count, label) => {
    const v = view(
      Array.from({ length: count }, () => h({ assetClass, currentValue: 10 })),
    );
    expect(v.groups).toHaveLength(1);
    expect(v.groups[0].count).toBe(label);
  });

  it("AS-04 groups follow the fixed order, with shares of the total and rows by value", () => {
    const small = h({
      assetClass: "cash",
      name: "Small",
      currentValue: 10_000,
    });
    const big = h({ assetClass: "cash", name: "Big", currentValue: 30_000 });
    const house = h({
      assetClass: "realestate",
      name: "House",
      currentValue: 100_000,
    });
    const rest = h({
      assetClass: "stocks",
      name: "Rest",
      currentValue: 260_000,
    });
    const v = view([small, big, rest, house]);

    expect(v.groups.map((g) => g.label)).toEqual([
      "Real estate",
      "Stocks",
      "Cash",
    ]);
    const cash = v.groups[2];
    expect(cash.share).toBe("10%");
    expect(cash.total).toBe("$40,000");
    expect(cash.rows.map((r) => r.name)).toEqual(["Big", "Small"]);
  });
});

describe("holding rows", () => {
  it("AS-05 a US Stocks row summarises its Positions and gain", () => {
    const stocks = h({
      assetClass: "stocks",
      currentValue: 28_914,
      positions: ["AAPL", "MSFT", "JPM", "XOM", "JNJ", "AMZN"].map((ticker) =>
        pos({ ticker, shares: 1, avgCost: 19_535 / 6 }),
      ),
    });
    const row = rowOf([stocks], stocks.id);
    expect(row.subtitle).toBe("6 positions · AAPL, MSFT, JPM…");
    expect(row.native).toBe("");
    expect(row.gain).toBe("+$9.4K · +48%");
    expect(row.badge).toBe("US");
    expect(row.usd).toBe("$28,914");
  });

  it("AS-05 an India Stocks row strips suffixes and shows rupees", () => {
    const zerodha = h({
      assetClass: "stocks",
      country: "IN",
      currency: "INR",
      currentValue: 800_000,
      positions: [
        pos({ ticker: "RELIANCE.NS", avgCost: 100_000 }),
        pos({ ticker: "INFY.NS", avgCost: 100_000 }),
      ],
    });
    const row = rowOf([zerodha], zerodha.id);
    expect(row.subtitle).toBe("2 positions · RELIANCE, INFY");
    expect(row.native).toBe("₹8,00,000");
    expect(row.usd).toBe("$10,000");
    expect(row.badge).toBe("IN");
    expect(row.gain).toMatch(/^\+\$\d/);
  });

  it("AS-05 a Real estate row reads property type and city, or just the type", () => {
    const pune = h({
      assetClass: "realestate",
      country: "IN",
      currency: "INR",
      propertyType: "Residential",
      city: "Pune",
      currentValue: 6_200_000,
      costBasis: 4_800_000,
    });
    const plot = h({
      assetClass: "realestate",
      country: "IN",
      currency: "INR",
      propertyType: "Land",
      currentValue: 100,
    });
    const data = portfolio({
      today: TODAY,
      fx: { today: { rate: 83.4, asOf: TODAY }, history: [] },
      holdings: [pune, plot],
    });
    const rows = buildAssetsView(data).groups[0].rows;
    const puneRow = rows.find((r) => r.id === pune.id)!;
    expect(puneRow.subtitle).toBe("Residential · Pune");
    expect(puneRow.native).toBe("₹62,00,000");
    expect(puneRow.gain).toBe("+$16.8K · +29%");
    expect(rows.find((r) => r.id === plot.id)!.subtitle).toBe("Land");
  });

  it("AS-05 Cash shows its Description and a dash without a Cost Basis; Crypto may have none", () => {
    const chase = h({
      assetClass: "cash",
      description: "Everyday account",
      currentValue: 3_000,
    });
    const coinbase = h({
      assetClass: "crypto",
      currentValue: 8_600,
      costBasis: 6_100,
    });
    const row1 = rowOf([chase, coinbase], chase.id);
    const row2 = rowOf([chase, coinbase], coinbase.id);
    expect(row1.subtitle).toBe("Everyday account");
    expect(row1.gain).toBe("—");
    expect(row2.subtitle).toBe("");
    expect(row2.gain).toBe("+$2.5K · +41%");
  });

  it("AS-05 a zero Cost Basis shows just the USD gain", () => {
    const gift = h({ assetClass: "metals", currentValue: 1_200, costBasis: 0 });
    expect(rowOf([gift], gift.id).gain).toBe("+$1.2K");
  });

  it("AS-06 a Stale Holding carries its age cue", () => {
    const manual = h({
      assetClass: "metals",
      description: "Gold bars",
      currentValue: 5,
      valuations: [{ date: "2026-08-27", value: 5, source: "user" }],
    });
    const stocks = h({
      assetClass: "stocks",
      currentValue: 5,
      positions: [
        pos({ ticker: "AAPL", priceSource: "hand", priceAsOf: "2026-09-03" }),
        pos({ ticker: "MSFT", priceSource: "hand", priceAsOf: "2026-10-01" }),
      ],
    });
    expect(rowOf([manual, stocks], manual.id).subtitle).toBe(
      "Gold bars · 47 days old",
    );
    expect(rowOf([manual, stocks], stocks.id).subtitle).toBe(
      "2 positions · AAPL, MSFT · prices 40 days old",
    );
  });

  it("AS-07 archived Holdings appear nowhere", () => {
    const live = h({ assetClass: "cash", currentValue: 100 });
    const gone = h({
      assetClass: "crypto",
      currentValue: 900,
      archivedAt: "2026-09-01T00:00:00Z",
    });
    const v = view([live, gone]);
    expect(v.header.total).toBe("$100");
    expect(v.header.subtitle).toMatch(/^1 account or asset in 1 class/);
    expect(v.groups.map((g) => g.label)).toEqual(["Cash"]);
    expect(v.groups.flatMap((g) => g.rows).map((r) => r.id)).toEqual([live.id]);
  });

  it("AS-08 a row opens its Holding", () => {
    const live = h({ assetClass: "cash", currentValue: 100 });
    expect(rowOf([live], live.id).href).toBe(`/holdings/${live.id}`);
  });
});

describe("collapsing groups", () => {
  it("AS-13 a group collapses to its header, and Collapse all flips to Expand all", () => {
    const holdings = [
      h({ assetClass: "realestate", currentValue: 300 }),
      h({ assetClass: "stocks", currentValue: 200 }),
      h({ assetClass: "cash", currentValue: 100 }),
    ];
    const open = view(holdings);
    expect(open.groups.every((g) => !g.collapsed && g.rows.length === 1)).toBe(
      true,
    );
    expect(open.toggleAll).toBe("Collapse all");

    const one = view(holdings, {
      collapsed: toggleGroup(new Set(), open.groups[2].key),
    });
    expect(one.groups[2].collapsed).toBe(true);
    expect(one.groups[2].rows).toEqual([]);
    expect(one.groups[2].label).toBe("Cash");
    expect(one.groups[0].rows).toHaveLength(1);
    expect(one.toggleAll).toBe("Collapse all");

    const all = view(holdings, { collapsed: toggleAllGroups(one) });
    expect(all.groups.every((g) => g.collapsed && g.rows.length === 0)).toBe(
      true,
    );
    expect(all.toggleAll).toBe("Expand all");

    const back = view(holdings, { collapsed: toggleAllGroups(all) });
    expect(back.groups.every((g) => !g.collapsed)).toBe(true);
  });
});

describe("empty Assets page", () => {
  it("AS-17 no Holdings shows $0 and the first-step state", () => {
    const v = view([
      h({
        assetClass: "cash",
        currentValue: 5,
        archivedAt: "2026-01-01T00:00:00Z",
      }),
    ]);
    expect(v.header.total).toBe("$0");
    expect(v.header.subtitle).toBeNull();
    expect(v.empty?.message).toBe("No accounts or assets yet");
    expect(v.groups).toEqual([]);
  });

  it("AS-18 both Add buttons open the add-asset modal with no class chosen", () => {
    const empty = view([]);
    expect(empty.addHref).toBe("/assets?modal=add-asset");
    expect(empty.empty?.addHref).toBe("/assets?modal=add-asset");
    const full = view([h({ assetClass: "cash", currentValue: 5 })]);
    expect(full.addHref).toBe("/assets?modal=add-asset");
    expect(full.addHref).not.toContain("class=");
  });
});

describe("class tiles", () => {
  const mix = () => [
    h({ assetClass: "realestate", currentValue: 50_000 }),
    h({ assetClass: "realestate", currentValue: 30_000 }),
    h({ assetClass: "realestate", currentValue: 20_000 }),
    h({ assetClass: "stocks", currentValue: 150_000 }),
    h({ assetClass: "stocks", currentValue: 50_000 }),
    h({ assetClass: "cash", currentValue: 60_000 }),
    h({ assetClass: "cash", currentValue: 40_000 }),
  ];

  it("AS-09 tiles summarise each class", () => {
    const v = view(mix());
    expect(v.tiles[0]).toMatchObject({
      id: "all",
      total: "$400K",
      detail: "7 items",
      selected: true,
    });
    expect(v.tiles.map((t) => t.id)).toEqual([
      "all",
      "realestate",
      "stocks",
      "cash",
    ]);
    expect(v.tiles[1]).toMatchObject({
      total: "$100K",
      detail: "25% · 3 properties",
      selected: false,
    });
  });

  it("AS-09 a single Holding reads 1 item", () => {
    expect(
      view([h({ assetClass: "cash", currentValue: 5 })]).tiles[0].detail,
    ).toBe("1 item");
  });

  it("AS-10 selecting a tile filters, selecting it again clears", () => {
    const holdings = mix();
    const filtered = view(holdings, { filter: toggleFilter(null, "stocks") });
    expect(filtered.groups.map((g) => g.label)).toEqual(["Stocks"]);
    expect(filtered.groups[0].share).toBe("50%");
    expect(filtered.tiles.find((t) => t.id === "stocks")!.selected).toBe(true);
    expect(filtered.tiles[0].selected).toBe(false);
    expect(filtered.tiles[0].total).toBe("$400K");

    const cleared = toggleFilter("stocks", "stocks");
    expect(cleared).toBeNull();
    const back = view(holdings, { filter: cleared });
    expect(back.groups).toHaveLength(3);
    expect(back.tiles[0].selected).toBe(true);
    expect(toggleFilter("stocks", "all")).toBeNull();
    expect(toggleFilter("stocks", "cash")).toBe("cash");
  });
});

describe("grouping", () => {
  it("AS-11 Country groups count items and badge the Asset Class", () => {
    const us = ["cash", "stocks", "crypto", "metals"] as const;
    const holdings = [
      ...us.map((assetClass) => h({ assetClass, currentValue: 100 })),
      h({
        assetClass: "realestate",
        country: "IN",
        currency: "INR",
        currentValue: 8_000,
      }),
    ];
    const v = view(holdings, { grouping: "country" });
    expect(v.groups.map((g) => [g.label, g.count])).toEqual([
      ["United States", "4 items"],
      ["India", "1 item"],
    ]);
    expect(v.groups[1].rows[0].badge).toBe("Real estate");
    expect(v.groups[0].rows.map((r) => r.badge).sort()).toEqual([
      "Cash",
      "Crypto",
      "Metals",
      "Stocks",
    ]);
  });

  it("AS-11 a Country with no Holding has no group", () => {
    const v = view([h({ assetClass: "cash", currentValue: 1 })], {
      grouping: "country",
    });
    expect(v.groups.map((g) => g.label)).toEqual(["United States"]);
  });

  it("AS-12 None shows one All holdings group, largest first", () => {
    const holdings = [
      h({ assetClass: "cash", name: "C", currentValue: 100 }),
      h({
        assetClass: "realestate",
        country: "IN",
        currency: "INR",
        name: "R",
        currentValue: 800_000,
      }),
      h({ assetClass: "stocks", name: "S", currentValue: 5_000 }),
    ];
    const v = view(holdings, { grouping: "none" });
    expect(v.groups).toHaveLength(1);
    expect(v.groups[0].label).toBe("All holdings");
    expect(v.groups[0].count).toBe("3 items");
    expect(v.groups[0].rows.map((r) => r.name)).toEqual(["R", "S", "C"]);
  });

  it("AS-13 collapsed state is kept per grouping", () => {
    const holdings = [h({ assetClass: "cash", currentValue: 1 })];
    const byClass = view(holdings);
    const collapsed = toggleGroup(new Set(), byClass.groups[0].key);
    expect(view(holdings, { collapsed }).groups[0].collapsed).toBe(true);
    expect(
      view(holdings, { collapsed, grouping: "none" }).groups[0].collapsed,
    ).toBe(false);
  });
});

describe("search", () => {
  const pune = () =>
    h({
      assetClass: "realestate",
      country: "IN",
      currency: "INR",
      name: "Pune apartment",
      description: "2BHK · Baner · rented",
      city: "Pune",
      propertyType: "Residential",
      currentValue: 100,
    });
  const zerodha = () =>
    h({
      assetClass: "stocks",
      country: "IN",
      currency: "INR",
      name: "Zerodha",
      currentValue: 100,
      positions: [
        pos({ ticker: "RELIANCE.NS", name: "Reliance Industries" }),
        pos({ ticker: "INFY.NS", name: "Infosys" }),
      ],
    });
  const honda = () =>
    h({ assetClass: "other", name: "2022 Honda CR-V", currentValue: 100 });
  const names = (query: string) =>
    view([pune(), zerodha(), honda()], { query })
      .groups.flatMap((g) => g.rows)
      .map((r) => r.name);

  it.each([
    ["baner", "Pune apartment"],
    ["pune", "Pune apartment"],
    ["infy", "Zerodha"],
    ["reliance industries", "Zerodha"],
    ["  HONDA ", "2022 Honda CR-V"],
  ])("AS-14 searching %j shows %s", (query, shown) => {
    expect(names(query)).toEqual([shown]);
  });

  it("AS-14 search combines with the class filter", () => {
    const v = view([pune(), zerodha(), honda()], {
      query: "a",
      filter: "stocks",
    });
    expect(v.groups.flatMap((g) => g.rows).map((r) => r.name)).toEqual([
      "Zerodha",
    ]);
  });

  it("AS-15 a search opens collapsed groups", () => {
    const holdings = [
      h({ assetClass: "cash", name: "Chase Checking", currentValue: 1 }),
      h({ assetClass: "stocks", name: "Fidelity", currentValue: 2 }),
    ];
    const all = view(holdings);
    const collapsed = toggleAllGroups(all);
    expect(view(holdings, { collapsed }).toggleAll).toBe("Expand all");
    const v = view(holdings, { collapsed, query: "chase" });
    expect(v.groups).toHaveLength(1);
    expect(v.groups[0].collapsed).toBe(false);
    expect(v.groups[0].rows.map((r) => r.name)).toEqual(["Chase Checking"]);
    expect(
      view(holdings, { collapsed, query: "   " }).groups.every(
        (g) => g.collapsed,
      ),
    ).toBe(true);
  });

  it("AS-16 nothing matching shows No holdings match.", () => {
    const v = view([honda()], { query: "zzz" });
    expect(v.groups).toEqual([]);
    expect(v.noMatch).toBe("No holdings match.");
    expect(v.empty).toBeNull();
    expect(view([honda()]).noMatch).toBeNull();
  });
});
