"use client";

import type { CheckInScope } from "@/lib/check-in/queue";

// The two entry points into a Check-in pass (user story 40) — shared by the
// desktop dashboard and the narrow accordion's own "Start Check-in" section
// (ticket 15's section order) so the two surfaces can't wire up divergent
// behaviour behind the same two buttons. 44px-tall tap targets throughout
// (ticket 15) — harmless at desktop, where a pointer doesn't need the room.
export function CheckInLauncher({
  staleCount,
  onStartCheckIn,
}: {
  staleCount: number;
  onStartCheckIn: (scope: CheckInScope) => void;
}) {
  return (
    <div className="flex gap-2 pt-1">
      <button
        type="button"
        onClick={() => onStartCheckIn("all")}
        className="min-h-11 rounded-md border border-hairline px-3 py-1.5 text-sm font-medium"
      >
        Start Check-in
      </button>
      <button
        type="button"
        onClick={() => onStartCheckIn("stale")}
        disabled={staleCount === 0}
        className="min-h-11 rounded-md border border-hairline px-3 py-1.5 text-sm text-zinc-500 disabled:opacity-50 dark:text-zinc-400"
      >
        Check in on what&rsquo;s stale
      </button>
    </div>
  );
}
