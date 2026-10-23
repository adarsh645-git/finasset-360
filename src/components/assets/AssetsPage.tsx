"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { RowLink } from "@/components/overview/RowLink";
import type { AssetClassId, PortfolioData } from "@/lib/read-model/types";
import {
  buildAssetsView,
  toggleAllGroups,
  toggleFilter,
  toggleGroup,
  type Grouping,
} from "@/lib/views/assets";

const CARD =
  "rounded-[14px] border border-line bg-panel shadow-[var(--shadow)]";
const BUTTON =
  "flex h-10 items-center rounded-lg border border-line px-3.5 text-[13.5px] font-medium hover:bg-hover";

// Holds the list's view state and asks the pure view-model for what to show.
export function AssetsPage({ data }: { data: PortfolioData }) {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [filter, setFilter] = useState<AssetClassId | null>(null);
  const [grouping, setGrouping] = useState<Grouping>("class");
  const [query, setQuery] = useState("");
  const view = useMemo(
    () => buildAssetsView(data, { collapsed, filter, grouping, query }),
    [data, collapsed, filter, grouping, query],
  );

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2.5">
          <h1 className="font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-ink3">
            Assets
          </h1>
          <span className="text-[clamp(36px,6vw,48px)] font-medium leading-none tracking-[-0.035em] tabular-nums">
            {view.header.total}
          </span>
          {view.header.subtitle && (
            <span className="text-[13.5px] text-ink2">
              {view.header.subtitle}
            </span>
          )}
        </div>
        {view.addHref && (
          <Link href={view.addHref} className={BUTTON}>
            + Add asset
          </Link>
        )}
      </header>

      {view.empty ? (
        <section className={`${CARD} flex flex-col gap-2 p-5`}>
          <h2 className="text-[15px] font-semibold">{view.empty.message}</h2>
          {view.empty.addHref && (
            <Link
              href={view.empty.addHref}
              className="mt-1 flex h-10 w-fit items-center rounded-lg bg-ink px-4 text-[13.5px] font-medium text-bg"
            >
              Add
            </Link>
          )}
        </section>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
            {view.tiles.map((tile) => (
              <button
                key={tile.id}
                type="button"
                aria-pressed={tile.selected}
                onClick={() => setFilter(toggleFilter(filter, tile.id))}
                className={`${CARD} flex min-h-10 flex-col gap-1 p-3 text-left hover:bg-hover ${
                  tile.selected ? "border-ink" : ""
                }`}
              >
                <span className="text-[12px] text-ink3">{tile.label}</span>
                <span className="text-[18px] font-medium tabular-nums">
                  {tile.total}
                </span>
                <span className="text-[12px] text-ink2">{tile.detail}</span>
              </button>
            ))}
          </div>
          <section className={`${CARD} flex flex-col p-2`}>
            <div className="flex flex-wrap items-center gap-2 px-2 py-1">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search assets"
                aria-label="Search assets"
                className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-transparent px-3 text-[13.5px]"
              />
              <label className="flex items-center gap-2 text-[12.5px] text-ink2">
                Group by
                <select
                  value={grouping}
                  onChange={(e) => setGrouping(e.target.value as Grouping)}
                  className="h-10 rounded-lg border border-line bg-transparent px-2 text-[13.5px] text-ink"
                >
                  <option value="class">Class</option>
                  <option value="country">Country</option>
                  <option value="none">None</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => setCollapsed(toggleAllGroups(view))}
                className="h-10 rounded-lg px-3 text-[12.5px] text-ink2 hover:bg-hover"
              >
                {view.toggleAll}
              </button>
            </div>
            {view.noMatch && (
              <p className="px-3 py-4 text-[13.5px] text-ink2">
                {view.noMatch}
              </p>
            )}
            {view.groups.map((group) => (
              <div key={group.key} className="flex flex-col">
                <button
                  type="button"
                  aria-expanded={!group.collapsed}
                  onClick={() =>
                    setCollapsed(toggleGroup(collapsed, group.key))
                  }
                  className="flex min-h-10 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13.5px] hover:bg-hover"
                >
                  <span
                    aria-hidden
                    className="size-2.5 flex-none rounded-full"
                    style={{ background: `var(${group.dot})` }}
                  />
                  <span className="font-medium">{group.label}</span>
                  <span className="text-ink3">{group.count}</span>
                  <span className="ml-auto hidden text-ink2 tabular-nums sm:block">
                    {group.share}
                  </span>
                  <span className="w-24 text-right tabular-nums sm:ml-4">
                    {group.total}
                  </span>
                </button>
                {group.rows.map((row) => (
                  <RowLink
                    key={row.id}
                    href={row.href}
                    className="grid grid-cols-[1fr_auto] items-center gap-x-4 rounded-lg px-3 py-2.5 text-[13.5px] sm:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto]"
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">{row.name}</span>
                      {row.subtitle && (
                        <span className="hidden truncate text-[12px] text-ink3 sm:block">
                          {row.subtitle}
                        </span>
                      )}
                    </span>
                    <span className="hidden rounded-md border border-line px-1.5 py-0.5 text-[11px] text-ink2 sm:block">
                      {row.badge}
                    </span>
                    <span className="hidden w-28 text-right text-ink2 tabular-nums sm:block">
                      {row.native}
                    </span>
                    <span className="w-24 text-right tabular-nums">
                      {row.usd}
                    </span>
                    <span className="hidden w-28 text-right text-ink2 tabular-nums sm:block">
                      {row.gain}
                    </span>
                  </RowLink>
                ))}
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
