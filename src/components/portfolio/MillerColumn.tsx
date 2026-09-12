"use client";

import { useRef, type ReactNode } from "react";

export type MillerRow = {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
};

// One Miller column: a fixed-width, vertically scrolling list of rows with
// roving-tabindex keyboard navigation (user story 101 / ticket 03's
// "Keyboard navigation with ↑/↓ and tab order") — only the selected row (or
// the first, if nothing is selected yet) sits in the Tab order, and ↑/↓
// moves both focus and selection together, the way a Finder column does.
export function MillerColumn({
  label,
  rows,
  selectedId,
  onSelect,
  footer,
}: {
  label: string;
  rows: MillerRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  footer?: ReactNode;
}) {
  const rowRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function focusIndex(index: number) {
    const clamped = Math.max(0, Math.min(rows.length - 1, index));
    rowRefs.current[clamped]?.focus();
    const row = rows[clamped];
    if (row) onSelect(row.id);
  }

  function handleKeyDown(event: React.KeyboardEvent, index: number) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusIndex(index + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusIndex(index - 1);
    }
  }

  const tabbableIndex = Math.max(
    0,
    rows.findIndex((row) => row.id === selectedId),
  );

  return (
    <div className="flex w-[270px] shrink-0 flex-col border-r border-hairline">
      <h2 className="px-3 pt-3 pb-2 text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
        {label}
      </h2>
      <div role="listbox" aria-label={label} className="flex-1 overflow-y-auto">
        {rows.map((row, index) => {
          const isSelected = row.id === selectedId;
          return (
            <button
              key={row.id}
              ref={(el) => {
                rowRefs.current[index] = el;
              }}
              type="button"
              role="option"
              aria-selected={isSelected}
              tabIndex={index === tabbableIndex ? 0 : -1}
              onClick={() => onSelect(row.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                isSelected
                  ? "bg-accent-soft text-foreground"
                  : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
              }`}
            >
              {row.icon}
              <span className="truncate">{row.label}</span>
            </button>
          );
        })}
      </div>
      {footer}
    </div>
  );
}
