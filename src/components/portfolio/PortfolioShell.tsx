"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AssetClassIcon } from "@/components/icons/AssetClassIcon";
import { LiabilitiesRootIcon, LiabilityClassIcon } from "@/components/icons/LiabilityClassIcon";
import { formatMoney } from "@/lib/currency/format";
import type { PriceCacheRow } from "@/lib/market-data/live-estimate";
import { computeNetWorth } from "@/lib/net-worth/compute";
import { buildNetWorthTimeline } from "@/lib/net-worth/timeline";
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
} from "./types";
import { submitJson } from "@/lib/http/client";

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
  priceCache,
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
  priceCache: PriceCacheRow[];
}) {
  const router = useRouter();
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

  const breadcrumbSegments = [
    { label: "Portfolio", onClick: goToPortfolioRoot },
    ...(isLiabilitiesRoot
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
        ]),
  ];

  return (
    <div className="flex flex-1 flex-col">
      <NetWorthStrip homeCurrency={homeCurrency} netWorth={netWorth} userName={userName} />
      <Breadcrumb segments={breadcrumbSegments} />
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
            homeCurrency={homeCurrency}
            netWorth={netWorth}
            timeline={timeline}
            staleItems={staleItems}
          />
        )}
      </div>
    </div>
  );
}
