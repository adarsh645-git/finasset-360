import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { AssetClass } from "@/components/portfolio/types";
import { computeDistribution } from "@/lib/target-allocation/distribution";
import { computeNetWorth } from "@/lib/net-worth/compute";

// DashboardPanel and NarrowShell pull in HomeCurrencyPicker/SignOutButton,
// which call `useRouter()` — real in the App Router, but this suite renders
// components in isolation (ticket 16's own checklist item: each empty
// surface renders without error against a freshly created Portfolio), not
// inside a Next request, so there is no AppRouterContext to read from.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: () => {}, refresh: () => {}, replace: () => {} }),
}));

const { DashboardPanel } = await import("@/components/portfolio/DashboardPanel");
const { NarrowShell } = await import("@/components/portfolio/NarrowShell");
const { ProjectionSection } = await import("@/components/plan/ProjectionSection");
const { NetWorthStrip } = await import("@/components/portfolio/NetWorthStrip");
const { CheckInFlow } = await import("@/components/portfolio/CheckInFlow");
const { NetWorthTimelineChart } = await import("@/components/portfolio/NetWorthTimelineChart");
const { Sparkline } = await import("@/components/portfolio/Sparkline");
const { ValuationHistoryTable } = await import("@/components/portfolio/ValuationHistoryTable");

// The 5 global default Asset Classes a real Portfolio always has, even
// before its owner adds a single Holding (see the ticket 03 migration) —
// `computeDistribution` builds one row per Asset Class regardless of
// whether anything is actually held in it.
const DEFAULT_ASSET_CLASSES: AssetClass[] = [
  { id: "real-estate", owner_id: null, name: "Real Estate" },
  { id: "equity", owner_id: null, name: "Equity" },
  { id: "precious-metal", owner_id: null, name: "Precious Metal" },
  { id: "cash", owner_id: null, name: "Cash" },
  { id: "crypto", owner_id: null, name: "Crypto" },
];

describe("Portfolio dashboard against a freshly created Portfolio (no Holdings)", () => {
  const freshNetWorth = computeNetWorth([], []);
  const freshDistribution = computeDistribution(DEFAULT_ASSET_CLASSES, new Map(), new Map());

  it("DashboardPanel renders an explanatory starting point, not the empty grid", () => {
    const html = renderToStaticMarkup(
      <DashboardPanel
        today="2026-09-13"
        homeCurrency="USD"
        netWorth={freshNetWorth}
        timeline={[]}
        projected={[]}
        payoffMarkers={[]}
        liabilityNames={new Map()}
        staleItems={[]}
        distribution={freshDistribution}
        targetAmount={null}
        targetDate={null}
        onStartCheckIn={() => {}}
      />,
    );

    expect(html).toContain("Nothing recorded yet");
    // The grid this replaces — the distribution bars and the staleness
    // section — must not render alongside it (user story 116: "not an
    // empty grid").
    expect(html).not.toContain("Target Allocation");
    expect(html).not.toContain("Needs an update");
  });

  it("NarrowShell renders without error and hides the distribution/staleness section", () => {
    const html = renderToStaticMarkup(
      <NarrowShell
        homeCurrency="USD"
        netWorth={freshNetWorth}
        timeline={[]}
        projected={[]}
        payoffMarkers={[]}
        liabilityNames={new Map()}
        targetAmount={null}
        assetClasses={DEFAULT_ASSET_CLASSES}
        holdingsByAssetClass={new Map()}
        liabilityClasses={[]}
        liabilitiesByLiabilityClass={new Map()}
        latestByHolding={new Map()}
        latestByLiability={new Map()}
        onSelectHolding={() => {}}
        onSelectLiability={() => {}}
        distribution={freshDistribution}
        staleItems={[]}
        onStartCheckIn={() => {}}
      />,
    );

    expect(html).toContain("Nothing recorded yet");
    expect(html).not.toContain("Target Allocation");
  });

  it("ProjectionSection explains it needs Holdings instead of charting nothing", () => {
    const html = renderToStaticMarkup(
      <ProjectionSection
        today="2026-09-13"
        homeCurrency="USD"
        hasHoldings={false}
        holdingsTotal={0}
        liabilities={[]}
        liabilityNames={new Map()}
        recordedTimeline={[]}
        assumptions={null}
        onSave={async () => null}
      />,
    );

    expect(html).toContain("Add a Holding");
    // No chart, no assumptions form, while there is nothing to project.
    expect(html).not.toContain("Annual growth rate");
  });

  it("NetWorthStrip reads as nothing recorded, never as a computed $0.00", () => {
    const html = renderToStaticMarkup(
      <NetWorthStrip homeCurrency="USD" netWorth={freshNetWorth} userName="Adarsh" />,
    );

    expect(html).toContain("Nothing recorded yet");
  });

  it("CheckInFlow started with nothing to check in on says so and exits cleanly", () => {
    const html = renderToStaticMarkup(
      <CheckInFlow
        queue={[]}
        latestByHolding={new Map()}
        priceCacheBySymbol={new Map()}
        homeCurrency="USD"
        onRecordValuation={async () => null}
        onExit={() => {}}
      />,
    );

    expect(html).toContain("Nothing to check in on right now.");
  });
});

