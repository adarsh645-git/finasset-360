import { describe, expect, it } from "vitest";
import { yearBefore } from "@/lib/calc";
import { buildShell } from "@/lib/views/shell";
import { holding, liability, portfolio, TODAY } from "../fixtures/portfolio";
import type { RouteFamily } from "@/lib/views/links";
import type { PortfolioData } from "@/lib/read-model/types";

const user = { email: "a@example.test", user_metadata: { full_name: "Adarsh Reddy" } };
const YEAR_AGO = yearBefore(TODAY);

const shellOf = (p: PortfolioData, existing?: ReadonlySet<RouteFamily>) =>
  buildShell({ user, portfolio: p }, { pathname: null, ...(existing ? { existing } : {}) });
const valueOf = (shell: ReturnType<typeof shellOf>, label: string) =>
  shell.items.find((i) => i.label === label)?.value;

describe("shell totals", () => {
  it("SH-04 Net Worth, its 12-month change and the compact totals come from the Portfolio", () => {
    const shell = shellOf(
      portfolio({
        holdings: [
          holding({
            assetClass: "cash",
            currentValue: 1_300_000,
            valuations: [{ date: YEAR_AGO, value: 1_250_000, source: "user" }],
          }),
        ],
        liabilities: [
          liability({
            currentBalance: 120_000,
            valuations: [{ date: YEAR_AGO, value: 118_200, source: "user" }],
          }),
        ],
      }),
    );
    expect(shell.netWorth.total).toBe("$1,180,000");
    expect(shell.netWorth.change).toBe("+$48,200 (+4.3%) 12 mo");
    expect(shell.netWorth.tone).toBe("up");
    expect(valueOf(shell, "Assets")).toBe("$1.30M");
    expect(valueOf(shell, "Liabilities")).toBe("$120K");
  });

  it("SH-05 a Portfolio under a year old has no 12-month change", () => {
    const threeMonthsAgo = "2026-03-15";
    const shell = shellOf(
      portfolio({
        holdings: [
          holding({
            currentValue: 50_000,
            valuations: [{ date: threeMonthsAgo, value: 40_000, source: "user" }],
          }),
        ],
      }),
    );
    expect(shell.netWorth.total).toBe("$50,000");
    expect(shell.netWorth.change).toBe("—");
    expect(shell.netWorth.tone).toBeNull();
  });

  it("SH-06 archived items are left out of the totals", () => {
    const shell = shellOf(
      portfolio({
        holdings: [
          holding({ id: "a", assetClass: "cash", currentValue: 10_000 }),
          holding({
            id: "b",
            assetClass: "cash",
            currentValue: 5_000,
            archivedAt: "2026-02-01T00:00:00Z",
            valuations: [{ date: "2026-01-01", value: 5_000, source: "user" }],
          }),
        ],
      }),
    );
    expect(valueOf(shell, "Assets")).toBe("$10K");
    expect(shell.netWorth.total).toBe("$10,000");
  });

  it("SH-07 only classes with current Holdings are listed, in the fixed order", () => {
    const shell = shellOf(
      portfolio({
        holdings: [
          holding({ id: "c", assetClass: "cash", currentValue: 18_000 }),
          holding({ id: "s", assetClass: "stocks", currentValue: 412_000 }),
          holding({
            id: "m",
            assetClass: "metals",
            currentValue: 9_000,
            archivedAt: "2026-02-01T00:00:00Z",
          }),
        ],
      }),
    );
    expect(shell.classes.map((c) => [c.name, c.value])).toEqual([
      ["Stocks", "$412K"],
      ["Cash", "$18K"],
    ]);
  });

  it("SH-08 pages that don't exist yet are plain text", () => {
    const shell = shellOf(portfolio({ holdings: [holding({ currentValue: 1_000 })] }));
    const hrefs = Object.fromEntries(shell.items.map((i) => [i.label, i.href]));
    expect(hrefs).toEqual({
      Overview: "/",
      Assets: null,
      Liabilities: null,
      Growth: null,
      Goals: "/goals",
    });
    expect(shell.classes.map((c) => c.href)).toEqual([null]);
  });

  it("SH-09 a page that exists turns its links on", () => {
    const shell = shellOf(
      portfolio({ holdings: [holding({ currentValue: 1_000 })] }),
      new Set<RouteFamily>(["overview", "assets", "assetClass"]),
    );
    const hrefs = Object.fromEntries(shell.items.map((i) => [i.label, i.href]));
    expect(hrefs.Assets).toBe("/assets");
    expect(hrefs.Liabilities).toBeNull();
    expect(shell.classes[0].href).toBe("/assets/stocks");
  });

  it("SH-11 an empty Portfolio shows zeros and dashes and no classes", () => {
    const shell = shellOf(portfolio());
    expect(shell.netWorth).toEqual({ total: "$0", change: "—", tone: null });
    expect(valueOf(shell, "Assets")).toBe("$0");
    expect(valueOf(shell, "Liabilities")).toBe("$0");
    expect(shell.classes).toEqual([]);
  });
});
