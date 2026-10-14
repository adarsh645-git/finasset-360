# liabilities-page

## Purpose

The `/liabilities` screen: what a User owes in total and how much was paid down in 12 months, four summary stats, a payoff timeline of every loan's balance, one row per loan, the empty state, and the links that lead to it.

## ADDED Requirements

### Requirement: The header shows the total owed and 12 months of paid down
The header SHALL show the sum of every active Liability's current balance in USD at today's FX Rate. Beside it, it SHALL show the Liabilities' 12-month paid-down figure, counting only Liabilities with a Valuation a year ago, in compact USD. With no such Liability it SHALL show "—".

#### Scenario: LB-01 Total and paid down for a year of history
- **GIVEN** today is 2026-10-14, the FX Rate is 83.40, a US Liability with balance $300,000 a year ago and $280,000 today, and an India Liability with balance ₹41,70,000 a year ago (FX Rate 83.00) and ₹41,70,000 today
- **WHEN** the Liabilities page is shown
- **THEN** the total is $330,000
- **AND** the paid-down figure is $20,000 + ($50,240.96 − $50,000) = $20,240.96, shown as "$20.2K paid down in 12 mo"

#### Scenario: LB-02 Paid down is "—" without a year of history
- **GIVEN** every active Liability's first Valuation is less than 12 months old
- **WHEN** the Liabilities page is shown
- **THEN** the header reads "— paid down in 12 mo"

### Requirement: Four stats summarise the loans
The page SHALL show four stats over active Liabilities with a positive balance: Monthly payments (sum in USD at today's FX Rate, "All EMIs, converted to USD"), Weighted rate (APR weighted by USD balance, two decimals, "By current balance"), Debt-free (the latest payoff month), and Interest remaining (sum in USD of on-track loans, "If paid on schedule").

#### Scenario: LB-03 Monthly payments and weighted rate
- **GIVEN** a US loan with balance $200,000 at 6% paying $2,000, an India loan with balance ₹83,40,000 at 9% paying ₹83,400, an FX Rate of 83.40, and a paid-off US loan with balance 0 paying $500
- **WHEN** the stats are shown
- **THEN** Monthly payments is $3,000
- **AND** Weighted rate is 7.00%

#### Scenario: LB-04 Debt-free date or Not on track
- **GIVEN** today is 2026-10-14 and active loans whose payoff months are `<payoffs>`
- **WHEN** the Debt-free stat is shown
- **THEN** it reads `<value>` with sub `<sub>`

Examples:

| payoffs | value | sub |
|---|---|---|
| month 8, month 74 | Dec 2032 | In 6.2 yrs at current payments |
| month 8, Not on track | Not on track | A payment doesn’t cover interest |

#### Scenario: LB-05 Interest remaining leaves out Not on track loans
- **GIVEN** two on-track loans with interest remaining $10,000 and ₹8,34,000 at an FX Rate of 83.40, and one Not on track loan
- **WHEN** the Interest remaining stat is shown
- **THEN** it reads $20,000 with sub "Excludes 1 loan not on track"

### Requirement: Each active loan has a row, largest balance first
The page SHALL list every active Liability, sorted by USD balance descending. A row SHALL show the loan's colour, name, Country, USD balance, the native balance for an India loan, a paid-off bar, "⟨N%⟩ paid · ⟨APR⟩% · ⟨Monthly payment⟩/mo", and "Secures ⟨Holding⟩ · " (when linked) followed by "Paid off ⟨Mon YYYY⟩" or "No payoff at this payment". The row SHALL link to its Loan detail.

#### Scenario: LB-06 A linked India loan's row
- **GIVEN** an India loan "Apartment loan · HDFC" with principal ₹38,00,000, balance ₹34,30,000, APR 8.5%, Monthly payment ₹33,000, linked to "Pune apartment", paying off in Jun 2039, and an FX Rate of 83.40
- **WHEN** its row is shown
- **THEN** it reads "Apartment loan · HDFC", "IN", "$41,127" and "₹34,30,000"
- **AND** "10% paid · 8.5% · ₹33,000/mo" and "Secures Pune apartment · Paid off Jun 2039"
- **AND** it links to that loan's Loan detail

#### Scenario: LB-07 An unlinked Not on track loan's row
- **GIVEN** an unlinked US loan whose payment doesn't cover its interest
- **WHEN** its row is shown
- **THEN** the right-hand text reads "No payoff at this payment" with no "Secures" part
- **AND** no native balance is shown

#### Scenario: LB-08 Order, colours and archived loans
- **GIVEN** three loans created in the order A ($5,000), B ($200,000), C ($40,000), and a fourth loan D that is archived
- **WHEN** the rows are shown
- **THEN** they are B, C, A and D is absent
- **AND** A, B and C keep loan colours 1, 2 and 3 whatever their order

### Requirement: A Stale loan's row carries an age cue
A row SHALL append a muted "· ⟨N⟩ days old" to its meta line when its Liability is Stale (latest Valuation over 30 days old), and nothing otherwise.

#### Scenario: LB-09 Stale cue on a loan row
- **GIVEN** a loan whose latest Valuation is `<days>` days old
- **WHEN** its row is shown
- **THEN** the cue is `<cue>`

Examples:

| days | cue |
|---|---|
| 0 | (none) |
| 30 | (none) |
| 47 | · 47 days old |

### Requirement: The payoff timeline stacks every loan's balance
The payoff timeline SHALL stack one area per Liability, largest current balance at the bottom, over recorded history (from the first Liability Valuation, at the shared sample dates) then the Projection to the horizon, dashed after today. Archived Liabilities SHALL count while they were held. With the projection toggle off, the chart SHALL end at today. Its tooltip SHALL show each loan's own balance.

#### Scenario: LB-10 The stack's top is total Liabilities
- **GIVEN** two loans with history and a 10-year horizon
- **WHEN** the payoff timeline is drawn with the projection on
- **THEN** at every sample date the top of the stack equals total Liabilities in USD at that date
- **AND** each loan's layer drops to 0 at its payoff month and stays there

#### Scenario: LB-11 Projection off and archived loans
- **GIVEN** a loan archived three months ago and an active loan, with the projection toggle off
- **WHEN** the payoff timeline is drawn
- **THEN** it ends at today
- **AND** the archived loan's layer covers its history up to its archive date and is 0 after

### Requirement: With no active loans the page shows an empty state
With no active Liability, the page SHALL show a $0 total, "— paid down in 12 mo", each stat's value as "—", no payoff timeline, and a "No loans" message with an "Add loan" button in place of the rows.

#### Scenario: LB-12 Empty Liabilities page
- **GIVEN** a User with Holdings but no active Liability
- **WHEN** the Liabilities page is shown
- **THEN** the total is $0, the paid-down figure and all four stat values are "—"
- **AND** no chart renders and "No loans" with "Add loan" replaces the rows

### Requirement: The app links to the Liabilities page
The Liabilities nav item (sidebar, tablet tabs and phone tab bar), the Overview Liabilities stat card, and each Liability row in Overview's "Needs updating" card SHALL be links: the first two to `/liabilities`, a "Needs updating" row to its Loan detail. The nav item SHALL be marked active on `/liabilities` and on any Loan detail.

#### Scenario: LB-13 Incoming links point at the Liabilities pages
- **GIVEN** a Portfolio with one Stale loan
- **WHEN** the shell and Overview are rendered
- **THEN** the Liabilities nav item and the Liabilities stat card link to `/liabilities`
- **AND** the loan's "Needs updating" row links to `/liabilities/<its id>`
- **AND** on that Loan detail the Liabilities nav item is the active one