describe("A Liability recorded before any Holding exists", () => {
  // Regression coverage for a bug the code review caught: gating the whole
  // dashboard grid on "no Holdings" hid a Portfolio's *real* recorded data
  // (a negative Net Worth, a stale Liability) behind the "Nothing recorded
  // yet" empty state whenever a Liability was entered first — exactly the
  // "real result mistaken for empty" failure user story 117 warns against,
  // just in the opposite direction from a computed zero.
  it("DashboardPanel shows the real Net Worth and staleness instead of the empty-Portfolio message", () => {
    const mortgageValuation = {
      id: "v1",
      liability_id: "mortgage",
      amount: 300_000,
      fx_rate_to_home: 1,
      home_currency_at_recording: "USD",
      recorded_at: "2026-01-01",
    };
    const netWorth = computeNetWorth([], [mortgageValuation]);
    const distribution = computeDistribution(DEFAULT_ASSET_CLASSES, new Map(), new Map());

    const html = renderToStaticMarkup(
      <DashboardPanel
        today="2026-09-13"
        homeCurrency="USD"
        netWorth={netWorth}
        timeline={[]}
        projected={[]}
        payoffMarkers={[]}
        liabilityNames={new Map([["mortgage", "Mortgage"]])}
        staleItems={[
          { id: "liability-mortgage", name: "Mortgage", recordedAt: "2026-01-01", onSelect: () => {} },
        ]}
        distribution={distribution}
        targetAmount={null}
        targetDate={null}
        onStartCheckIn={() => {}}
      />,
    );

    expect(html).not.toContain("Nothing recorded yet");
    expect(html).toContain("Needs an update");
    expect(html).toContain("Mortgage");
  });

  it("ProjectionSection still projects the Liability's payoff instead of demanding a Holding first", () => {
    const html = renderToStaticMarkup(
      <ProjectionSection
        today="2026-09-13"
        homeCurrency="USD"
        hasHoldings={false}
        holdingsTotal={0}
        liabilities={[{ id: "mortgage", currentAmount: 300_000, amortization: null }]}
        liabilityNames={new Map([["mortgage", "Mortgage"]])}
        recordedTimeline={[]}
        assumptions={null}
        onSave={async () => null}
      />,
    );

    expect(html).toContain("Annual growth rate");
    expect(html).not.toContain("Add a Holding");
  });
});

describe("A Holding recorded at exactly $0 (something real, not nothing)", () => {
  it("DashboardPanel shows the grid — a recorded $0 is a real result, not the empty-Portfolio message — while the distribution still explains it has nothing to chart", () => {
    const zeroValuation = {
      id: "v1",
      holding_id: "cash-account",
      amount: 0,
      fx_rate_to_home: 1,
      home_currency_at_recording: "USD",
      recorded_at: "2026-09-01",
    };
    const netWorth = computeNetWorth([zeroValuation], []);
    // The Valuation is recorded, but at 0 — `computeDistribution` sums to a
    // 0 total, same shape as no Holding having been valued at all.
    const distribution = computeDistribution(
      DEFAULT_ASSET_CLASSES,
      new Map([["cash", 0]]),
      new Map(),
    );

    const html = renderToStaticMarkup(
      <DashboardPanel
        today="2026-09-13"
        homeCurrency="USD"
        netWorth={netWorth}
        timeline={[]}
        projected={[]}
        payoffMarkers={[]}
        liabilityNames={new Map()}
        staleItems={[]}
        distribution={distribution}
        targetAmount={null}
        targetDate={null}
        onStartCheckIn={() => {}}
      />,
    );

    expect(html).not.toContain("Nothing recorded yet");
    expect(html).toContain("Record a Valuation to see your distribution.");
  });

  it("ProjectionSection still projects off Holdings that exist but aren't valued yet (holdingsTotal 0 alone doesn't block it)", () => {
    const html = renderToStaticMarkup(
      <ProjectionSection
        today="2026-09-13"
        homeCurrency="USD"
        hasHoldings={true}
        holdingsTotal={0}
        liabilities={[]}
        liabilityNames={new Map()}
        recordedTimeline={[]}
        assumptions={null}
        onSave={async () => null}
      />,
    );

    expect(html).toContain("Annual growth rate");
  });
});

describe("A Holding with exactly one Valuation (user story 119)", () => {
  it("NetWorthTimelineChart renders a single recorded point without breaking", () => {
    const html = renderToStaticMarkup(
      <NetWorthTimelineChart
        homeCurrency="USD"
        recorded={[{ date: "2026-09-01", holdingsTotal: 1000, liabilitiesTotal: 0, netWorth: 1000 }]}
        projected={[]}
      />,
    );

    expect(html).toContain("Record a Valuation on a second day to start seeing a trend here.");
  });

  it("Sparkline renders a single value as a flat point, not NaN geometry", () => {
    const html = renderToStaticMarkup(<Sparkline values={[1000]} />);

    expect(html).not.toContain("NaN");
    expect(html).toContain("<svg");
  });

  it("ValuationHistoryTable renders one row with its sparkline intact", () => {
    const html = renderToStaticMarkup(
      <ValuationHistoryTable
        currency="USD"
        history={[{ amount: 1000, recorded_at: "2026-09-01" }]}
      />,
    );

    expect(html).not.toContain("NaN");
    expect(html).toContain("2026-09-01");
  });
});
