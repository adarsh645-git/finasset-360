import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Overview } from "@/components/overview/Overview";
import type { RouteFamily } from "@/lib/views/links";
import { buildStaleList } from "@/lib/views/stale-list";
import { buildOverview } from "@/lib/views/overview";
import { holding, liability, portfolio } from "../fixtures/portfolio";

const TODAY = "2026-10-13";
const YEAR_AGO = "2025-10-13";
const val = (date: string, value: number) => ({
  date,
  value,
  source: "user" as const,
});
const build = (data: ReturnType<typeof portfolio>, existing?: ReadonlySet<RouteFamily>) =>
  buildOverview(data, { range: "All", existing });
const render = (data: ReturnType<typeof portfolio>, existing?: ReadonlySet<RouteFamily>) =>
  renderToStaticMarkup(<Overview overview={build(data, existing)} />);

const pune = () =>
  portfolio({
    today: TODAY,
    holdings: [
      holding({
        id: "pune",
        name: "Pune apartment",
        assetClass: "realestate",
        currentValue: 74_340,
        valuations: [val(YEAR_AGO, 70_000), val(TODAY, 74_340)],
      }),
    ],
    liabilities: [
      liability({
        id: "loan",
        name: "Pune loan",
        currentBalance: 41_127,
        linkedHoldingId: "pune",
        valuations: [val(YEAR_AGO, 44_787), val(TODAY, 41_127)],
      }),
    ],
  });

const stalePortfolio = () =>
  portfolio({
    today: TODAY,
    holdings: [
      holding({
        id: "chase",
        name: "Chase Checking",
        assetClass: "cash",
        currentValue: 10,
        valuations: [val("2026-09-08", 10)],
      }),
      holding({
        id: "zer",
        name: "Zerodha",
        assetClass: "stocks",
        currentValue: 100,
        positions: [
          {
            ticker: "AAA",
            shares: 1,
            avgCost: 1,
            price: 100,
            priceSource: "hand",
            priceAsOf: "2026-09-03",
            name: "AAA",
            sector: "Tech",
            exchange: null,
          },
        ],
      }),
      holding({
        id: "fresh",
        name: "Fresh",
        assetClass: "cash",
        currentValue: 5,
        valuations: [val(TODAY, 5)],
      }),
    ],
    liabilities: [
      liability({
        id: "stu",
        name: "Student loan",
        currentBalance: 50,
        valuations: [val("2026-08-27", 50)],
      }),
    ],
  });

describe("overview equity in financed assets", () => {
  it("OV-11 one linked pair", () => {
    const html = render(pune());
    const rows = build(pune()).equity!.rows;

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      name: "Pune apartment",
      equity: "$33,213",
      detail: "45% owned · +$8K in 12 mo",
      breakdown: "$74.3K value − $41.1K loan",
    });
    expect(html).toContain("Equity in financed assets");
    expect(html).toContain("45% owned · +$8K in 12 mo");
  });

  it("OV-11 a pair without a year of history reads a dash", () => {
    const data = pune();
    data.holdings[0]!.valuations = [val("2026-09-01", 74_340)];

    expect(build(data).equity!.rows[0]!.detail).toBe("45% owned · — in 12 mo");
  });

  it("OV-12 no linked pairs hides the card", () => {
    const data = portfolio({
      today: TODAY,
      holdings: [holding({ id: "a", currentValue: 10 })],
      liabilities: [liability({ id: "b", currentBalance: 5 })],
    });

    expect(build(data).equity).toBeNull();
    expect(render(data)).not.toContain("Equity in financed assets");
  });
});

describe("overview needs updating", () => {
  it("OV-17 Stale items, oldest first", () => {
    const view = build(stalePortfolio()).needsUpdating!;

    expect(view.title).toBe("Needs updating (3)");
    expect(view.rows.map((r) => `${r.name} · ${r.age}`)).toEqual([
      "Student loan · 47 days old",
      "Zerodha · prices 40 days old",
      "Chase Checking · 35 days old",
    ]);
    const html = render(stalePortfolio());
    expect(html).toContain("Needs updating (3)");
    expect(html).toContain('data-slot="needs-updating-action"');
  });

  it("OV-17 buildStaleList is exported on its own, ties by name", () => {
    const data = stalePortfolio();
    data.holdings.push(
      holding({
        id: "b",
        name: "Alpha",
        assetClass: "cash",
        currentValue: 1,
        valuations: [val("2026-09-08", 1)],
      }),
    );
    const list = buildStaleList(data, TODAY);

    expect(list.map((r) => [r.kind, r.id, r.ageDays])).toEqual([
      ["liability", "stu", 47],
      ["holding", "zer", 40],
      ["holding", "b", 35],
      ["holding", "chase", 35],
    ]);
    expect(list[1]).toMatchObject({ stocks: true, href: null });
  });

  it("OV-18 nothing Stale hides the card", () => {
    const data = portfolio({
      today: TODAY,
      holdings: [holding({ currentValue: 5, valuations: [val("2026-10-01", 5)] })],
    });

    expect(build(data).needsUpdating).toBeNull();
    expect(render(data)).not.toContain("Needs updating");
  });

  it.each([
    [["overview"], false, false],
    [["overview", "holding"], true, false],
    [["overview", "holding", "liability"], true, true],
  ] as [RouteFamily[], boolean, boolean][])(
    "OV-19 rows link only to existing detail pages %j",
    (existing, holdingLink, liabilityLink) => {
      const rows = build(stalePortfolio(), new Set(existing)).needsUpdating!.rows;
      const html = render(stalePortfolio(), new Set(existing));

      expect(rows.find((r) => r.id === "chase")!.href).toBe(holdingLink ? "/holdings/chase" : null);
      expect(rows.find((r) => r.id === "stu")!.href).toBe(
        liabilityLink ? "/liabilities/stu" : null,
      );
      expect(html.includes('href="/holdings/chase"')).toBe(holdingLink);
      expect(html.includes('href="/liabilities/stu"')).toBe(liabilityLink);
    },
  );
});

describe("overview right column", () => {
  it("OV-20 the Goals slot is empty", () => {
    const html = render(stalePortfolio());

    expect(html).toContain('data-slot="goals"');
    expect(html).not.toContain("All goals");
    expect(html).not.toMatch(/>Goals</);
  });

  it("OV-23 cards stack in order Allocation, Equity, Where it's held, Needs updating", () => {
    const data = pune();
    data.holdings[0]!.country = "IN";
    data.holdings[0]!.currency = "INR";
    data.liabilities[0]!.valuations = [val("2026-08-01", 41_127)];
    const html = render(data);
    const at = (t: string) => html.indexOf(`>${t}<`);

    expect(at("Allocation")).toBeGreaterThan(-1);
    expect(at("Allocation")).toBeLessThan(at("Equity in financed assets"));
    expect(at("Equity in financed assets")).toBeLessThan(at("Where it&#x27;s held"));
    expect(at("Where it&#x27;s held")).toBeLessThan(at("Needs updating (1)"));
    expect(html).toContain("@min-[820px]:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]");
  });
});
