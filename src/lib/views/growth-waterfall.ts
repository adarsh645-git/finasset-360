import { attributeChange, type Country, type FxRate, type HistoryItem } from "@/lib/calc";
import { monthLong, signed, usd } from "@/lib/format";

export type WaterfallRow = {
  label: string;
  /** "$110,000" for a total, "+$36,875" for a step. */
  value: string;
  /** The row's signed amount: the total itself, or the step. */
  amount: number;
  kind: "total" | "pos" | "neg";
  /** The bar's low and high ends on the shared scale. */
  from: number;
  to: number;
  /** The bar's position and width as percentages of the scale. */
  left: number;
  width: number;
};

export type Waterfall = {
  subtitle: string;
  rows: WaterfallRow[];
  scale: { min: number; max: number };
};

/** A zero step still draws as this sliver (percent of the scale). */
const SLIVER = 0.6;

export type WaterfallInput = {
  held: HistoryItem[];
  owed: HistoryItem[];
  rates: readonly FxRate[];
  start: string;
  today: string;
  scope: readonly Country[];
  /** The scope's label for a single-scope subtitle, or null when both Countries are in scope. */
  only: string | null;
  netThen: number;
  netNow: number;
};

/** The "Where the change came from" card: Net Worth at the range start, each step of the
 * change from the calculations module's attribution, and Net Worth today, on one scale. */
export function buildWaterfall(input: WaterfallInput): Waterfall {
  const { start, today, netThen, netNow } = input;
  const split = attributeChange(
    { holdings: input.held, liabilities: input.owed },
    input.rates,
    start,
    today,
    input.scope,
  );
  const steps: { label: string; amount: number }[] = [
    { label: "Asset growth & savings", amount: split.assetGrowth },
    { label: "Debt paid down", amount: split.debtPaidDown },
  ];
  if (input.scope.includes("India")) {
    steps.push({ label: "Currency (₹ → $)", amount: split.currencyEffect });
  }

  type Raw = { label: string; value: string; amount: number; kind: WaterfallRow["kind"]; from: number; to: number };
  const raw: Raw[] = [
    { label: `Net worth ${monthLong(start)}`, value: usd(netThen), amount: netThen, kind: "total", from: Math.min(0, netThen), to: Math.max(0, netThen) },
  ];
  let running = netThen;
  for (const step of steps) {
    const before = running;
    running += step.amount;
    raw.push({
      label: step.label,
      value: signed(step.amount),
      amount: step.amount,
      kind: step.amount < 0 ? "neg" : "pos",
      from: Math.min(before, running),
      to: Math.max(before, running),
    });
  }
  raw.push({ label: "Net worth today", value: usd(netNow), amount: netNow, kind: "total", from: Math.min(0, netNow), to: Math.max(0, netNow) });

  const min = Math.min(0, ...raw.map((r) => r.from));
  const max = Math.max(0, ...raw.map((r) => r.to));
  const span = max - min || 1;
  const rows = raw.map((r) => ({
    ...r,
    left: ((r.from - min) / span) * 100,
    width: Math.max(((r.to - r.from) / span) * 100, SLIVER),
  }));

  const rates = `Asset growth uses ${monthLong(start)} exchange rates, so currency moves are split out`;
  return { subtitle: input.only ? `${input.only} only. ${rates}` : rates, rows, scale: { min, max } };
}
