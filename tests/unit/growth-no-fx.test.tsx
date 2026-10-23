import { vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh() {}, push() {}, replace() {} }), usePathname: () => "/growth", useSearchParams: () => new URLSearchParams() }));
import { describe, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { holding, liability, portfolio } from "../fixtures/portfolio";
import { buildGrowth, parseGrowthView } from "@/lib/views/growth";
import { buildAssumptions } from "@/lib/views/projection-assumptions";
import { GrowthPage } from "@/components/growth/GrowthPage";

const T = "2026-10-23";
const data = portfolio({
  today: T,
  countries: [
    { code: "IN", currency: "INR", defaults: { inflation: 6, realestate: 7, stocks: 11, cash: 6, monthlySavings: 0 } },
    { code: "US", currency: "USD", defaults: { inflation: 3, realestate: 4, stocks: 7, cash: 4, monthlySavings: 0 } },
  ] as never,
  fx: { today: null, history: [] } as never,
  holdings: [
    holding({ id: "c", assetClass: "cash", currentValue: 25000, createdAt: `${T}T13:00:00Z`, valuations: [{ date: T, value: 25000, source: "user" }] as never }),
    holding({ id: "s", assetClass: "stocks", currentValue: 2300, costBasis: 1500, createdAt: `${T}T13:05:00Z`, valuations: [{ date: T, value: 2300, source: "user" }] as never }),
  ],
  liabilities: [liability({ id: "l", principal: 10215, apr: 6, monthlyPayment: 250, startMonth: "2026-10", balance: 10215, valuations: [{ date: T, value: 10215 }] } as never)],
});

describe("Growth with no FX Rate stored", () => {
  for (const q of [{}, { mode: "class" }, { basis: "real" }]) {
    it(`GR-01 the Growth page renders with no FX Rate stored (${JSON.stringify(q)})`, () => {
      const view = parseGrowthView(q);
      const g = buildGrowth(data, view);
      const a = buildAssumptions(data, view);
      renderToStaticMarkup(<GrowthPage growth={g} assumptions={a} />);
    });
  }
});
