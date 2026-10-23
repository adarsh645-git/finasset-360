"use client";

import type { ModalFormProps } from "@/components/modal/ModalHost";
import { passSummary } from "@/lib/views/update-pass";

// The pass's last step (design.md D8): a read-only summary. Done is the frame's
// submit button, so Enter closes; nothing is written anywhere.
export function PassSummary({ match, data, formId, onSaved }: ModalFormProps) {
  const { line, stillStale } = passSummary(data, match.from ?? null, data.today);
  return (
    <form
      id={formId}
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSaved({});
      }}
    >
      <p className="text-[17px] font-medium tabular-nums">{line}</p>
      {stillStale && <p className="text-[13px] text-ink2">{stillStale}</p>}
    </form>
  );
}
