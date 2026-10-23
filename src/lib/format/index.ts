import type { Country } from "@/lib/calc/types";

/** An absent figure: never 0, +100% or blank. */
export const DASH = "—";

type Absent = null | undefined;
const absent = (v: unknown): v is Absent =>
  v == null || (typeof v === "number" && !Number.isFinite(v));

const MINUS = "−";

/** Round to whole units; a value that rounds to 0 loses its sign. */
function whole(v: number): number {
  const r = Math.round(Math.abs(v));
  return v < 0 && r !== 0 ? -r : r;
}

function currency(v: number | Absent, symbol: string, locale: string): string {
  if (absent(v)) return DASH;
  const n = whole(v);
  return (n < 0 ? MINUS : "") + symbol + Math.abs(n).toLocaleString(locale);
}

export const usd = (v: number | Absent) => currency(v, "$", "en-US");
export const inr = (v: number | Absent) => currency(v, "₹", "en-IN");
export const native = (v: number | Absent, country: Country) =>
  country === "India" ? inr(v) : usd(v);

/** Thresholds follow the prototype's `cmp()` exactly. */
export function compact(v: number | Absent): string {
  if (absent(v)) return DASH;
  const a = Math.abs(v);
  const body =
    a >= 1e6
      ? (a / 1e6).toFixed(2) + "M"
      : a >= 1e5
        ? Math.round(a / 1e3) + "K"
        : a >= 1e3
          ? (a / 1e3).toFixed(1).replace(/\.0$/, "") + "K"
          : String(Math.round(a));
  return (v < 0 ? MINUS : "") + "$" + body;
}

const sign = (v: number) => (v >= 0 ? "+" : MINUS);

export function signed(v: number | Absent): string {
  if (absent(v)) return DASH;
  return sign(v) + usd(Math.abs(v));
}

export function signedCompact(v: number | Absent): string {
  if (absent(v)) return DASH;
  return sign(v) + compact(Math.abs(v));
}

/** A fraction (0.0812) as a signed percent, one decimal by default. */
export function signedPct(v: number | Absent, digits = 1): string {
  if (absent(v)) return DASH;
  return sign(v) + Math.abs(v * 100).toFixed(digits) + "%";
}

/** `part / total` as a whole percent; a total of 0 is 0%. */
export function share(part: number | Absent, total: number | Absent): string {
  if (absent(part) || absent(total)) return DASH;
  if (total === 0) return "0%";
  return Math.round((part / total) * 100) + "%";
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthParts(d: string | Date): [string, number] {
  const iso = typeof d === "string" ? d : d.toISOString();
  return [MONTHS[Number(iso.slice(5, 7)) - 1], Number(iso.slice(0, 4))];
}

export function monthLong(d: string | Date | Absent): string {
  if (d == null) return DASH;
  const [m, y] = monthParts(d);
  return `${m} ${y}`;
}

/** "10 Oct". */
export function dayMonth(d: string | Date | Absent): string {
  if (d == null) return DASH;
  const iso = typeof d === "string" ? d : d.toISOString();
  return `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`;
}

export function monthAxis(d: string | Date | Absent): string {
  if (d == null) return DASH;
  const [m, y] = monthParts(d);
  return `${m} ’${String(y).slice(2)}`;
}

export function inDuration(months: number | Absent): string {
  if (absent(months)) return DASH;
  if (months < 12) return `in ${Math.max(1, Math.round(months))} mo`;
  const yrs = months / 12;
  if (yrs < 10) return `in ${yrs.toFixed(1).replace(/\.0$/, "")} yrs`;
  return `in ${Math.round(yrs)} yrs`;
}

export function daysOld(n: number | Absent): string {
  if (absent(n)) return DASH;
  return n === 1 ? "1 day old" : `${n} days old`;
}
