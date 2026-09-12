import { DEFAULT_LIABILITY_CLASS_ID } from "@/lib/liability-classes/defaults";

// Single-stroke, monochrome icons, one per global default Liability Class —
// mirrors src/components/icons/AssetClassIcon.tsx (same stroke props, same
// currentColor/no-fill rule, same fallback reasoning).
const STROKE_PROPS = {
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.3,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function MortgageGlyph() {
  return (
    <svg {...STROKE_PROPS} aria-hidden="true">
      <path d="M3.5 9.5 10 4l6.5 5.5" />
      <path d="M5 8.5V16h10V8.5" />
      <path d="M4 16h12" />
    </svg>
  );
}

function AutoLoanGlyph() {
  return (
    <svg {...STROKE_PROPS} aria-hidden="true">
      <path d="M3 13.5 4.2 9a1.5 1.5 0 0 1 1.44-1h8.72a1.5 1.5 0 0 1 1.44 1l1.2 4.5" />
      <rect x="2.5" y="13.5" width="15" height="2.7" rx="1" />
      <circle cx="6" cy="16.2" r="1.1" />
      <circle cx="14" cy="16.2" r="1.1" />
    </svg>
  );
}

function CreditCardGlyph() {
  return (
    <svg {...STROKE_PROPS} aria-hidden="true">
      <rect x="2.5" y="5" width="15" height="10" rx="1.5" />
      <path d="M2.5 8.5h15" />
    </svg>
  );
}

// The fallback glyph — a custom Liability Class with no icon of its own
// still renders with a neutral glyph, the normal path for every custom
// class a User creates, not an error state.
function NeutralGlyph() {
  return (
    <svg {...STROKE_PROPS} aria-hidden="true">
      <rect x="4" y="4" width="12" height="12" rx="3" />
    </svg>
  );
}

const ICONS_BY_ID: Record<string, () => React.JSX.Element> = {
  [DEFAULT_LIABILITY_CLASS_ID.mortgage]: MortgageGlyph,
  [DEFAULT_LIABILITY_CLASS_ID.autoLoan]: AutoLoanGlyph,
  [DEFAULT_LIABILITY_CLASS_ID.creditCard]: CreditCardGlyph,
};

export function LiabilityClassIcon({
  liabilityClassId,
  className,
}: {
  liabilityClassId: string;
  className?: string;
}) {
  const Glyph = ICONS_BY_ID[liabilityClassId] ?? NeutralGlyph;
  return (
    <span className={className ?? "h-[18px] w-[18px] shrink-0"}>
      <Glyph />
    </span>
  );
}

// The "Liabilities" row itself in column 1 — equity's mirror, a falling
// line, distinguishing the top-level branch from any individual Liability
// Class icon above.
export function LiabilitiesRootIcon({ className }: { className?: string }) {
  return (
    <span className={className ?? "h-[18px] w-[18px] shrink-0"}>
      <svg {...STROKE_PROPS} aria-hidden="true">
        <path d="M3.5 4 3.5 16" />
        <path d="M3.5 16h13" />
        <path d="M4.5 6.5 8.5 11l2.5-2.5 4.5 5.5" />
      </svg>
    </span>
  );
}
