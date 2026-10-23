import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { HoldingDetail } from "@/components/holding/HoldingDetail";
import type { HoldingData, PortfolioData } from "@/lib/read-model/types";
import { buildHoldingDetail } from "@/lib/views/holding-detail";
import type { RouteFamily } from "@/lib/views/links";
import { holding, portfolio } from "../fixtures/portfolio";

// The Delete button reads the router and path.
vi.mock("next/navigation", () => ({
  usePathname: () => "/holdings/h1",
  useRouter: () => ({ push: () => {}, refresh: () => {}, replace: () => {} }),
}));

const TODAY = "2026-10-14";
const fx = (asOf = TODAY): PortfolioData["fx"] => ({
  today: { rate: 83.4, asOf },
  history: [
    { date: "2025-10-14", rate: 82.1 },
    { date: asOf, rate: 83.4 },
  ],
});
const data = (holdings: HoldingData[], over: Partial<PortfolioData> = {}) =>
  portfolio({ today: TODAY, fx: fx(), holdings, ...over });
const detail = (h: HoldingData, over: Partial<PortfolioData> = {}, id = h.id) =>
  buildHoldingDetail(data([h], over), { holdingId: id })!;
const user = (date: string, value: number) => ({ date, value, source: "user" as const });

const puneApartment = (over: Partial<HoldingData> = {}) =>
  holding({
    id: "h1",
    assetClass: "realestate",
    country: "IN",
    currency: "INR",
    name: "Pune apartment",
    currentValue: 6_200_000,
    costBasis: 4_800_000,
    propertyType: "Residential",
    city: "Pune",
    valuations: [user("2025-09-01", 5_800_000), user("2026-10-01", 6_200_000)],
    ...over,
  });
const chase = (over: Partial<HoldingData> = {}) =>
  holding({
    id: "h1",
    assetClass: "cash",
    name: "Chase Checking",
    currentValue: 6_200,
    valuations: [user("2025-10-14", 5_000), user("2026-10-01", 6_200)],
    ...over,
  });

