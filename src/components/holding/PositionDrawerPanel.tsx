"use client";

import Link from "next/link";
import { MONO_LABEL, SECTOR_COLORS } from "@/components/holding/style";
import { useEffect, useRef } from "react";
import { escClosesDrawer, type PositionDrawer } from "@/lib/views/position-drawer";



// A right-side panel, 400px wide (full width on phone), over a dimmed backdrop.
// The link to the account and the close controls all leave through URLs the
// host computed, so the panel holds no routing rules.
export function PositionDrawerPanel({
  drawer,
  closeHref,
  onClose,
}: {
  drawer: PositionDrawer;
  closeHref: string;
  onClose?: () => void;
}) {
  const panel = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    panel.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      const modalOpen = document.querySelector("[data-modal-frame]") !== null;
      if (escClosesDrawer({ key: event.key, modalOpen })) close.current?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-black/40"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <aside
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={`${drawer.ticker} position`}
        tabIndex={-1}
        className="flex h-full w-[min(400px,100%)] flex-col gap-5 overflow-y-auto border-l border-line bg-panel p-5 shadow-[var(--shadow)] outline-none"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex items-baseline gap-2">
              <h2 className="text-[20px] font-semibold tracking-[-0.01em]">{drawer.ticker}</h2>
              <span className={MONO_LABEL}>{drawer.exchange}</span>
            </div>
            <p className="flex items-center gap-2 text-[13px] text-ink2">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: SECTOR_COLORS[drawer.sector] ?? SECTOR_COLORS.Other }}
              />
              <span>{drawer.identity}</span>
            </p>
          </div>
          <Link
            href={closeHref}
            replace
            scroll={false}
            aria-label="Close"
            onClick={onClose ? (e) => { e.preventDefault(); onClose(); } : undefined}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[20px] text-ink3 hover:bg-hover"
          >
            ×
          </Link>
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-[32px] font-semibold tabular-nums tracking-[-0.02em]">{drawer.usd}</p>
          <p className="text-[13px] text-ink2">{drawer.nativeLine}</p>
        </div>

        <dl className="grid grid-cols-2 gap-3">
          {drawer.stats.map((s) => (
            <div key={s.label} className="flex flex-col gap-0.5 rounded-xl border border-line p-3">
              <dt className={MONO_LABEL}>{s.label}</dt>
              <dd
                className={`text-[16px] font-semibold tabular-nums ${
                  s.tone === "up" ? "text-green-600" : s.tone === "down" ? "text-red-600" : ""
                }`}
              >
                {s.value}
              </dd>
              {s.sub ? <dd className="text-[12px] text-ink3">{s.sub}</dd> : null}
            </div>
          ))}
        </dl>

        <div className="flex flex-col gap-2">
          {drawer.yahooHref ? (
            <a
              href={drawer.yahooHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-10 items-center justify-center rounded-lg border border-line text-[13.5px] font-medium hover:bg-hover"
            >
              Open on Yahoo Finance ↗
            </a>
          ) : null}
          <Link
            href={drawer.account.href}
            className="flex h-10 items-center justify-center rounded-lg bg-ink text-[13.5px] font-medium text-bg"
          >
            {drawer.account.label}
          </Link>
        </div>
      </aside>
    </div>
  );
}
