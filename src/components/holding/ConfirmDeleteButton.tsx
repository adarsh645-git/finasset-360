"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { archiveThenLeave, deleteLabel, nextDeleteStep, type DeleteStep } from "@/lib/views/holding-writes";

// Delete is a two-click archive (design.md D15). The first click asks, the
// second posts to `url`, then goes to `to` and refreshes. Leaving the page
// resets it, because the state is keyed on the path it was armed on.
export function ConfirmDeleteButton({ url, to, className }: { url: string; to: string; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [armed, setArmed] = useState<{ path: string; step: DeleteStep }>({ path: pathname, step: "idle" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const step: DeleteStep = armed.path === pathname ? armed.step : "idle";

  return (
    <span className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={busy}
        className={className}
        onClick={async () => {
          const next = nextDeleteStep(step);
          if (next !== "archive") {
            setError(null);
            setArmed({ path: pathname, step: next });
            return;
          }
          setBusy(true);
          const failure = await archiveThenLeave({
            fetchFn: fetch,
            url,
            to,
            push: router.push,
            refresh: router.refresh,
          });
          setBusy(false);
          if (failure) setError(failure);
        }}
      >
        {deleteLabel(step)}
      </button>
      {error && (
        <span role="alert" className="text-[12.5px] text-red-600">
          {error}
        </span>
      )}
    </span>
  );
}
