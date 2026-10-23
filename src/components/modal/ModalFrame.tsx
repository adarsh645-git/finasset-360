"use client";

import { useEffect, useRef, type ReactNode } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// One dialog frame: a top-aligned dialog from 640px, a bottom sheet below it
// (design.md D2). The form lives in the body and submits through the footer's
// Save, which points at it by `formId`.
export function ModalFrame({
  title,
  saveLabel,
  error,
  saving,
  formId,
  onClose,
  headerSlot,
  footerSlot,
  hideCancel = false,
  children,
}: {
  title: string;
  saveLabel: string;
  error: string | null;
  saving: boolean;
  formId: string;
  onClose: () => void;
  /** Holds the Asset | Liability toggle in add mode (redesign-liabilities). */
  headerSlot?: ReactNode;
  /** Holds "Save & next" and "i of N" (redesign-update-pass). */
  footerSlot?: ReactNode;
  /** A pass step leaves through ×, Esc and Back, so it drops Cancel. */
  hideCancel?: boolean;
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  const inPass = useRef(footerSlot !== undefined);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const first = panel.current?.querySelector<HTMLElement>("input, select, textarea");
    (first ?? panel.current)?.focus();
    // In a pass the value is pre-filled, so typing replaces it.
    if (inPass.current && first instanceof HTMLInputElement) first.select();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close.current();
        return;
      }
      if (event.key !== "Tab" || !panel.current) return;
      const items = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const firstItem = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === firstItem || active === panel.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        firstItem.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, []);

  return (
    <div
      data-modal-frame=""
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-start sm:pt-[6vh]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-line bg-panel shadow-[var(--shadow)] outline-none sm:max-w-[560px] sm:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <h2 className="text-[17px] font-semibold tracking-[-0.01em]">{title}</h2>
            {headerSlot}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-[20px] text-ink3 hover:bg-hover"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        <div className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-3">
          <p role="alert" className="min-w-0 flex-1 text-[13px] text-red-600">
            {error}
          </p>
          {footerSlot}
          {!hideCancel && (
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg border border-line px-3.5 text-[13.5px] font-medium hover:bg-hover"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            form={formId}
            disabled={saving}
            className="h-10 rounded-lg bg-ink px-4 text-[13.5px] font-medium text-bg disabled:opacity-50"
          >
            {saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
