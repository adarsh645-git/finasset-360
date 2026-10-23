"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveGoal } from "@/lib/views/goal-writes";

const INPUT = "h-10 min-w-0 rounded-lg border border-line bg-bg px-3 text-[14px] outline-none";

// The add form: Enter in either input adds. A bad target saves nothing and keeps the text.
export function GoalForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        setBusy(true);
        const saved = await saveGoal(fetch, name, target);
        setBusy(false);
        if (saved.ok) {
          setName("");
          setTarget("");
          router.refresh();
        } else setError(saved.error);
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <input
          aria-label="Goal name"
          placeholder="Name (optional)"
          autoComplete="off"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={`${INPUT} w-full flex-[2_1_100%] sm:flex-[2_1_200px] sm:w-auto`}
        />
        <span className={`${INPUT} flex flex-[1_1_120px] items-center gap-1.5`}>
          <span className="text-ink3">$</span>
          <input
            aria-label="Target"
            placeholder="Target"
            inputMode="decimal"
            autoComplete="off"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            className="min-w-0 flex-1 bg-transparent tabular-nums outline-none"
          />
        </span>
        <button
          type="submit"
          disabled={busy}
          className="h-10 rounded-lg bg-ink px-4 text-[14px] font-medium text-bg disabled:opacity-60"
        >
          Add goal
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-[13px] text-neg">
          {error}
        </p>
      ) : null}
    </form>
  );
}
