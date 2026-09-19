"use client";

import { useState } from "react";

const DISMISS_THRESHOLD_PX = 80;

// A leaf's detail (a Holding or a Liability), surfaced below 900px as a
// bottom sheet rather than the desktop Miller column's rightmost panel
// (ticket 15). A second overlay concept the app doesn't otherwise use, so
// its dismissal gets two affordances rather than one: an explicit close
// button, and a drag-to-dismiss on the handle — dragging down past
// `DISMISS_THRESHOLD_PX` closes it, anything less snaps back. The snap-back
// transition below is already reduced-motion-safe for free — globals.css's
// blanket `prefers-reduced-motion` rule floors every transition's duration
// site-wide, so nothing here needs its own media query.
export function BottomSheet({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  const [dragY, setDragY] = useState(0);
  const [dragStartY, setDragStartY] = useState<number | null>(null);

  function handlePointerDown(event: React.PointerEvent) {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragStartY(event.clientY);
  }

  function handlePointerMove(event: React.PointerEvent) {
    if (dragStartY === null) return;
    // Measured against the gesture's own start point rather than
    // accumulated from `movementY` — Pointer Events' `movementY` is
    // unreliable for touch-originated pointers on Safari (often reporting
    // 0), and a phone is exactly where this handle is actually used.
    setDragY(Math.max(0, event.clientY - dragStartY));
  }

  function handlePointerUp() {
    if (dragY > DISMISS_THRESHOLD_PX) {
      onClose();
    }
    setDragStartY(null);
    setDragY(0);
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center">
      {/* Backdrop — also dismisses on click, the same as tapping outside
         any other overlay in the app would be expected to. */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-zinc-950/30"
      />
      <div
        role="dialog"
        aria-modal="true"
        style={{ transform: `translateY(${dragY}px)` }}
        className={`relative flex max-h-[85dvh] w-full flex-col rounded-t-xl border-t border-hairline bg-background ${
          dragStartY === null ? "transition-transform" : ""
        }`}
      >
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="flex shrink-0 cursor-grab touch-none flex-col items-center gap-2 pt-2 pb-1 active:cursor-grabbing"
        >
          <span className="h-1 w-10 rounded-full bg-zinc-300 dark:bg-zinc-700" aria-hidden="true" />
          <button
            type="button"
            onClick={onClose}
            className="absolute top-1 right-2 min-h-11 min-w-11 text-sm text-zinc-500 dark:text-zinc-400"
          >
            Close
          </button>
        </div>
        {/* `flex` (not just `flex-1`) so the detail panel inside stretches
           to this box's own height via cross-axis stretch, rather than
           rendering at its natural content height — needed for its own
           pinned action-button footer to work here too. */}
        <div className="flex flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>
  );
}
