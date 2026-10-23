import type { YearRow } from "@/lib/views/growth-years";

// Renders what buildYears returns: Net Worth, debt and % change at each year end.
export function YearsCard({ years }: { years: YearRow[] }) {
  return (
    <section className="rounded-[14px] border border-line bg-panel p-5 shadow-[var(--shadow)]">
      <h2 className="text-[15px] font-semibold">Year by year</h2>
      <p className="mt-0.5 text-[12.5px] text-ink3">Year-end values · * is today</p>
      <table className="mt-3 w-full text-[13px] tabular-nums">
        <thead>
          <tr className="text-left font-mono text-[11px] uppercase tracking-[0.06em] text-ink3">
            <th scope="col" className="py-1.5 font-medium">Year</th>
            <th scope="col" className="py-1.5 text-right font-medium">Net worth</th>
            <th scope="col" className="py-1.5 text-right font-medium">Debt</th>
            <th scope="col" className="py-1.5 text-right font-medium">Change</th>
          </tr>
        </thead>
        <tbody>
          {years.map((row) => (
            <tr key={row.year} className="border-t border-line">
              <td className="py-2">{row.year}</td>
              <td className="py-2 text-right font-medium">{row.netWorth}</td>
              <td className="py-2 text-right text-ink2">{row.debt}</td>
              <td className="py-2 text-right text-ink2">{row.change}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
