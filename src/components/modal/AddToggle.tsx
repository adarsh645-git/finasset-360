"use client";

type AddMode = "add-asset" | "add-liability";

const SIDES: { mode: AddMode; label: string }[] = [
  { mode: "add-asset", label: "Asset" },
  { mode: "add-liability", label: "Liability" },
];

// The Asset | Liability toggle above the add forms (LE-01). The host swaps
// the URL's modal param; it is not shown in edit or update modes.
export function AddToggle({ mode, onChoose }: { mode: AddMode; onChoose: (to: AddMode) => void }) {
  return (
    <div role="group" aria-label="Add" className="flex rounded-full border border-line p-0.5">
      {SIDES.map((side) => (
        <button
          key={side.mode}
          type="button"
          aria-pressed={mode === side.mode}
          onClick={() => onChoose(side.mode)}
          className={`h-8 rounded-full px-3 text-[13px] ${
            mode === side.mode ? "bg-ink text-bg" : "text-ink2 hover:bg-hover"
          }`}
        >
          {side.label}
        </button>
      ))}
    </div>
  );
}
