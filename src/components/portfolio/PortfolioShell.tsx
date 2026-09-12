"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AssetClassIcon } from "@/components/icons/AssetClassIcon";
import { LiabilitiesRootIcon, LiabilityClassIcon } from "@/components/icons/LiabilityClassIcon";
import { formatMoney } from "@/lib/currency/format";
import { computeNetWorth } from "@/lib/net-worth/compute";
import { latestValuationByHolding, latestValuationByLiability } from "@/lib/valuations/latest";
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
  userEmail,
  homeCurrency,
  currentUserId,
  assetClasses,
  holdings,
  valuations,
  liabilityClasses,
  liabilities,
  liabilityValuations,
}: {
  userEmail: string;
  homeCurrency: string;
  currentUserId: string;
  assetClasses: AssetClass[];
  holdings: Holding[];
  valuations: HoldingValuation[];
  liabilityClasses: LiabilityClass[];
  liabilities: Liability[];
  liabilityValuations: LiabilityValuation[];
}) {
  const router = useRouter();
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedHoldingId, setSelectedHoldingId] = useState<string | null>(null);
  const [selectedLiabilityClassId, setSelectedLiabilityClassId] = useState<string | null>(null);
  const [selectedLiabilityId, setSelectedLiabilityId] = useState<string | null>(null);

  const isLiabilitiesRoot = selectedClassId === LIABILITIES_ROOT_ID;

  const selectedClass = !isLiabilitiesRoot
    ? (assetClasses.find((c) => c.id === selectedClassId) ?? null)
    : null;
  const holdingsInClass = useMemo(
    () => holdings.filter((h) => h.asset_class_id === selectedClassId),
    [holdings, selectedClassId],
  );
  const selectedHolding = holdingsInClass.find((h) => h.id === selectedHoldingId) ?? null;

  const selectedLiabilityClass =
    liabilityClasses.find((c) => c.id === selectedLiabilityClassId) ?? null;
  const liabilitiesInClass = useMemo(
    () => liabilities.filter((l) => l.liability_class_id === selectedLiabilityClassId),
    [liabilities, selectedLiabilityClassId],
  );
  const selectedLiability = liabilitiesInClass.find((l) => l.id === selectedLiabilityId) ?? null;

  const latestByHolding = useMemo(() => latestValuationByHolding(valuations), [valuations]);
  const latestByLiability = useMemo(
    () => latestValuationByLiability(liabilityValuations),
    [liabilityValuations],
  );
  const netWorth = useMemo(
    () => computeNetWorth([...latestByHolding.values()], [...latestByLiability.values()]),
    [latestByHolding, latestByLiability],
  );

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

  async function addHolding(name: string, currency: string): Promise<string | null> {
    if (!selectedClassId || isLiabilitiesRoot) return "Select an Asset Class first.";
    const failure = await submitJson("/api/holdings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, currency, asset_class_id: selectedClassId }),
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
    return {
      id: holding.id,
      label: (
        <span className="flex w-full items-center justify-between gap-2">
          <span className="truncate">{holding.name}</span>
          <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
            {latest ? formatMoney(latest.amount, holding.currency) : "—"}
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
    return {
      id: liability.id,
      label: (
        <span className="flex w-full items-center justify-between gap-2">
          <span className="truncate">{liability.name}</span>
          <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
            {latest ? formatMoney(latest.amount, liability.currency) : "—"}
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
      <NetWorthStrip homeCurrency={homeCurrency} netWorth={netWorth} />
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
            onRecordValuation={(amount, recordedAt) =>
              recordLiabilityValuation(selectedLiability.id, amount, recordedAt)
            }
            onSave={(patch) => saveLiability(selectedLiability.id, patch)}
            onDelete={() => deleteLiability(selectedLiability.id)}
          />
        ) : selectedHolding ? (
          <HoldingDetailPanel
            key={selectedHolding.id}
            holding={selectedHolding}
            assetClasses={assetClasses}
            latestValuation={latestByHolding.get(selectedHolding.id) ?? null}
            onRecordValuation={(amount, recordedAt) =>
              recordValuation(selectedHolding.id, amount, recordedAt)
            }
            onSave={(patch) => saveHolding(selectedHolding.id, patch)}
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
            liabilityCount={liabilities.length}
          />
        ) : (
          <DashboardPanel userEmail={userEmail} homeCurrency={homeCurrency} netWorth={netWorth} />
        )}
      </div>
    </div>
  );
}
