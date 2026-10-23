"use client";

// The pass's footer chrome (design.md D1, D10): the "i of N" counter and Skip.
// Save & next is the frame's own submit button, so Enter confirms; Skip is
// type="button" and never submits.
export function PassFooter({ counter, onSkip }: { counter: string; onSkip: () => void }) {
  return (
    <>
      <span className="text-[13px] tabular-nums text-ink3 max-[389px]:basis-full">{counter}</span>
      <button
        type="button"
        onClick={onSkip}
        className="h-10 rounded-lg border border-line px-3.5 text-[13.5px] font-medium hover:bg-hover"
      >
        Skip
      </button>
    </>
  );
}
