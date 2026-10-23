"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { removeGoal } from "@/lib/views/goal-writes";

// Remove is immediate and permanent (D8).
export function RemoveGoalButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={busy}
        className="-ml-2 min-h-10 rounded-lg px-2 text-[13px] text-ink2 hover:text-ink disabled:opacity-60"
        onClick={async () => {
          setError(null);
          setBusy(true);
          const removed = await removeGoal(fetch, id);
          setBusy(false);
          if (removed.ok) router.refresh();
          else setError(removed.error);
        }}
      >
        Remove
      </button>
      {error ? (
        <span role="alert" className="text-[13px] text-neg">
          {error}
        </span>
      ) : null}
    </span>
  );
}