describe("holding detail view", () => {
  it("HD-01 only a current Holding of the User has a page", () => {
    const current = chase({ id: "h1" });
    const archived = chase({ id: "h2", archivedAt: "2026-09-01T00:00:00Z" });
    const d = data([current, archived]);
    expect(buildHoldingDetail(d, { holdingId: "h1" })).not.toBeNull();
    expect(buildHoldingDetail(d, { holdingId: "h2" })).toBeNull();
    expect(buildHoldingDetail(d, { holdingId: "someone-elses" })).toBeNull();
    expect(buildHoldingDetail(d, { holdingId: "missing" })).toBeNull();
  });

  it("HD-02 kind tag and badges follow the class and Country", () => {
    const rows: [HoldingData["assetClass"], "US" | "IN", string, string[]][] = [
      ["stocks", "US", "Brokerage account", ["United States", "USD"]],
      ["realestate", "IN", "Property", ["India", "INR"]],
      ["cash", "US", "Account", ["United States", "USD"]],
      ["crypto", "US", "Account", ["United States", "USD"]],
      ["metals", "IN", "Asset", ["India", "INR"]],
      ["other", "US", "Asset", ["United States", "USD"]],
    ];
    for (const [assetClass, country, tag, badges] of rows) {
      const d = detail(
        holding({ id: "h1", assetClass, country, currency: country === "US" ? "USD" : "INR", currentValue: 1_000 }),
      );
      expect(d.kind, assetClass).toBe(tag);
      expect(d.badges, assetClass).toEqual(badges);
    }
  });

  it("HD-03 the value is in USD and the native line carries the rate, as-of date and Description", () => {
    const d1 = detail(puneApartment({ description: "2BHK · rented" }));
    expect(d1.usd).toBe("$74,341");
    expect(d1.nativeLine).toBe("₹62,00,000 at ₹83.40/$ · 2BHK · rented");

    const d2 = buildHoldingDetail(data([puneApartment()], { fx: fx("2026-10-10") }), { holdingId: "h1" })!;
    expect(d2.nativeLine).toBe("₹62,00,000 at ₹83.40/$ as of 10 Oct");

    const d3 = detail(chase({ description: "Everyday account", valuations: [user("2026-10-01", 6_200)] }));
    expect(d3.usd).toBe("$6,200");
    expect(d3.nativeLine).toBe("Everyday account");

    expect(detail(chase({ valuations: [user("2026-10-01", 6_200)] })).nativeLine).toBeNull();
  });

  it("HD-04 the crumbs link only once the registry knows those pages", () => {
    const h = chase({ valuations: [user("2026-10-01", 6_200)] });
    const crumbs = (existing: ReadonlySet<RouteFamily>) =>
      buildHoldingDetail(data([h]), { holdingId: "h1", existing })!.breadcrumb;

    expect(crumbs(new Set(["overview", "holding"]))).toEqual([
      { label: "Assets", href: null },
      { label: "Cash", href: null },
      { label: "Chase Checking", href: null },
    ]);
    expect(crumbs(new Set(["overview", "holding", "assets", "assetClass"]))).toEqual([
      { label: "Assets", href: "/assets" },
      { label: "Cash", href: "/assets/cash" },
      { label: "Chase Checking", href: null },
    ]);
  });

  it("HD-04 class crumbs use the read-model ids for Real estate and Vehicles & other", () => {
    const all = new Set<RouteFamily>(["assets", "assetClass"]);
    const re = buildHoldingDetail(data([puneApartment()]), { holdingId: "h1", existing: all })!;
    expect(re.breadcrumb[1]).toEqual({ label: "Real estate", href: "/assets/realestate" });
    const car = holding({ id: "h1", assetClass: "other", currentValue: 5 });
    const other = buildHoldingDetail(data([car]), { holdingId: "h1", existing: all })!;
    expect(other.breadcrumb[1]).toEqual({ label: "Vehicles & other", href: "/assets/other" });
  });

  it("HD-05 a Stale Holding's native line ends with the updated cue", () => {
    const stale = (h: Partial<HoldingData>, days: number) => {
      const date = new Date(Date.parse(`${TODAY}T00:00:00Z`) - days * 86_400_000).toISOString().slice(0, 10);
      return detail(chase({ ...h, valuations: [user(date, 6_200)] })).nativeLine;
    };
    expect(stale({ description: "Everyday account" }, 47)).toBe("Everyday account · updated 47 days ago");
    expect(stale({}, 47)).toBe("Updated 47 days ago");
    expect(stale({}, 30)).toBeNull();

    const zerodha = holding({
      id: "h1",
      assetClass: "stocks",
      country: "IN",
      currency: "INR",
      description: "NSE equities",
      currentValue: 169_200,
      positions: [
        {
          ticker: "ABC.NS", shares: 10, avgCost: 1, price: 100, priceSource: "hand",
          priceAsOf: "2026-08-03", name: "ABC", sector: "Other", exchange: null,
        },
      ],
    });
    expect(detail(zerodha).nativeLine).toBe("₹1,69,200 at ₹83.40/$ · NSE equities · updated 72 days ago");
  });

  it("HD-06 the actions open the modal params of the page", () => {
    const cash = detail(chase());
    expect(cash.actions.update).toEqual({ label: "Update value", href: "/holdings/h1?modal=update&holding=h1" });
    expect(cash.actions.edit.href).toBe("/holdings/h1?modal=edit&holding=h1");
    const stocks = detail(holding({ id: "h1", assetClass: "stocks", currentValue: 10 }));
    expect(stocks.actions.update.label).toBe("Edit positions");
    expect(stocks.actions.update.href).toBe("/holdings/h1?modal=update&holding=h1");
  });

  it("HD-08 an India property shows its Property, Cost basis, gain and Currency effect cards", () => {
    const cards = detail(puneApartment()).stats;
    expect(cards.map((c) => c.label)).toEqual([
      "Property",
      "Cost basis",
      "Unrealized gain",
      "12-month change",
      "Currency effect, 12 mo",
    ]);
    const by = (label: string) => cards.find((c) => c.label === label)!;
    expect([by("Property").value, by("Property").sub]).toEqual(["Residential", "Pune"]);
    expect([by("Cost basis").value, by("Cost basis").sub]).toEqual(["₹48,00,000", "≈ $57,554 today"]);
    expect([by("Unrealized gain").value, by("Unrealized gain").sub]).toEqual([
      "+₹14,00,000",
      "+29.2% · +$16,787",
    ]);
    expect([by("Currency effect, 12 mo").value, by("Currency effect, 12 mo").sub]).toEqual([
      "−$1,177",
      "₹82.10 → ₹83.40 per $",
    ]);
  });

  it("HD-09 a Metals Holding shows its quantity and price per unit, and no Cost basis", () => {
    const gold = holding({
      id: "h1", assetClass: "metals", country: "IN", currency: "INR", currentValue: 290_000,
      quantity: 40, unit: "g", valuations: [user("2025-09-01", 250_000), user("2026-10-01", 290_000)],
    });
    const cards = detail(gold).stats;
    expect(cards.map((c) => c.label)).toEqual(["Quantity", "12-month change", "Currency effect, 12 mo"]);
    expect([cards[0].value, cards[0].sub]).toEqual(["40 g", "₹7,250 per g"]);
  });

  it("HD-10 a US Holding without a Cost Basis has only the 12-month change", () => {
    const cards = detail(chase()).stats;
    expect(cards).toHaveLength(1);
    expect(cards[0].label).toBe("12-month change");
    expect(cards[0].sub).toBe("In USD terms");
    expect(cards[0].value).toBe("+$1,200 (+24.0%)");
  });

  it("HD-11 a Holding added within the year has no 12-month change", () => {
    const cards = detail(chase({ valuations: [user("2026-08-10", 6_200)] })).stats;
    expect(cards).toHaveLength(1);
    expect([cards[0].value, cards[0].sub]).toEqual(["—", "Added Aug 2026"]);
  });
});

describe("holding detail render", () => {
  const render = (h: HoldingData, existing?: ReadonlySet<RouteFamily>) =>
    renderToStaticMarkup(
      <HoldingDetail detail={buildHoldingDetail(data([h]), { holdingId: h.id, existing })!} />,
    );

  it("HD-04 the breadcrumb is plain text while those pages don't exist, links after", () => {
    const h = chase();
    const plain = render(h, new Set(["overview", "holding"]));
    expect(plain).toContain("Chase Checking");
    expect(plain).not.toMatch(/<a [^>]*href="\/assets\//);
    const linked = render(h, new Set(["assets", "assetClass"]));
    expect(linked).toMatch(/<a [^>]*href="\/assets"[^>]*>Assets</);
    expect(linked).toMatch(/<a [^>]*href="\/assets\/cash"[^>]*>Cash</);
  });

  it("HD-06 the header renders the actions as links to the modal", () => {
    const html = render(chase());
    expect(html).toMatch(/<a [^>]*href="\/holdings\/h1\?modal=update&amp;holding=h1"[^>]*>Update value</);
    expect(html).toMatch(/<a [^>]*href="\/holdings\/h1\?modal=edit&amp;holding=h1"[^>]*>Edit</);
  });

  it("HD-17 a Cash Holding has no Positions or By sector section", () => {
    const html = render(chase());
    expect(html).not.toContain("Positions in this account");
    expect(html).not.toContain("By sector");
    expect(html).toContain(">Account<");
  });
});
