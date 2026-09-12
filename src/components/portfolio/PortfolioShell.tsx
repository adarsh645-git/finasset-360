"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AssetClassIcon } from "@/components/icons/AssetClassIcon";
import { formatMoney } from "@/lib/currency/format";
import { computeNetWorth } from "@/lib/net-worth/compute";
import { latestValuationByHolding } from "@/lib/valuations/latest";
import { AddAssetClassRow } from "./AddAssetClassRow";
import { AddHoldingRow } from "./AddHoldingRow";
import { AssetClassDetailPanel } from "./AssetClassDetailPanel";
import { Breadcrumb } from "./Breadcrumb";
import { DashboardPanel } from "./DashboardPanel";
import { HoldingDetailPanel } from "./HoldingDetailPanel";
import { MillerColumn, type MillerRow } from "./MillerColumn";
import { NetWorthStrip } from "./NetWorthStrip";
import type { AssetClass, Holding, HoldingPatch, HoldingValuation } from "./types";
import { submitJson } from "@/lib/http/client";

export function PortfolioShell({
  userEmail,
  homeCurrency,
  currentUserId,
  assetClasses,
  holdings,
  valuations,
}: {
  userEmail: string;
  homeCurrency: string;
  currentUserId: string;
  assetClasses: AssetClass[];
  holdings: Holding[];
  valuations: HoldingValuation[];
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

  const latestByHolding = useMemo(() => latestValuationByHolding(valuations), [valuations]);
  const netWorth = useMemo(
    () => computeNetWorth([...latestByHolding.values()]),
    [latestByHolding],
  );

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

  const classRows: MillerRow[] = assetClasses.map((assetClass) => ({
    id: assetClass.id,
    label: assetClass.name,
    icon: <AssetClassIcon assetClassId={assetClass.id} />,
  }));

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

  const breadcrumbSegments = [
    { label: "Portfolio", onClick: goToPortfolioRoot },
    ...(selectedClass
      ? [{ label: selectedClass.name, onClick: () => setSelectedHoldingId(null) }]
      : []),
    ...(selectedHolding ? [{ label: selectedHolding.name }] : []),
  ];

  return (
    <div className="flex flex-1 flex-col">
      <NetWorthStrip homeCurrency={homeCurrency} netWorth={netWorth} />
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
            latestValuation={latestByHolding.get(selectedHolding.id) ?? null}
            onRecordValuation={(amount, recordedAt) =>
              recordValuation(selectedHolding.id, amount, recordedAt)
            }
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
          <DashboardPanel userEmail={userEmail} homeCurrency={homeCurrency} netWorth={netWorth} />
        )}
      </div>
    </div>
  );
}
