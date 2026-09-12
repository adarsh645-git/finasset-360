"use client";

// Portfolio and Plan are the two breadcrumb roots, siblings rather than one
// nested under the other (docs/SPEC.md's "Finder-style Miller-column
// browser — Portfolio and Plan as the two roots"; ticket 09's "Plan is the
// second breadcrumb root, sibling to Portfolio"). `roots` renders as a small
// switcher with no "/" between its own entries, since a "/" there would
// misread as one root containing the other; `segments` is the normal
// chevron-joined drill-down trail continuing from whichever root is active
// (empty for Plan, which ticket 09 gives no further drill-down).
export function Breadcrumb({
  roots,
  segments,
}: {
  roots: Array<{ label: string; isActive: boolean; onSelect: () => void }>;
  segments: Array<{ label: string; onClick?: () => void }>;
}) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 px-4 py-2.5 text-sm">
      {roots.map((root, index) => {
        // A root reads as "current" only when it's active and nothing under
        // it is selected yet — an active root with segments after it is a
        // clickable jump back to that root's top, exactly like any other
        // non-last segment.
        const isCurrent = root.isActive && segments.length === 0;
        return (
          <span key={root.label} className="flex items-center gap-1.5">
            {index > 0 && <span className="text-zinc-400 dark:text-zinc-600">·</span>}
            {isCurrent ? (
              <span aria-current="page" className="font-medium">
                {root.label}
              </span>
            ) : (
              <button
                type="button"
                onClick={root.onSelect}
                className={
                  root.isActive
                    ? "text-foreground hover:opacity-70"
                    : "text-zinc-500 hover:text-foreground dark:text-zinc-500"
                }
              >
                {root.label}
              </button>
            )}
          </span>
        );
      })}
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        return (
          <span key={index} className="flex items-center gap-1.5">
            <span className="text-zinc-400 dark:text-zinc-600">/</span>
            {segment.onClick && !isLast ? (
              <button
                type="button"
                onClick={segment.onClick}
                className="text-zinc-600 hover:text-foreground dark:text-zinc-400"
              >
                {segment.label}
              </button>
            ) : (
              <span aria-current={isLast ? "page" : undefined} className="font-medium">
                {segment.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
