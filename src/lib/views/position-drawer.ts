import { fxRateOn, type FxRate } from "@/lib/calc";
import { DASH, dayMonth, inr, native, share, signedPct, usd } from "@/lib/format";
import type { HoldingData, PortfolioData, PositionData } from "@/lib/read-model/types";
import { withoutParams } from "@/lib/views/modal-modes";
import { calcCountry } from "@/lib/views/shell";

export type DrawerStat = { label: string; value: string; sub: string; tone?: "up" | "down" };

export type PositionDrawer = {
  /** Without the exchange suffix. */
  ticker: string;
  /** "NASDAQ", "NSE", or "—" when unknown. */
  exchange: string;
  /** "Apple Inc. · Technology · held in Fidelity Brokerage". */
  identity: string;
  sector: string;
  usd: string;
  /** "30 shares × $232" or "₹1,69,200 at ₹83.40/$". */
  nativeLine: string;
  /** Six stats, in reading order of the 2×3 grid. */
  stats: DrawerStat[];
  /** Null unless Yahoo can show the ticker (market data, `.NS` or `.BO`). */
  yahooHref: string | null;
  account: { name: string; label: string; href: string };
};

const SUFFIX = /\.(NS|BO)$/i;
const EXCHANGE_BY_SUFFIX: Record<string, string> = { NS: "NSE", BO: "BSE" };

/** Splits `<holdingId>~<ticker>` at the last `~`; null for a malformed key. */
export function parsePositionKey(
  key: string | null | undefined,
): { holdingId: string; ticker: string } | null {
  if (!key) return null;
  const at = key.lastIndexOf("~");
  if (at <= 0 || at === key.length - 1) return null;
  return { holdingId: key.slice(0, at), ticker: key.slice(at + 1) };
}

/** The drawer for `position=<holdingId>~<ticker>`, or null when it names no Position of a current Stocks Holding. */
export function buildPositionDrawer(
  data: PortfolioData,
  key: string | null | undefined,
): PositionDrawer | null {
  const parsed = parsePositionKey(key);
  if (!parsed) return null;
  const holding = data.holdings.find(
    (h) => h.id === parsed.holdingId && h.assetClass === "stocks" && h.archivedAt === null,
  );
  const position = holding?.positions.find((p) => p.ticker === parsed.ticker);
  if (!holding || !position) return null;

  const rates: FxRate[] = [
    ...data.fx.history,
    ...(data.fx.today && !data.fx.history.some((r) => r.date === data.fx.today!.asOf)
      ? [{ date: data.fx.today.asOf, rate: data.fx.today.rate }]
      : []),
  ];
  const rateOf = (h: HoldingData) =>
    h.country === "IN" ? (rates.length > 0 ? fxRateOn(rates, data.today).rate : null) : 1;
  const usdOf = (h: HoldingData, p: PositionData) => {
    const rate = rateOf(h);
    return rate === null ? null : (p.shares * p.price) / rate;
  };

  const india = holding.country === "IN";
  const nat = (v: number) => native(v, calcCountry(holding.country));
  const rate = rateOf(holding);
  const value = usdOf(holding, position);

  // Weight: the share of every current Stocks Holding, in USD.
  let total = 0;
  for (const h of data.holdings) {
    if (h.assetClass !== "stocks" || h.archivedAt !== null) continue;
    for (const p of h.positions) total += usdOf(h, p) ?? 0;
  }

  const cost = position.shares * position.avgCost;
  const gain = position.shares * position.price - cost;
  const hand = position.priceSource === "hand";
  const suffix = position.ticker.match(SUFFIX)?.[1].toUpperCase();
  const name = position.name || position.ticker;

  return {
    ticker: position.ticker.replace(SUFFIX, ""),
    exchange: position.exchange ?? (suffix ? EXCHANGE_BY_SUFFIX[suffix] : DASH),
    identity: `${name} · ${position.sector} · held in ${holding.name}`,
    sector: position.sector,
    usd: usd(value),
    nativeLine: india
      ? `${inr(position.shares * position.price)} at ₹${(rate ?? 0).toFixed(2)}/$`
      : `${position.shares} shares × ${nat(position.price)}`,
    stats: [
      {
        label: "Price",
        value: nat(position.price),
        sub: hand && position.priceAsOf ? `as of ${dayMonth(position.priceAsOf)}` : "Market price",
      },
      { label: "Shares", value: String(position.shares), sub: "" },
      { label: "Avg cost", value: nat(position.avgCost), sub: "Per share" },
      { label: "Cost basis", value: nat(cost), sub: "" },
      {
        label: "Unrealized gain",
        value: (gain >= 0 ? "+" : "−") + nat(Math.abs(gain)),
        sub: cost === 0 ? DASH : signedPct(gain / cost),
        tone: gain >= 0 ? "up" : "down",
      },
      { label: "Weight in stocks", value: share(value, total), sub: "" },
    ],
    yahooHref:
      !hand || suffix ? `https://finance.yahoo.com/quote/${encodeURIComponent(position.ticker)}` : null,
    account: { name: holding.name, label: `View ${holding.name}`, href: `/holdings/${holding.id}` },
  };
}

/** The current URL without `position`; every other param stays as it was. */
export const drawerCloseHref = (pathname: string, search: string) =>
  withoutParams(pathname, search, ["position"]);
