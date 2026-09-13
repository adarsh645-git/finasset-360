"use client";

import { useEffect, useState } from "react";
import { AssetClassIcon } from "@/components/icons/AssetClassIcon";
import { LiabilitiesRootIcon, LiabilityClassIcon } from "@/components/icons/LiabilityClassIcon";
import { DistributionBar } from "@/components/plan/DistributionBar";
import type { CheckInScope } from "@/lib/check-in/queue";
import { formatMoney } from "@/lib/currency/format";
import type { NetWorthSummary } from "@/lib/net-worth/compute";
import type { NetWorthTimelinePoint } from "@/lib/net-worth/timeline";
import type { PayoffMarker, ProjectedNetWorthPoint } from "@/lib/projection/engine";
import type { AssetClassDistributionRow } from "@/lib/target-allocation/distribution";
import { daysAgoLabel, isStale } from "@/lib/valuations/staleness";
import { CheckInLauncher } from "./CheckInLauncher";
import { NetWorthHero } from "./NetWorthHero";
import { StalenessList, type StaleItem } from "./StalenessList";
import type {
  AssetClass,
  Holding,
  HoldingValuation,
  Liability,
  LiabilityClass,
  LiabilityValuation,
} from "./types";

const EXPANDED_STORAGE_KEY = "finasset360:narrowOutlineExpanded";
const LIABILITIES_BRANCH_KEY = "liabilities";

/** Which accordion branches are open, persisted across visits (ticket 15
 * leaves this decision to the build session; the prototype reset it on
 * every visit, but a User re-opening the same phone dashboard a day later
 * to check the same couple of Asset Classes would otherwise re-expand them
 * by hand every time — `localStorage` is a per-device UI preference with no
 * server-side meaning, so it doesn't warrant a schema change). Hydrated
 * after mount, not in the initial state, so server and client render the
 * same collapsed markup and avoid a hydration mismatch. */
function useExpandedBranches(): [Set<string>, (key: string) => void] {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(EXPANDED_STORAGE_KEY);
      // Reading `localStorage` needs to happen after mount, not in the
      // lazy initializer above — `window` doesn't exist during the server
      // render, and computing this on the client's first render instead
      // would make that render disagree with the server-rendered HTML.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setExpanded(new Set(JSON.parse(raw)));
    } catch {
      // Corrupt or inaccessible storage — start collapsed, same as a first
      // visit ever would.
    }
  }, []);

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      try {
        window.localStorage.setItem(EXPANDED_STORAGE_KEY, JSON.stringify([...next]));
      } catch {
        // Best-effort only — a full or blocked store shouldn't break
        // expand/collapse itself, just its persistence.
      }
      return next;
    });
  }

  return [expanded, toggle];
}

function AccordionBranch({
  isExpanded,
  onToggle,
  icon,
  label,
  children,
}: {
  isExpanded: boolean;
  onToggle: () => void;
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="flex min-h-11 w-full items-center gap-2.5 px-3 text-left text-sm"
      >
        <span
          aria-hidden="true"
          className={`shrink-0 text-xs transition-transform ${isExpanded ? "rotate-90" : ""}`}
        >
          ▸
        </span>
        {icon}
        <span className="truncate font-medium">{label}</span>
      </button>
      {isExpanded && <div className="pl-8">{children}</div>}
    </div>
  );
}

function LeafRow({
  name,
  currency,
  latest,
  onSelect,
}: {
  name: string;
  currency: string;
  latest: { amount: number; recorded_at: string } | null;
  onSelect: () => void;
}) {
  const stale = latest ? isStale(latest.recorded_at) : false;
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex min-h-11 w-full items-center justify-between gap-2 px-3 text-left text-sm"
    >
      <span className="min-w-0 truncate">{name}</span>
      <span
        className={`shrink-0 text-xs ${stale ? "text-zinc-400 dark:text-zinc-600" : "text-zinc-500 dark:text-zinc-400"}`}
      >
        {latest ? formatMoney(latest.amount, currency) : "—"}
        {latest ? ` · ${daysAgoLabel(latest.recorded_at)}` : ""}
      </span>
    </button>
  );
}

