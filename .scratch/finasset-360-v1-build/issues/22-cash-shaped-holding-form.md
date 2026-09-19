Type: build
Status: resolved

# 22: Cash-shaped add/edit form (no market symbol or quantity)

**What to build:** When the selected Asset Class is Cash, the add-Holding form and the Holding detail/edit form stop asking for Market symbol and Quantity — neither means anything for cash. A Cash entry needs only: name, Held at (optional), currency.

Not spec-derived — filed ad hoc from a user bug report with a screenshot of the Cash Asset Class showing Market symbol / Quantity / "Holding name" fields ("Cash is not a holding, this needs to be fixed"). Clarified via question: the user chose the **narrow** fix — a Cash-shaped form — over renaming the wording or reworking Cash into a per-currency balance.

**Decisions, settled this session:**

- **Data model unchanged.** A Cash entry is still a Holding (CONTEXT.md and ticket 19 both rely on "a Cash Holding at Chase Checking vs Ally Savings"). Only the form changes.
- **Wording unchanged.** "Holdings", "0 Holdings", "Holding name" stay as they are; the user did not pick the rename option.
- No `price_lookup_symbol`/`quantity` is ever set on a Cash Holding, so no Live Estimate (ticket 07) appears for it.

**Open, decide at build time (small):**

- **How does the app know a class is "Cash"?** Cash is a default Asset Class, but users can create their own classes and rename or delete defaults. Matching on the name string is fragile; a flag/kind on `asset_class` (set for the seeded Cash class) is sturdier but needs a migration and backfill of existing Portfolios. Look at the current `asset_class` schema and seeding (ticket 03) first, and pick the smaller thing that survives a rename.
- **Other classes with the same problem?** Real Estate has no market symbol either, but the user only reported Cash. Don't widen scope; if the mechanism chosen makes it a one-line follow-on, mention it in the resolution rather than doing it.

**Blocked by:** none. Touches the same two components as [19](19-held-at-field.md) and [18](18-stock-picker-autocomplete.md) (`AddHoldingRow.tsx`, `HoldingDetailPanel.tsx`).

- [x] Selecting Cash shows an add form with name, Held at, currency only — no Market symbol, no Quantity
- [x] The Holding detail/edit form for a Cash Holding likewise hides Market symbol and Quantity
- [x] Other Asset Classes (Equity, Crypto, Precious Metal, Real Estate, custom) keep their current forms
- [x] A Cash Holding created this way has `price_lookup_symbol` and `quantity` null; the server route also refuses (or ignores) them for Cash rather than trusting the client
- [x] Existing Cash Holdings that somehow already carry a symbol/quantity are handled without data loss (decide: still show, or leave hidden but stored)
- [x] The mechanism for identifying Cash survives the user renaming the class, or the limitation is stated explicitly
- [ ] UI verified by hand, naming the viewport width

## Resolution

Built on `ticket-22-cash-holding-form`, merged to main. **Cash is identified by the fixed default Asset Class id** (`isCashAssetClass(id)` in `src/lib/asset-classes/defaults.ts`): default classes are global rows RLS stops Users renaming/deleting, so it survives a rename with no migration. Limit: a custom class a User names "Savings" is not Cash-shaped. Real Estate would be a one-line follow-on (id set); not done.

- `AddHoldingRow` (new `isCash` prop) and `HoldingDetailPanel` hide Market symbol and Quantity for Cash; edit form follows the class currently selected in the form.
- POST/PATCH `/api/holdings` return 400 for a non-null symbol/quantity on a Cash Holding; clearing both is allowed. Moving a Holding into Cash via the form clears the pair in the same save.
- Legacy Cash Holdings with a stored symbol/quantity keep them (hidden); Live Estimate still renders.
- Known API-only gap: a raw PATCH moving an Equity Holding with a symbol into Cash without sending the pair leaves the symbol; the form never does this, and closing it server-side would wipe legacy Cash data.
- Tests: route tests for the above; render test for the edit form; no automated test for the add form's open state (no jsdom setup).
- **Still to do by hand:** open Cash, then a Cash Holding, confirm both forms show name/Held at/currency only; confirm Equity unchanged. State the viewport width.
