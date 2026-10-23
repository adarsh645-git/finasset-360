import type { DistributionCard, RealEstateCards as Cards } from "@/lib/views/real-estate-cards";

const CARD = "rounded-[14px] border border-line bg-panel shadow-[var(--shadow)]";

function Card({ card }: { card: DistributionCard }) {
  return (
    <section className={`${CARD} flex min-w-0 flex-col gap-3 p-5`} aria-label={card.title}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-semibold">{card.title}</h2>
        <span className="text-[12px] text-ink3">{card.subtitle}</span>
      </div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-line" aria-hidden>
        {card.bar.map((s) => (
          <span key={s.label} style={{ width: `${s.share * 100}%`, background: s.color }} />
        ))}
      </div>
      <ul className="flex flex-col">
        {card.rows.map((r) => (
          <li key={r.label} className="flex items-center gap-3 py-2 text-[13.5px]">
            <span aria-hidden className="size-2.5 flex-none rounded-full" style={{ background: r.color }} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-medium">{r.label}</span>
              <span className="truncate text-[12px] text-ink3">{r.names}</span>
            </span>
            <span className="tabular-nums">{r.value}</span>
            <span className="w-12 text-right text-ink2 tabular-nums">{r.share}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** By property type and By location, side by side wide and stacked narrow. */
export function RealEstateCards({ cards }: { cards: Cards }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card card={cards.byType} />
      <Card card={cards.byLocation} />
    </div>
  );
}
