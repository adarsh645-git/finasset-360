Type: build
Status: ready-for-agent

# 05: Liabilities, and Net Worth nets them

**What to build:** The debt side, mirroring the asset side so there is no second mental model. Liability Classes with global defaults and custom additions; Liabilities as their own top-level branch grouped by class; balances recorded exactly the way Holding values are. Net Worth becomes Holdings minus Liabilities.

Liability Class is a **separate table** from Asset Class, not one table with a discriminator — that would let a foreign key point a Holding at a Liability Class, or need a trigger to prevent it.

Spec: [`docs/SPEC.md`](../../../docs/SPEC.md) — user stories 8, 16, 28, 48, 56.

**Blocked by:** 04.

- [ ] Global default Liability Classes plus custom ones, same ownership and RLS rules as Asset Class
- [ ] `liability_class` is its own table, identical in shape to `asset_class`, not a discriminated variant of it
- [ ] Add, edit and delete a Liability: name, Liability Class, currency
- [ ] Liabilities are their own top-level branch in the Miller columns, grouped by Liability Class, with class icons and the same neutral-glyph fallback
- [ ] `liability_valuation` is its own table mirroring `holding_valuation` (a plain FK cannot target one of two tables; a polymorphic pair would surrender referential integrity)
- [ ] Recording a Liability balance works identically to recording a Holding value, including backdating and one-per-day
- [ ] Net Worth headline reads Holdings − Liabilities with the breakdown visible
- [ ] Deleting a Liability Class that still has Liabilities is refused
- [ ] Test: User A cannot read or write User B's Liabilities or their Valuations
- [ ] Test: Net Worth nets correctly across a multi-currency mix of Holdings and Liabilities
