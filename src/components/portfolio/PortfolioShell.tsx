"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AssetClassIcon } from "@/components/icons/AssetClassIcon";
import { AddAssetClassRow } from "./AddAssetClassRow";
import { AddHoldingRow } from "./AddHoldingRow";
import { AssetClassDetailPanel } from "./AssetClassDetailPanel";
import { Breadcrumb } from "./Breadcrumb";
import { DashboardPanel } from "./DashboardPanel";
import { HoldingDetailPanel } from "./HoldingDetailPanel";
import { MillerColumn, type MillerRow } from "./MillerColumn";
import type { AssetClass, Holding, HoldingPatch } from "./types";
import { submitJson } from "@/lib/http/client";

export function PortfolioShell({
  userEmail,
  homeCurrency,
  currentUserId,
  assetClasses,
  holdings,
}: {
  userEmail: string;
  homeCurrency: string;
  currentUserId: string;
  assetClasses: AssetClass[];
  holdings: Holding[];
}) {
  const router = useRouter();
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedHoldingId, setSelectedHoldingId] = useState<string | null>(null);

  const selectedClass = assetClasses.find((c) => c.id === selectedClassId) ?? null;
  const holdingsInClass = useMemo(
    () => holdings.filter((h) => h.asset_class_id === selectedClassId),
    [holdings, selectedClassId],
  );
  const selectedHolding = holdingsInClass.find((h) => h.id === selectedHoldingId) ?? null;

  function selectClass(id: string) {
    setSelectedClassId(id);
    setSelectedHoldingId(null);
  }

  function goToPortfolioRoot() {
    setSelectedClassId(null);
    setSelectedHoldingId(null);
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
    if (!selectedClassId) return "Select an Asset Class first.";
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
    if (patch.asset_class_id !== selectedClassId) selectClass(patch.asset_class_id);
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

  const classRows: MillerRow[] = assetClasses.map((assetClass) => ({
    id: assetClass.id,
    label: assetClass.name,
    icon: <AssetClassIcon assetClassId={assetClass.id} />,
  }));

  const holdingRows: MillerRow[] = holdingsInClass.map((holding) => ({
    id: holding.id,
    label: holding.name,
  }));

  const breadcrumbSegments = [
    { label: "Portfolio", onClick: goToPortfolioRoot },
    ...(selectedClass
      ? [{ label: selectedClass.name, onClick: () => setSelectedHoldingId(null) }]
      : []),
    ...(selectedHolding ? [{ label: selectedHolding.name }] : []),
  ];

  return (
    <div className="flex flex-1 flex-col">
      <Breadcrumb segments={breadcrumbSegments} />
      <div className="flex flex-1 overflow-hidden border-t border-hairline">
        <MillerColumn
          label="Asset Classes"
          rows={classRows}
          selectedId={selectedClassId}
          onSelect={selectClass}
          footer={<AddAssetClassRow onAdd={addAssetClass} />}
        />

        {selectedClass && (
          <MillerColumn
            label="Holdings"
            rows={holdingRows}
            selectedId={selectedHoldingId}
            onSelect={setSelectedHoldingId}
            footer={<AddHoldingRow onAdd={addHolding} />}
          />
        )}

        {selectedHolding ? (
          <HoldingDetailPanel
            key={selectedHolding.id}
            holding={selectedHolding}
            assetClasses={assetClasses}
            onSave={(patch) => saveHolding(selectedHolding.id, patch)}
            onDelete={() => deleteHolding(selectedHolding.id)}
          />
        ) : selectedClass ? (
          <AssetClassDetailPanel
            key={selectedClass.id}
            assetClass={selectedClass}
            isOwnedByCurrentUser={selectedClass.owner_id === currentUserId}
            holdingCount={holdingsInClass.length}
            onDelete={() => deleteAssetClass(selectedClass.id)}
          />
        ) : (
          <DashboardPanel userEmail={userEmail} homeCurrency={homeCurrency} />
        )}
      </div>
    </div>
  );
}
