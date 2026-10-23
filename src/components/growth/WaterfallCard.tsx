import type { Waterfall } from "@/lib/views/growth-waterfall";

const BAR = { total: "bg-ink", pos: "bg-pos", neg: "bg-neg" } as const;

// Renders what buildWaterfall returns: one bar per row on a shared scale.
export function WaterfallCard({ waterfall }: { waterfall: Waterfall }) {
  return (
    <section className="rounded-[14px] border border-line bg-panel p-5 shadow-[var(--shadow)]">
      <h2 className="text-[15px] font-semibold">Where the change came from</h2>
      <p className="mt-0.5 text-[12.5px] text-ink3">{waterfall.subtitle}</p>
      <ul className="mt-4 flex flex-col gap-2.5">
        {waterfall.rows.map((row) => (
          <li
            key={row.label}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[150px_minmax(0,1fr)_auto]"
          >
            <span className="text-[13px] text-ink2">{row.label}</span>
            <span className="order-last col-span-2 h-3.5 rounded-sm bg-hover sm:order-none sm:col-span-1">
              <span
                data-waterfall-bar={row.kind}
                className={`relative block h-full rounded-sm ${BAR[row.kind]}`}
                style={{ marginLeft: `${row.left}%`, width: `${row.width}%` }}
              />
            </span>
            <span className="text-right text-[13px] font-medium tabular-nums">{row.value}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
