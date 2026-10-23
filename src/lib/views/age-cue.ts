import { STALE_AFTER_DAYS } from "@/lib/calc";
import { daysOld } from "@/lib/format";

export type AgeKind = "holding" | "liability" | "stocks" | "position";

const isStale = (ageDays: number | null): ageDays is number =>
  ageDays !== null && ageDays > STALE_AFTER_DAYS;

/** How old a Stale row's user-entered figure is; null when it isn't Stale. */
export function ageCue(kind: AgeKind, ageDays: number | null): string | null {
  if (!isStale(ageDays)) return null;
  switch (kind) {
    case "holding":
    case "liability":
      return daysOld(ageDays);
    case "stocks":
      return `prices ${daysOld(ageDays)}`;
    case "position":
      return `price ${daysOld(ageDays)}`;
  }
}

/** The detail page's native-line suffix: "· updated N days ago", or "Updated N days ago" on an empty line. */
export function updatedCue(
  ageDays: number | null,
  { lineEmpty = false }: { lineEmpty?: boolean } = {},
): string | null {
  if (!isStale(ageDays)) return null;
  return `${lineEmpty ? "Updated" : "· updated"} ${ageDays} days ago`;
}
