# equity

## Purpose

Computes Equity for each Holding linked to a Liability (value minus loan, both in USD), its % owned, and Equity built across all linked pairs, at any point, recorded or projected.

## ADDED Requirements

### Requirement: Equity is a linked Holding's value minus its Liability's balance
For a Holding linked to a Liability, Equity at any point SHALL be the Holding's USD value minus the Liability's USD balance at that same point, recorded or projected. Each side is converted at its point's FX Rate. Equity can be negative.

#### Scenario: EQ-01 Equity of a financed property
- **GIVEN** a US Real estate Holding worth $500,000 linked to a Liability with balance $320,000
- **WHEN** its Equity is computed
- **THEN** it is $180,000

#### Scenario: EQ-02 An India pair converts to USD at the FX Rate
- **GIVEN** an India Holding worth ₹16,680,000 linked to an India Liability with balance ₹8,340,000, and an FX Rate of 83.4
- **WHEN** its Equity is computed
- **THEN** it is $100,000

#### Scenario: EQ-03 Equity follows a projected series point by point
- **GIVEN** a projected Holding series and its linked Liability's projected series
- **WHEN** Equity is computed over the Projection
- **THEN** each month's Equity is that month's Holding value minus that month's Liability balance
- **AND** once the Liability is paid off, Equity equals the Holding's value

### Requirement: % owned is Equity over value, clamped to 0–100%
% owned SHALL be Equity ÷ the Holding's USD value, clamped to the range 0 to 1. A Holding worth 0 SHALL be 0% owned.

#### Scenario: EQ-04 % owned is clamped
- **GIVEN** a linked Holding worth `<value>` and a Liability with balance `<balance>`, both in USD
- **WHEN** its % owned is computed
- **THEN** it is `<owned>`

Examples:

| value | balance | owned |
|---|---|---|
| 500000 | 320000 | 0.36 |
| 500000 | 0 | 1 |
| 300000 | 350000 | 0 |
| 0 | 10000 | 0 |

### Requirement: Equity built sums every linked pair
Equity built SHALL be the sum of Equity across every Holding–Liability link in the Portfolio. A Portfolio with no links has Equity built of 0.

#### Scenario: EQ-05 Equity built across two financed assets
- **GIVEN** two linked pairs with Equity of $180,000 and −$5,000
- **WHEN** Equity built is computed
- **THEN** it is $175,000

#### Scenario: EQ-06 No links means no Equity built
- **GIVEN** a Portfolio with Holdings and Liabilities but no links between them
- **WHEN** Equity built is computed
- **THEN** it is 0
