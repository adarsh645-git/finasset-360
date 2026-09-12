import { DEFAULT_ASSET_CLASS_ID } from "@/lib/asset-classes/defaults";

// Single-stroke, monochrome icons, one per global default Asset Class. Every
// path uses `stroke="currentColor"` and no fill, so a row's icon always
// inherits that row's text colour — never the accent, which this app's
// visual system reserves for selection alone.
const STROKE_PROPS = {
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.3,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function RealEstateGlyph() {
  return (
    <svg {...STROKE_PROPS} aria-hidden="true">
      <path d="M3.5 9.5 10 4l6.5 5.5" />
      <path d="M5 8.5V16h10V8.5" />
      <path d="M8 16v-4.5h4V16" />
    </svg>
  );
}

function EquityGlyph() {
  return (
    <svg {...STROKE_PROPS} aria-hidden="true">
      <path d="M3.5 16 3.5 4" />
      <path d="M3.5 16h13" />
      <path d="M4.5 13.5 8.5 9l2.5 2.5 4.5-5.5" />
    </svg>
  );
}

function PreciousMetalGlyph() {
  return (
    <svg {...STROKE_PROPS} aria-hidden="true">
      <path d="M6 4h8l3 4.5-7 8-7-8Z" />
      <path d="M2.5 8.5h15" />
      <path d="M8 4l2 4.5-2 8" />
      <path d="M12 4l-2 4.5 2 8" />
    </svg>
  );
}

function CashGlyph() {
  return (
    <svg {...STROKE_PROPS} aria-hidden="true">
      <rect x="2.5" y="5.5" width="15" height="9" rx="1.5" />
      <circle cx="10" cy="10" r="2.25" />
    </svg>
  );
}

function CryptoGlyph() {
  return (
    <svg {...STROKE_PROPS} aria-hidden="true">
      <path d="M10 2.5 17 6.75v6.5L10 17.5 3 13.25v-6.5Z" />
    </svg>
  );
}

// The fallback glyph — "a custom Asset Class with no icon of its own still
// renders with a neutral glyph" (user story 11). Any id not in ICONS_BY_ID
// takes this path, which is the expected case for every custom class a User
// creates, not an error state.
function NeutralGlyph() {
  return (
    <svg {...STROKE_PROPS} aria-hidden="true">
      <rect x="4" y="4" width="12" height="12" rx="3" />
    </svg>
  );
}

const ICONS_BY_ID: Record<string, () => React.JSX.Element> = {
  [DEFAULT_ASSET_CLASS_ID.realEstate]: RealEstateGlyph,
  [DEFAULT_ASSET_CLASS_ID.equity]: EquityGlyph,
  [DEFAULT_ASSET_CLASS_ID.preciousMetal]: PreciousMetalGlyph,
  [DEFAULT_ASSET_CLASS_ID.cash]: CashGlyph,
  [DEFAULT_ASSET_CLASS_ID.crypto]: CryptoGlyph,
};

export function AssetClassIcon({
  assetClassId,
  className,
}: {
  assetClassId: string;
  className?: string;
}) {
  const Glyph = ICONS_BY_ID[assetClassId] ?? NeutralGlyph;
  return (
    <span className={className ?? "h-[18px] w-[18px] shrink-0"}>
      <Glyph />
    </span>
  );
}
