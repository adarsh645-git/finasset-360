"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AssetClassIcon } from "@/components/icons/AssetClassIcon";
import { LiabilitiesRootIcon, LiabilityClassIcon } from "@/components/icons/LiabilityClassIcon";
import { formatMoney } from "@/lib/currency/format";
import type { PriceCacheRow } from "@/lib/market-data/live-estimate";
import { computeNetWorth } from "@/lib/net-worth/compute";
import { buildNetWorthTimeline } from "@/lib/net-worth/timeline";
import {
  projectNetWorth,
  projectPayoffMarkers,
  type PayoffMarker,
  type ProjectedNetWorthPoint,
} from "@/lib/projection/engine";
import { computeProjectedNetPosition } from "@/lib/projection/net-position";
import { toAmortizationInput } from "@/lib/liabilities/to-amortization-input";
import { latestValuationByHolding, latestValuationByLiability } from "@/lib/valuations/latest";
import { daysAgoLabel, isStale } from "@/lib/valuations/staleness";
import { AddAssetClassRow } from "./AddAssetClassRow";
import { AddHoldingRow } from "./AddHoldingRow";
import { AddLiabilityClassRow } from "./AddLiabilityClassRow";
import { AddLiabilityRow } from "./AddLiabilityRow";
import { AssetClassDetailPanel } from "./AssetClassDetailPanel";
import { Breadcrumb } from "./Breadcrumb";
import { DashboardPanel } from "./DashboardPanel";
import { HoldingDetailPanel } from "./HoldingDetailPanel";
import { LiabilitiesRootPanel } from "./LiabilitiesRootPanel";
import { LiabilityClassDetailPanel } from "./LiabilityClassDetailPanel";
import { LiabilityDetailPanel } from "./LiabilityDetailPanel";
import { MillerColumn, type MillerRow } from "./MillerColumn";
import { NetWorthStrip } from "./NetWorthStrip";
import { PlanPanel } from "@/components/plan/PlanPanel";
import type { StaleItem } from "./StalenessList";
import type {
  AssetClass,
  Holding,
  HoldingPatch,
  HoldingValuation,
  Liability,
  LiabilityClass,
  LiabilityPatch,
  LiabilityValuation,
  ProjectionAssumptions,
  TargetAllocation,
} from "./types";
import { submitJson } from "@/lib/http/client";
import { computeDistribution, sumHoldingsByAssetClass } from "@/lib/target-allocation/distribution";

// Column 1's sentinel row id for the "Liabilities" top-level branch (user
// story 56) — distinct from any real Asset Class id (those are uuids), so
// it can share the same `selectedClassId` state slot as an Asset Class
// selection without ever colliding with one.
const LIABILITIES_ROOT_ID = "liabilities-root";

