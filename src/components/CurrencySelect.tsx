import { ISO_4217_CODES } from "@/lib/currency/iso4217";

// The open ISO-code picker shared by every place currency is chosen (home
// currency, and now a Holding's currency) — an open <select> over the full
// list, not a hardcoded subset, per docs/SPEC.md's "no DB reference table"
// decision.
export function CurrencySelect({
  id,
  value,
  onChange,
  disabled,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-hairline bg-transparent px-2 py-1.5 text-sm disabled:opacity-60"
    >
      {ISO_4217_CODES.map((code) => (
        <option key={code} value={code}>
          {code}
        </option>
      ))}
    </select>
  );
}
