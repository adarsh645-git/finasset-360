Type: build
Status: resolved

# 19: "Held at" field on a Holding

**What to build:** A new, optional `held_at` text field on Holding — a freeform label for where it's held (a brokerage, a bank, an exchange, "at home," etc.), so two Holdings of the same thing (e.g. Apple stock in a Fidelity 401k and in Robinhood) don't have to hack that distinction into `Name`.

Not spec-derived — filed ad hoc from a user request while reviewing ticket 18's edit form ("what is the point of having market symbol and name editable in this section... would rather having brokerage as a field"), grilled via `/grill-me` in this session. `docs/SPEC.md`'s own founding problem statement already names this pain point ("equities across a couple of brokerages"), so this fills a gap in the original spec rather than adding scope beyond it.

**Decisions, settled this session:**

- **Applies to every Asset Class, not just stock-symbol Holdings** — a Cash Holding at "Chase Checking" vs "Ally Savings," or Precious Metal "at home" vs "in a vault," is the same need. So it's a plain optional field on `holding`, independent of `price_lookup_symbol`/`quantity`, not gated by Asset Class or coupled to the market-data pair.
- **Named "Held at"** (`held_at` column), not "Account" or "Brokerage" — "Account" collides with CONTEXT.md's existing reserved term (the User's own login concept: *"Avoid: Account, tenant"*); "Brokerage" is stock-specific and wouldn't fit a Cash or Precious Metal Holding.
- **`Name` stays exactly as it is** — freely editable, no forced derivation from a resolved ticker's company name. Held at solves the disambiguation need going forward; it doesn't retroactively take away anyone's existing custom label.
- **Edit-form-only visibility**, matching Sector's precedent (ticket 18) — never shown in list rows, the page header, Check-in, or the staleness list. Accepted tradeoff: two Holdings both named "Apple" at different brokerages look identical everywhere outside their own edit forms. Revisit only if this becomes an actual annoyance, not speculatively.
- **Field order** (both `AddHoldingRow.tsx` and `HoldingDetailPanel.tsx`, after ticket 18's reordering): Market symbol → Quantity → Name → **Held at** → Asset Class *(detail panel only)* → Currency. Grouped next to `Name` (both are "how do I label/tell this Holding apart"), not next to the market-data pair.

**Blocked by:** none — reuses ticket 18's exact pattern for an independent, optional, freely-editable string field on Holding (`sector`): same migration shape, same route-validation shape, same component wiring.

- [x] Migration: `holding.held_at text null`
- [x] `HOLDING_COLUMNS` includes `held_at`
- [x] `Holding`/`HoldingPatch` types include `held_at: string | null`
- [x] POST `/api/holdings` and PATCH `/api/holdings/[id]` accept optional `held_at` (independent of `price_lookup_symbol`/`quantity`, same validation shape as `sector`)
- [x] `AddHoldingRow.tsx`: "Held at" field, positioned after Name, before Currency
- [x] `HoldingDetailPanel.tsx`: "Held at" field, positioned after Name, before Asset Class
- [x] `Name` is unaffected — still freely editable, no auto-derivation
- [x] Not shown in Miller column rows, the narrow accordion, the page header, Check-in, or the staleness list
- [x] `CONTEXT.md`'s new **Held at** term matches what ships