export function PortfolioShell({
  userName,
  homeCurrency,
  currentUserId,
  assetClasses,
  holdings,
  valuations,
  liabilityClasses,
  liabilities,
  liabilityValuations,
  targetAllocations,
  priceCache,
  projectionAssumptions,
}: {
  userName: string;
  homeCurrency: string;
  currentUserId: string;
  assetClasses: AssetClass[];
  // `holdings`/`liabilities` include archived rows — the timeline below
  // needs them for the period they were owned (ticket 06, user story 20).
  // Everywhere else in this shell (the tree, current Net Worth) reads
  // `activeHoldings`/`activeLiabilities` instead.
  holdings: Holding[];
  valuations: HoldingValuation[];
  liabilityClasses: LiabilityClass[];
  liabilities: Liability[];
  liabilityValuations: LiabilityValuation[];
  targetAllocations: TargetAllocation[];
  priceCache: PriceCacheRow[];
  projectionAssumptions: ProjectionAssumptions | null;
}) {
  const router = useRouter();
  // Portfolio and Plan are sibling breadcrumb roots (ticket 09) — Plan
  // carries no further drill-down of its own, so it needs no selection
  // state beyond which root is active.
  const [activeRoot, setActiveRoot] = useState<"portfolio" | "plan">("portfolio");
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedHoldingId, setSelectedHoldingId] = useState<string | null>(null);
  const [selectedLiabilityClassId, setSelectedLiabilityClassId] = useState<string | null>(null);
  const [selectedLiabilityId, setSelectedLiabilityId] = useState<string | null>(null);

  const isLiabilitiesRoot = selectedClassId === LIABILITIES_ROOT_ID;

  const activeHoldings = useMemo(() => holdings.filter((h) => h.archived_at === null), [holdings]);
  const activeLiabilities = useMemo(
    () => liabilities.filter((l) => l.archived_at === null),
    [liabilities],
  );

  const selectedClass = !isLiabilitiesRoot
    ? (assetClasses.find((c) => c.id === selectedClassId) ?? null)
    : null;
  const holdingsInClass = useMemo(
    () => activeHoldings.filter((h) => h.asset_class_id === selectedClassId),
    [activeHoldings, selectedClassId],
  );
  const selectedHolding = holdingsInClass.find((h) => h.id === selectedHoldingId) ?? null;
  const selectedHoldingHistory = useMemo(
    () => valuations.filter((v) => v.holding_id === selectedHoldingId),
    [valuations, selectedHoldingId],
  );

  const selectedLiabilityClass =
    liabilityClasses.find((c) => c.id === selectedLiabilityClassId) ?? null;
  const liabilitiesInClass = useMemo(
    () => activeLiabilities.filter((l) => l.liability_class_id === selectedLiabilityClassId),
    [activeLiabilities, selectedLiabilityClassId],
  );
  const selectedLiability = liabilitiesInClass.find((l) => l.id === selectedLiabilityId) ?? null;
  const selectedLiabilityHistory = useMemo(
    () => liabilityValuations.filter((v) => v.liability_id === selectedLiabilityId),
    [liabilityValuations, selectedLiabilityId],
  );

  // Latest Valuation per Holding/Liability, across every row including
  // archived ones — safe to leave unfiltered here because every reader of
  // these maps (Miller rows, detail panels) only ever looks up an id drawn
  // from `holdingsInClass`/`liabilitiesInClass`, which are already
  // active-only.
  const latestByHolding = useMemo(() => latestValuationByHolding(valuations), [valuations]);
  const latestByLiability = useMemo(
    () => latestValuationByLiability(liabilityValuations),
    [liabilityValuations],
  );

  // Keyed by symbol, not by Holding — the cache is global and shared
  // across every Holding that happens to track the same symbol (ticket 07).
  const priceCacheBySymbol = useMemo(
    () => new Map(priceCache.map((row) => [row.symbol, row])),
    [priceCache],
  );

  // Current Net Worth reads only active owners' latest Valuations (user
  // story 19) — an archived Holding's last known value must not keep
  // inflating today's figure just because its row is still in the map above.
  const activeHoldingIds = useMemo(() => new Set(activeHoldings.map((h) => h.id)), [activeHoldings]);
  const activeLiabilityIds = useMemo(
    () => new Set(activeLiabilities.map((l) => l.id)),
    [activeLiabilities],
  );
  const netWorth = useMemo(() => {
    const currentHoldingValuations = [...latestByHolding.values()].filter((v) =>
      activeHoldingIds.has(v.holding_id),
    );
    const currentLiabilityValuations = [...latestByLiability.values()].filter((v) =>
      activeLiabilityIds.has(v.liability_id),
    );
    return computeNetWorth(currentHoldingValuations, currentLiabilityValuations);
  }, [latestByHolding, latestByLiability, activeHoldingIds, activeLiabilityIds]);

  // The recorded Net Worth timeline (user story 55) is the one place that
  // deliberately reads *every* Holding/Liability, archived or not — see
  // buildNetWorthTimeline's own doc comment for why.
  const timeline = useMemo(
    () => buildNetWorthTimeline(holdings, valuations, liabilities, liabilityValuations),
    [holdings, valuations, liabilities, liabilityValuations],
  );

  const staleItems = useMemo<StaleItem[]>(() => {
    const staleHoldings = activeHoldings.flatMap((holding) => {
      const latest = latestByHolding.get(holding.id);
      if (!latest || !isStale(latest.recorded_at)) return [];
      return [
        {
          id: `holding-${holding.id}`,
          name: holding.name,
          recordedAt: latest.recorded_at,
          onSelect: () => {
            selectRoot(holding.asset_class_id);
            setSelectedHoldingId(holding.id);
          },
        },
      ];
    });
    const staleLiabilities = activeLiabilities.flatMap((liability) => {
      const latest = latestByLiability.get(liability.id);
      if (!latest || !isStale(latest.recorded_at)) return [];
      return [
        {
          id: `liability-${liability.id}`,
          name: liability.name,
          recordedAt: latest.recorded_at,
          onSelect: () => {
            selectRoot(LIABILITIES_ROOT_ID);
            selectLiabilityClass(liability.liability_class_id);
            setSelectedLiabilityId(liability.id);
          },
        },
      ];
    });
    return [...staleHoldings, ...staleLiabilities].sort((a, b) => (a.recordedAt < b.recordedAt ? -1 : 1));
  }, [activeHoldings, activeLiabilities, latestByHolding, latestByLiability]);

  // Distribution across Asset Classes (user stories 52–54, 112–113) — the
  // same computed rows feed both the dashboard's bars and the Plan page's
  // editor, since "actual" means the same thing in both places. Built from
  // `activeHoldings` only: an archived Holding no longer counts toward
  // today's distribution, mirroring current Net Worth above.
  const targetPercentByClass = useMemo(
    () => new Map(targetAllocations.map((t) => [t.asset_class_id, t.target_percent])),
    [targetAllocations],
  );
  const distribution = useMemo(() => {
    const actualAmountByClass = sumHoldingsByAssetClass(activeHoldings, latestByHolding);
    return computeDistribution(assetClasses, actualAmountByClass, targetPercentByClass);
  }, [assetClasses, activeHoldings, latestByHolding, targetPercentByClass]);

  // The injected "today" the Projection engine runs from (ticket 10's pure
  // module takes no clock of its own) — computed once per mount rather than
  // per render, so the chart doesn't silently shift dates while a User sits
  // on the page.
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Each active Liability's current home-currency balance, plus its
  // Amortization Assumptions (ticket 11) converted by the same fx rate as
  // the balance — every dollar-valued input the engine runs on needs to be
  // in the same currency terms, and the Portfolio's projection already
  // treats today's fx rate as holding forward, exactly like the balance
  // itself. `interest_rate`/`term_months` aren't dollar amounts and are
  // passed through unconverted.
  const liabilitiesForProjection = useMemo(
    () =>
      activeLiabilities.map((liability) => {
        const latest = latestByLiability.get(liability.id);
        const fxRate = latest ? latest.fx_rate_to_home : 1;
        return {
          id: liability.id,
          currentAmount: latest ? latest.amount * fxRate : 0,
          amortization: toAmortizationInput(liability, fxRate),
        };
      }),
    [activeLiabilities, latestByLiability],
  );

  // Named liability lookups the payoff-marker labels need — kept here
  // rather than duplicated in each consumer.
  const liabilityNames = useMemo(
    () => new Map(liabilities.map((l) => [l.id, l.name])),
    [liabilities],
  );

  // The dashboard's projected line always reads the last *saved* assumption
  // set — unlike the Plan page's own chart, which the User is actively
  // editing and which reacts to the unsaved draft instead (ProjectionSection).
  const projectedFromSavedAssumptions: ProjectedNetWorthPoint[] = useMemo(() => {
    if (!projectionAssumptions) return [];
    return projectNetWorth({
      today,
      holdingsTotal: netWorth.holdingsTotal,
      liabilities: liabilitiesForProjection,
      assumptions: projectionAssumptions,
    });
  }, [today, netWorth.holdingsTotal, liabilitiesForProjection, projectionAssumptions]);

  // One payoff marker per amortizing Liability inside the horizon (user
  // story 76), named for the dashboard's own timeline — the Plan page's
  // chart computes its own set off the live draft (ProjectionSection).
  const payoffMarkersFromSavedAssumptions: PayoffMarker[] = useMemo(() => {
    if (!projectionAssumptions) return [];
    return projectPayoffMarkers({
      liabilities: liabilitiesForProjection,
      today,
      horizonYears: projectionAssumptions.horizon_years,
    });
  }, [today, liabilitiesForProjection, projectionAssumptions]);

  // Projected Net Position of a linked Holding/Liability pair, read from
  // whichever side is selected (user stories 64–65) — never called
  // "equity" (collides with the Equity Asset Class). `null` until both a
  // link exists and a saved Projection assumption set gives it a growth
  // rate and horizon to run on, mirroring the ad-hoc single-Holding
  // projection's own gating.
  const selectedLiabilityLinkedHolding = useMemo(() => {
    if (!selectedLiability?.linked_holding_id) return null;
    return holdings.find((h) => h.id === selectedLiability.linked_holding_id) ?? null;
  }, [selectedLiability, holdings]);

  const selectedLiabilityNetPosition = useMemo(() => {
    if (!projectionAssumptions || !selectedLiability || !selectedLiabilityLinkedHolding) return null;
    const holdingLatest = latestByHolding.get(selectedLiabilityLinkedHolding.id);
    if (!holdingLatest) return null;
    const liabilityLatest = latestByLiability.get(selectedLiability.id);
    return computeProjectedNetPosition({
      today,
      holdingCurrentAmount: holdingLatest.amount,
      holdingGrowthRate: projectionAssumptions.growth_rate,
      horizonYears: projectionAssumptions.horizon_years,
      linkedLiabilities: [
        {
          currentAmount: liabilityLatest ? liabilityLatest.amount : 0,
          amortization: toAmortizationInput(selectedLiability),
        },
      ],
    });
  }, [projectionAssumptions, selectedLiability, selectedLiabilityLinkedHolding, latestByHolding, latestByLiability, today]);

  // The reverse direction: every active Liability linking to the selected
  // Holding (usually one, but nothing stops two loans financing the same
  // Holding), summed against that Holding's own trajectory.
  const liabilitiesLinkedToSelectedHolding = useMemo(() => {
    if (!selectedHolding) return [];
    return activeLiabilities.filter((l) => l.linked_holding_id === selectedHolding.id);
  }, [selectedHolding, activeLiabilities]);

  const selectedHoldingNetPosition = useMemo(() => {
    if (!projectionAssumptions || !selectedHolding || liabilitiesLinkedToSelectedHolding.length === 0) {
      return null;
    }
    const holdingLatest = latestByHolding.get(selectedHolding.id);
    if (!holdingLatest) return null;
    return computeProjectedNetPosition({
      today,
      holdingCurrentAmount: holdingLatest.amount,
      holdingGrowthRate: projectionAssumptions.growth_rate,
      horizonYears: projectionAssumptions.horizon_years,
      linkedLiabilities: liabilitiesLinkedToSelectedHolding.map((liability) => {
        const latest = latestByLiability.get(liability.id);
        return {
          currentAmount: latest ? latest.amount : 0,
          amortization: toAmortizationInput(liability),
        };
      }),
    });
  }, [projectionAssumptions, selectedHolding, liabilitiesLinkedToSelectedHolding, latestByHolding, latestByLiability, today]);

  function activatePortfolioRoot() {
    setActiveRoot("portfolio");
  }

  function activatePlanRoot() {
    setActiveRoot("plan");
  }

  async function saveTargetAllocations(
    allocations: Array<{ asset_class_id: string; target_percent: number }>,
  ): Promise<string | null> {
    const failure = await submitJson("/api/target-allocation", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ allocations }),
    });
    if (failure) return failure;
    router.refresh();
    return null;
  }

  async function saveProjectionAssumptions(assumptions: ProjectionAssumptions): Promise<string | null> {
    const failure = await submitJson("/api/projection", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(assumptions),
    });
    if (failure) return failure;
    router.refresh();
    return null;
  }

  function selectRoot(id: string) {
    setSelectedClassId(id);
    setSelectedHoldingId(null);
    setSelectedLiabilityClassId(null);
    setSelectedLiabilityId(null);
  }

  function selectLiabilityClass(id: string) {
    setSelectedLiabilityClassId(id);
    setSelectedLiabilityId(null);
  }

  function goToPortfolioRoot() {
    setSelectedClassId(null);
    setSelectedHoldingId(null);
    setSelectedLiabilityClassId(null);
    setSelectedLiabilityId(null);
  }

  async function addAssetClass(name: string): Promise<string | null> {
    const failure = await submitJson("/api/asset-classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (failure) return failure;
    router.refresh();
    return null;
  }

  async function deleteAssetClass(id: string): Promise<string | null> {
    const failure = await submitJson(`/api/asset-classes/${id}`, { method: "DELETE" });
    if (failure) return failure;
    if (selectedClassId === id) goToPortfolioRoot();
    router.refresh();
    return null;
  }

  async function addHolding(
    name: string,
    currency: string,
    priceLookup: { price_lookup_symbol: string; quantity: number } | null,
  ): Promise<string | null> {
    if (!selectedClassId || isLiabilitiesRoot) return "Select an Asset Class first.";
    const failure = await submitJson("/api/holdings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        currency,
        asset_class_id: selectedClassId,
        ...priceLookup,
      }),
    });
    if (failure) return failure;
    router.refresh();
    return null;
  }

  async function saveHolding(id: string, patch: HoldingPatch): Promise<string | null> {
    const failure = await submitJson(`/api/holdings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (failure) return failure;
    if (patch.asset_class_id !== selectedClassId) selectRoot(patch.asset_class_id);
    router.refresh();
    return null;
  }

  async function archiveHolding(id: string): Promise<string | null> {
    const failure = await submitJson(`/api/holdings/${id}/archive`, { method: "POST" });
    if (failure) return failure;
    setSelectedHoldingId(null);
    router.refresh();
    return null;
  }

  async function deleteHolding(id: string): Promise<string | null> {
    const failure = await submitJson(`/api/holdings/${id}`, { method: "DELETE" });
    if (failure) return failure;
    setSelectedHoldingId(null);
    router.refresh();
    return null;
  }

  async function recordValuation(
    holdingId: string,
    amount: number,
    recordedAt: string,
  ): Promise<string | null> {
    const failure = await submitJson(`/api/holdings/${holdingId}/valuations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, recorded_at: recordedAt }),
    });
    if (failure) return failure;
    router.refresh();
    return null;
  }

  async function addLiabilityClass(name: string): Promise<string | null> {
    const failure = await submitJson("/api/liability-classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (failure) return failure;
    router.refresh();
    return null;
  }

  async function deleteLiabilityClass(id: string): Promise<string | null> {
    const failure = await submitJson(`/api/liability-classes/${id}`, { method: "DELETE" });
    if (failure) return failure;
    if (selectedLiabilityClassId === id) {
      setSelectedLiabilityClassId(null);
      setSelectedLiabilityId(null);
    }
    router.refresh();
    return null;
  }

  async function addLiability(name: string, currency: string): Promise<string | null> {
    if (!selectedLiabilityClassId) return "Select a Liability Class first.";
    const failure = await submitJson("/api/liabilities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, currency, liability_class_id: selectedLiabilityClassId }),
    });
    if (failure) return failure;
    router.refresh();
    return null;
  }

  async function saveLiability(id: string, patch: LiabilityPatch): Promise<string | null> {
    const failure = await submitJson(`/api/liabilities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (failure) return failure;
    if (patch.liability_class_id !== selectedLiabilityClassId) {
      selectLiabilityClass(patch.liability_class_id);
    }
    router.refresh();
    return null;
  }

  async function archiveLiability(id: string): Promise<string | null> {
    const failure = await submitJson(`/api/liabilities/${id}/archive`, { method: "POST" });
    if (failure) return failure;
    setSelectedLiabilityId(null);
    router.refresh();
    return null;
  }

  async function deleteLiability(id: string): Promise<string | null> {
    const failure = await submitJson(`/api/liabilities/${id}`, { method: "DELETE" });
    if (failure) return failure;
    setSelectedLiabilityId(null);
    router.refresh();
    return null;
  }

  async function recordLiabilityValuation(
    liabilityId: string,
    amount: number,
    recordedAt: string,
  ): Promise<string | null> {
    const failure = await submitJson(`/api/liabilities/${liabilityId}/valuations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, recorded_at: recordedAt }),
    });
    if (failure) return failure;
    router.refresh();
    return null;
  }

  const classRows: MillerRow[] = [
    ...assetClasses.map((assetClass) => ({
      id: assetClass.id,
      label: assetClass.name,
      icon: <AssetClassIcon assetClassId={assetClass.id} />,
    })),
    {
      id: LIABILITIES_ROOT_ID,
      label: "Liabilities",
      icon: <LiabilitiesRootIcon />,
    },
  ];

  const holdingRows: MillerRow[] = holdingsInClass.map((holding) => {
    const latest = latestByHolding.get(holding.id);
    const stale = latest ? isStale(latest.recorded_at) : false;
    return {
      id: holding.id,
      label: (
        <span className="flex w-full items-center justify-between gap-2">
          <span className="truncate">{holding.name}</span>
          <span
            className={`shrink-0 text-xs ${stale ? "text-zinc-400 dark:text-zinc-600" : "text-zinc-500 dark:text-zinc-400"}`}
          >
            {latest ? formatMoney(latest.amount, holding.currency) : "—"}
            {latest ? ` · ${daysAgoLabel(latest.recorded_at)}` : ""}
          </span>
        </span>
      ),
    };
  });

  const liabilityClassRows: MillerRow[] = liabilityClasses.map((liabilityClass) => ({
    id: liabilityClass.id,
    label: liabilityClass.name,
    icon: <LiabilityClassIcon liabilityClassId={liabilityClass.id} />,
  }));

  const liabilityRows: MillerRow[] = liabilitiesInClass.map((liability) => {
    const latest = latestByLiability.get(liability.id);
    const stale = latest ? isStale(latest.recorded_at) : false;
    return {
      id: liability.id,
      label: (
        <span className="flex w-full items-center justify-between gap-2">
          <span className="truncate">{liability.name}</span>
          <span
            className={`shrink-0 text-xs ${stale ? "text-zinc-400 dark:text-zinc-600" : "text-zinc-500 dark:text-zinc-400"}`}
          >
            {latest ? formatMoney(latest.amount, liability.currency) : "—"}
            {latest ? ` · ${daysAgoLabel(latest.recorded_at)}` : ""}
          </span>
        </span>
      ),
    };
  });

  // Plan has no further drill-down of its own (ticket 09), so it only ever
  // contributes the empty continuation — the breadcrumb roots below are
  // Plan's entire trail.
  const breadcrumbSegments =
    activeRoot === "plan"
      ? []
      : isLiabilitiesRoot
        ? [
            {
              label: "Liabilities",
              onClick: () => {
                setSelectedLiabilityClassId(null);
                setSelectedLiabilityId(null);
              },
            },
            ...(selectedLiabilityClass
              ? [{ label: selectedLiabilityClass.name, onClick: () => setSelectedLiabilityId(null) }]
              : []),
            ...(selectedLiability ? [{ label: selectedLiability.name }] : []),
          ]
        : [
            ...(selectedClass
              ? [{ label: selectedClass.name, onClick: () => setSelectedHoldingId(null) }]
              : []),
            ...(selectedHolding ? [{ label: selectedHolding.name }] : []),
          ];

  const breadcrumbRoots = [
    { label: "Portfolio", isActive: activeRoot === "portfolio", onSelect: activatePortfolioRoot },
    { label: "Plan", isActive: activeRoot === "plan", onSelect: activatePlanRoot },
  ];

  return (
    <div className="flex flex-1 flex-col">
      <NetWorthStrip homeCurrency={homeCurrency} netWorth={netWorth} userName={userName} />
      <Breadcrumb roots={breadcrumbRoots} segments={breadcrumbSegments} />
      {activeRoot === "plan" ? (
        <div className="flex flex-1 overflow-hidden border-t border-hairline">
          <PlanPanel
            rows={distribution}
            onSaveTargets={saveTargetAllocations}
            today={today}
            homeCurrency={homeCurrency}
            holdingsTotal={netWorth.holdingsTotal}
            liabilities={liabilitiesForProjection}
            liabilityNames={liabilityNames}
            recordedTimeline={timeline}
            projectionAssumptions={projectionAssumptions}
            onSaveProjection={saveProjectionAssumptions}
          />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden border-t border-hairline">
          <MillerColumn
            label="Portfolio"
            rows={classRows}
            selectedId={selectedClassId}
            onSelect={selectRoot}
            footer={<AddAssetClassRow onAdd={addAssetClass} />}
          />

          {isLiabilitiesRoot && (
            <MillerColumn
              label="Liability Classes"
              rows={liabilityClassRows}
              selectedId={selectedLiabilityClassId}
              onSelect={selectLiabilityClass}
              footer={<AddLiabilityClassRow onAdd={addLiabilityClass} />}
            />
          )}

          {isLiabilitiesRoot && selectedLiabilityClass && (
            <MillerColumn
              label="Liabilities"
              rows={liabilityRows}
              selectedId={selectedLiabilityId}
              onSelect={setSelectedLiabilityId}
              footer={<AddLiabilityRow onAdd={addLiability} />}
            />
          )}

          {selectedClass && (
            <MillerColumn
              label="Holdings"
              rows={holdingRows}
              selectedId={selectedHoldingId}
              onSelect={setSelectedHoldingId}
              footer={<AddHoldingRow onAdd={addHolding} />}
            />
          )}

          {selectedLiability ? (
            <LiabilityDetailPanel
              key={selectedLiability.id}
              liability={selectedLiability}
              liabilityClasses={liabilityClasses}
              latestValuation={latestByLiability.get(selectedLiability.id) ?? null}
              history={selectedLiabilityHistory}
              today={today}
              projectionAssumptions={projectionAssumptions}
              linkableHoldings={activeHoldings}
              linkedHolding={selectedLiabilityLinkedHolding}
              netPosition={selectedLiabilityNetPosition}
              onRecordValuation={(amount, recordedAt) =>
                recordLiabilityValuation(selectedLiability.id, amount, recordedAt)
              }
              onSave={(patch) => saveLiability(selectedLiability.id, patch)}
              onArchive={() => archiveLiability(selectedLiability.id)}
              onDelete={() => deleteLiability(selectedLiability.id)}
            />
          ) : selectedHolding ? (
            <HoldingDetailPanel
              key={selectedHolding.id}
              holding={selectedHolding}
              assetClasses={assetClasses}
              latestValuation={latestByHolding.get(selectedHolding.id) ?? null}
              history={selectedHoldingHistory}
              today={today}
              projectionAssumptions={projectionAssumptions}
              linkedLiabilities={liabilitiesLinkedToSelectedHolding}
              netPosition={selectedHoldingNetPosition}
              priceCache={
                selectedHolding.price_lookup_symbol
                  ? (priceCacheBySymbol.get(selectedHolding.price_lookup_symbol) ?? null)
                  : null
              }
              onRecordValuation={(amount, recordedAt) =>
                recordValuation(selectedHolding.id, amount, recordedAt)
              }
              onSave={(patch) => saveHolding(selectedHolding.id, patch)}
              onArchive={() => archiveHolding(selectedHolding.id)}
              onDelete={() => deleteHolding(selectedHolding.id)}
            />
          ) : selectedLiabilityClass ? (
            <LiabilityClassDetailPanel
              key={selectedLiabilityClass.id}
              liabilityClass={selectedLiabilityClass}
              isOwnedByCurrentUser={selectedLiabilityClass.owner_id === currentUserId}
              liabilityCount={liabilitiesInClass.length}
              onDelete={() => deleteLiabilityClass(selectedLiabilityClass.id)}
            />
          ) : selectedClass ? (
            <AssetClassDetailPanel
              key={selectedClass.id}
              assetClass={selectedClass}
              isOwnedByCurrentUser={selectedClass.owner_id === currentUserId}
              holdingCount={holdingsInClass.length}
              onDelete={() => deleteAssetClass(selectedClass.id)}
            />
          ) : isLiabilitiesRoot ? (
            <LiabilitiesRootPanel
              homeCurrency={homeCurrency}
              liabilitiesTotal={netWorth.liabilitiesTotal}
              liabilityClassCount={liabilityClasses.length}
              liabilityCount={activeLiabilities.length}
            />
          ) : (
            <DashboardPanel
              today={today}
              homeCurrency={homeCurrency}
              netWorth={netWorth}
              timeline={timeline}
              projected={projectedFromSavedAssumptions}
              payoffMarkers={payoffMarkersFromSavedAssumptions}
              liabilityNames={liabilityNames}
              staleItems={staleItems}
              distribution={distribution}
              targetAmount={projectionAssumptions?.target_amount ?? null}
              targetDate={projectionAssumptions?.target_date ?? null}
            />
          )}
        </div>
      )}
    </div>
  );
}
