// A minimal single-stroke trend line — no charting library, matching this
// app's near-monochrome visual system (one Asset/Liability Class icon per
// ticket 03, everything else a plain stroke). Used both for a single
// Holding's Valuation History and, at a larger size, the dashboard's
// recorded Net Worth timeline.
export function Sparkline({
  values,
  width = 160,
  height = 40,
}: {
  values: number[];
  width?: number;
  height?: number;
}) {
  if (values.length === 0) return null;

  // A flat line at mid-height when every value is equal (including the
  // single-value case) — the alternative, dividing by a zero range, would
  // produce NaN points and draw nothing.
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  const points = values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
    const y = range === 0 ? height / 2 : height - ((value - min) / range) * height;
    return `${x},${y}`;
  });

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      fill="none"
      aria-hidden="true"
    >
      <polyline
        points={points.join(" ")}
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
