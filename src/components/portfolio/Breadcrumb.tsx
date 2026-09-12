"use client";

// Portfolio is always the breadcrumb root (user stories 96–97). Every
// segment but the last is a clickable jump back up the hierarchy; the last
// segment is the current position and isn't a link.
export function Breadcrumb({
  segments,
}: {
  segments: Array<{ label: string; onClick?: () => void }>;
}) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 px-4 py-2.5 text-sm">
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        return (
          <span key={index} className="flex items-center gap-1.5">
            {index > 0 && <span className="text-zinc-400 dark:text-zinc-600">/</span>}
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
