import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Overview } from "@/components/overview/Overview";
import { buildOverview } from "@/lib/views/overview";
import { holding, liability, portfolio } from "../fixtures/portfolio";

const TODAY = "2026-10-13";
const YEAR_AGO = "2025-10-13";
const build = (data: ReturnType<typeof portfolio>) => buildOverview(data, { range: "All" });
const render = (data: ReturnType<typeof portfolio>) =>
  renderToStaticMarkup(<Overview overview={build(data)} />);

const val = (date: string, value: number) => ({ date, value, source: "user" as const });

describe("overview stat cards", () => {
  it("OV-06 cards show the figures, counts and 12-month changes", () => {
    const data = portfolio({
      today: TODAY,
      holdings: [
        holding({
          id: "home",
          assetClass: "realestate",
          currentValue: 300_000,
          valuations: [val(YEAR_AGO, 250_000)],
        }),
        holding({ id: "stk", currentValue: 1_000_000, valuations: [val(YEAR_AGO, 954_000)] }),
      ],
      liabilities: [
        liability({
          id: "mort",
          currentBalance: 120_000,
          linkedHoldingId: "home",
          valuations: [val(YEAR_AGO, 140_000)],
        }),
      ],
    });
    const stats = build(data).stats!;

    // Holdings +96K; paid down 20K; equity (300-120) - (250-140) = +70K.
    expect(stats.assets).toMatchObject({
      label: "Total assets",
      value: "$1,300,000",
      detail: "2 accounts & assets · +$96K in 12 mo",
    });
    expect(stats.liabilities).toMatchObject({
      value: "$120,000",
      detail: "1 loan · $20K paid down in 12 mo",
    });
    expect(stats.equity).toMatchObject({
      value: "$180,000",
      detail: "Across 1 financed asset · +$70K in 12 mo",
    });
  });

  it("OV-07 no history, loans or links read with dashes and plain wording", () => {
    const data = portfolio({
      today: TODAY,
      holdings: [holding({ currentValue: 5_000, valuations: [val("2026-09-13", 5_000)] })],
    });
    const stats = build(data).stats!;

    expect(stats.assets.detail).toBe("1 account or asset · — in 12 mo");
    expect(stats.liabilities).toMatchObject({ value: "$0", detail: "No loans" });
    expect(stats.equity).toMatchObject({ value: "$0", detail: "No loans linked to assets" });
  });

  it("OV-08 none of the stat cards is a link while only the Overview exists", () => {
    const html = render(portfolio({ today: TODAY, holdings: [holding({ currentValue: 5_000 })] }));

    expect(html).toContain("Total assets");
    expect(html).toContain("Equity built");
    expect(html).not.toMatch(/href="\/liabilities/);
  });
});

describe("overview allocation", () => {
  const data = () =>
    portfolio({
      today: TODAY,
      holdings: [
        holding({ id: "s", assetClass: "stocks", currentValue: 412_000, valuations: [val(YEAR_AGO, 381_000)] }),
        holding({ id: "s2", assetClass: "stocks", currentValue: 0, valuations: [val(YEAR_AGO, 0)] }),
        holding({ id: "r", assetClass: "realestate", currentValue: 300_000, valuations: [val(YEAR_AGO, 288_000)] }),
        holding({ id: "c", assetClass: "cash", currentValue: 0, valuations: [val("2026-10-01", 0)] }),
      ],
    });

  it("OV-09 rows are largest first with count, value, share and 12-month change", () => {
    const rows = build(data()).allocation!.rows.map((r) => [r.name, r.count, r.value, r.share, r.change]);

    expect(rows).toEqual([
      ["Stocks", 2, "$412,000", "58%", "+$31K"],
      ["Real estate", 1, "$300,000", "42%", "+$12K"],
      ["Cash", 1, "$0", "0%", "—"],
    ]);
  });

  it("OV-10 rows are plain text and the change column is hidden on phones", () => {
    const html = render(data());

    expect(html).toContain("Allocation");
    expect(html).toContain("Real estate");
    expect(html).not.toMatch(/href="\/assets\//);
    expect(html).toMatch(/hidden[^"]*sm:block[^>]*>\+\$12K/);
  });

  it("the card is absent with no current Holdings", () => {
    const data = portfolio({ today: TODAY, liabilities: [liability({ currentBalance: 10 })] });

    expect(build(data).allocation).toBeNull();
  });
});

describe("overview where it's held", () => {
  it("OV-13 only Countries in use appear", () => {
    const data = portfolio({ today: TODAY, holdings: [holding({ currentValue: 200_000 })] });
    const view = build(data);

    expect(view.countries).toHaveLength(1);
    expect(view.countries[0]).toMatchObject({
      name: "United States",
      net: "$200,000 net",
      detail: "$200K assets · $0 debt",
      share: "100% of assets",
    });
    expect(render(data)).not.toContain("India");
  });
});

describe("overview currency effect", () => {
  const india = (asOf: string) =>
    portfolio({
      today: TODAY,
      fx: {
        today: { rate: 83.4, asOf },
        history: [
          { date: "2025-10-01", rate: 80 },
          { date: asOf, rate: 83.4 },
        ],
      },
      holdings: [
        holding({
          country: "IN",
          currency: "INR",
          currentValue: 8_340_000,
          valuations: [val(YEAR_AGO, 8_340_000)],
        }),
      ],
    });

  it("OV-14 shows the signed amount and the rates then and now", () => {
    const effect = build(india(TODAY)).currencyEffect!;

    expect(effect.amount).toBe("−$4,250");
    expect(effect.tone).toBe("down");
    expect(effect.note).toBe("Rupee moved ₹80.00 → ₹83.40 per $.");
    expect(render(india(TODAY))).toContain("Currency effect, 12 mo");
  });

  it("OV-15 a stale FX Rate shows its date", () => {
    expect(build(india("2026-10-10")).currencyEffect!.note).toContain("as of 10 Oct");
    expect(build(india(TODAY)).currencyEffect!.note).not.toContain("as of");
  });

  it("OV-16 no India items hides the line", () => {
    const data = portfolio({ today: TODAY, holdings: [holding({ currentValue: 1_000 })] });

    expect(build(data).currencyEffect).toBeNull();
    expect(render(data)).not.toContain("Currency effect");
  });
});