// The narrow-viewport (<900px) replacement for the Miller-column shell
// (ticket 15): an accordion outline instead of drill-down columns, since
// several branches open at once is exactly the thing Miller columns can't
// do and a phone-sized staleness sweep needs. Section order matches the
// spec's own: Net Worth → Portfolio outline → Target Allocation, staleness,
// Start Check-in. Leaves (Holdings/Liabilities) don't carry their own detail
// here — tapping one calls `onSelectHolding`/`onSelectLiability`, which
// PortfolioShell wires to the *same* selection state its desktop Miller
// columns use, so the bottom sheet it opens around this component shows the
// identical detail panel desktop would have shown inline.
export function NarrowShell({
  homeCurrency,
  netWorth,
  timeline,
  projected,
  payoffMarkers,
  liabilityNames,
  targetAmount,
  assetClasses,
  holdingsByAssetClass,
  liabilityClasses,
  liabilitiesByLiabilityClass,
  latestByHolding,
  latestByLiability,
  onSelectHolding,
  onSelectLiability,
  distribution,
  staleItems,
  onStartCheckIn,
}: {
  homeCurrency: string;
  netWorth: NetWorthSummary;
  timeline: NetWorthTimelinePoint[];
  projected: ProjectedNetWorthPoint[];
  payoffMarkers: PayoffMarker[];
  liabilityNames: Map<string, string>;
  targetAmount: number | null;
  assetClasses: AssetClass[];
  holdingsByAssetClass: Map<string, Holding[]>;
  liabilityClasses: LiabilityClass[];
  liabilitiesByLiabilityClass: Map<string, Liability[]>;
  latestByHolding: Map<string, HoldingValuation>;
  latestByLiability: Map<string, LiabilityValuation>;
  onSelectHolding: (assetClassId: string, holdingId: string) => void;
  onSelectLiability: (liabilityClassId: string, liabilityId: string) => void;
  distribution: AssetClassDistributionRow[];
  staleItems: StaleItem[];
  onStartCheckIn: (scope: CheckInScope) => void;
}) {
  const [expanded, toggleExpanded] = useExpandedBranches();

  return (
    <div className="flex flex-1 flex-col gap-8 overflow-y-auto overflow-x-hidden px-4 py-6">
      <section>
        <NetWorthHero
          homeCurrency={homeCurrency}
          netWorth={netWorth}
          timeline={timeline}
          projected={projected}
          payoffMarkers={payoffMarkers}
          liabilityNames={liabilityNames}
          targetAmount={targetAmount}
        />
      </section>

      <section className="flex flex-col gap-1 rounded-lg border border-hairline py-2">
        <h2 className="px-3 pb-1 text-sm font-medium text-zinc-500 dark:text-zinc-400">Portfolio</h2>
        {assetClasses.map((assetClass) => (
          <AccordionBranch
            key={assetClass.id}
            isExpanded={expanded.has(assetClass.id)}
            onToggle={() => toggleExpanded(assetClass.id)}
            icon={<AssetClassIcon assetClassId={assetClass.id} />}
            label={assetClass.name}
          >
            {(holdingsByAssetClass.get(assetClass.id) ?? []).map((holding) => (
              <LeafRow
                key={holding.id}
                name={holding.name}
                currency={holding.currency}
                latest={latestByHolding.get(holding.id) ?? null}
                onSelect={() => onSelectHolding(assetClass.id, holding.id)}
              />
            ))}
          </AccordionBranch>
        ))}

        <AccordionBranch
          isExpanded={expanded.has(LIABILITIES_BRANCH_KEY)}
          onToggle={() => toggleExpanded(LIABILITIES_BRANCH_KEY)}
          icon={<LiabilitiesRootIcon />}
          label="Liabilities"
        >
          {liabilityClasses.map((liabilityClass) => (
            <AccordionBranch
              key={liabilityClass.id}
              isExpanded={expanded.has(liabilityClass.id)}
              onToggle={() => toggleExpanded(liabilityClass.id)}
              icon={<LiabilityClassIcon liabilityClassId={liabilityClass.id} />}
              label={liabilityClass.name}
            >
              {(liabilitiesByLiabilityClass.get(liabilityClass.id) ?? []).map((liability) => (
                <LeafRow
                  key={liability.id}
                  name={liability.name}
                  currency={liability.currency}
                  latest={latestByLiability.get(liability.id) ?? null}
                  onSelect={() => onSelectLiability(liabilityClass.id, liability.id)}
                />
              ))}
            </AccordionBranch>
          ))}
        </AccordionBranch>
      </section>

      <section className="flex flex-col gap-4 rounded-lg border border-hairline p-4">
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Target Allocation</h2>
          {distribution.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Add a Holding to see your distribution.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {distribution.map((row) => (
                <DistributionBar key={row.assetClassId} row={row} homeCurrency={homeCurrency} />
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Needs an update</h2>
          <StalenessList items={staleItems} />
        </div>

        <CheckInLauncher staleCount={staleItems.length} onStartCheckIn={onStartCheckIn} />
      </section>
    </div>
  );
}
