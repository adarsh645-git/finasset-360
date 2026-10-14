# net-worth-history

## Purpose

Derives past values from Valuations and the FX Rate table: the value of any Holding or Liability on any date, Net Worth over time in USD, 12-month change, Today's dollars, and the split of a change into asset growth, debt paid down and Currency effect.

## ADDED Requirements

### Requirement: The value on a date is interpolated between Valuations
An item's native value on date d SHALL be a straight line, by day, between the Valuations either side of d. It is exactly a Valuation's amount on that Valuation's date, held flat after the last Valuation, and 0 before the first. This one rule SHALL serve Holdings and Liabilities alike.

#### Scenario: NH-01 Value on a date follows the history rule
- **GIVEN** a Holding with Valuations of 1,000 on 2026-01-01 and 2,000 on 2026-01-11
- **WHEN** its value is read on `<date>`
- **THEN** it is `<value>`

Examples:

| date | value |
|---|---|
| 2025-12-31 | 0 |
| 2026-01-01 | 1000 |
| 2026-01-06 | 1500 |
| 2026-01-11 | 2000 |
| 2026-06-30 | 2000 |

#### Scenario: NH-02 An archived item counts only while it was held
- **GIVEN** a Holding with one Valuation of 5,000 on 2026-01-01, archived on 2026-05-01
- **WHEN** its value is read on 2026-03-01, 2026-05-01 and 2026-05-02
- **THEN** it is 5,000, 5,000 and 0

#### Scenario: NH-03 A current value acts as today's Valuation
- **GIVEN** a Stocks Holding whose last Valuation is 10,000 on 2026-10-01 and whose current value is 10,600, with today being 2026-10-13
- **WHEN** its value is read on 2026-10-13 and on 2026-10-07
- **THEN** it is 10,600 on 2026-10-13 and 10,300 on 2026-10-07

### Requirement: History is sampled at month-ends plus today
A history series SHALL be sampled at its start date, then at every month-end after the start and before today, then at today. The start SHALL be the later of the requested range start and the Portfolio's earliest Valuation. A start of today gives a single point.

#### Scenario: NH-04 Sample dates for a range
- **GIVEN** a Portfolio whose earliest Valuation is `<first>`, with today being 2026-10-13
- **WHEN** history is sampled for a range starting `<range start>`
- **THEN** the sample dates are `<dates>`

Examples:

| first | range start | dates |
|---|---|---|
| 2025-01-01 | 2026-07-13 | 2026-07-13, 2026-07-31, 2026-08-31, 2026-09-30, 2026-10-13 |
| 2026-08-20 | 2025-10-13 | 2026-08-20, 2026-08-31, 2026-09-30, 2026-10-13 |
| 2026-10-13 | 2025-10-13 | 2026-10-13 |

### Requirement: The FX Rate for a date is the latest rate on or before it
The FX Rate for date d SHALL be the stored INR-per-USD rate with the latest date on or before d. A date earlier than every stored rate SHALL use the earliest one. Today's FX Rate SHALL be reported with the date it was stored, so a missed daily fetch is visible.

#### Scenario: NH-05 Looking up the FX Rate for a date
- **GIVEN** FX Rates of 82.0 on 2026-01-01, 83.0 on 2026-01-05 and 83.4 on 2026-10-10
- **WHEN** the FX Rate is looked up for `<date>`
- **THEN** it is `<rate>` as of `<as of>`

Examples:

| date | rate | as of |
|---|---|---|
| 2025-06-01 | 82.0 | 2026-01-01 |
| 2026-01-04 | 82.0 | 2026-01-01 |
| 2026-01-05 | 83.0 | 2026-01-05 |
| 2026-10-13 | 83.4 | 2026-10-10 |

### Requirement: Past Net Worth converts each date at that date's FX Rate
Net Worth on date d SHALL be the sum of Holdings' values on d minus the sum of Liabilities' values on d. Each value is converted to USD at d's FX Rate: a USD item as is, and an India item as its native value ÷ the FX Rate.

#### Scenario: NH-06 Net Worth on a past date uses that date's FX Rate
- **GIVEN** a US Holding worth $50,000 and an India Holding worth ₹8,200,000 on 2026-01-01, an India Liability with balance ₹4,100,000 on that date, and an FX Rate of 82.0 on that date
- **WHEN** Net Worth is computed for 2026-01-01
- **THEN** it is 50,000 + 100,000 − 50,000 = $100,000

### Requirement: 12-month change compares an item with its value a year ago
An item's 12-month change SHALL be its USD value today minus its USD value 12 months ago, each at its own date's FX Rate. The percent is that difference ÷ the value 12 months ago. An item with no Valuation on or before that start SHALL have no 12-month change (absent, shown as "—"), never +100%.

#### Scenario: NH-07 12-month change of an item with a year of history
- **GIVEN** a US Holding worth $80,000 on 2025-10-13 and $100,000 today, 2026-10-13
- **WHEN** its 12-month change is computed
- **THEN** it is +$20,000, or +25%

#### Scenario: NH-08 A brand-new item has no 12-month change
- **GIVEN** a Holding whose first Valuation was recorded 3 months ago
- **WHEN** its 12-month change is computed
- **THEN** both the amount and the percent are absent

### Requirement: A set's 12-month change counts only items with a year of history
A 12-month change for a set of items (an Asset Class, all Liabilities) SHALL sum the changes of the items that have a Valuation on or before the start, and leave out items added since. The percent is ÷ those items' total a year ago. With no such item, or with that total at 0, the percent SHALL be absent. A Liability set's change is reported as paid down: balance then − balance now.

#### Scenario: NH-09 A new Holding does not inflate its class's change
- **GIVEN** a Stocks class with one Holding worth $100,000 a year ago and $110,000 today, and a second Holding added last month worth $50,000
- **WHEN** the class's 12-month change is computed
- **THEN** it is +$10,000, or +10%

#### Scenario: NH-10 Paid down in 12 months for Liabilities
- **GIVEN** a Liability with balance $300,000 a year ago and $280,000 today, and a second Liability added last month with balance $5,000
- **WHEN** the Liabilities' 12-month paid-down figure is computed
- **THEN** it is $20,000

### Requirement: Today's dollars deflates each Country at its own inflation
A Country's series SHALL be restated in Today's dollars as v ÷ (1 + inflation)^(k/12). Here k is the number of whole calendar months from the current month to the point's month, negative for the past, and inflation is that Country's resolved Projection Assumption. The Countries' restated series are then summed. Today's point SHALL be unchanged.

#### Scenario: NH-11 Past values rise and future values fall in Today's dollars
- **GIVEN** a US series worth $100,000 at today, 24 months ago and 24 months ahead, with US inflation at 3%
- **WHEN** it is restated in Today's dollars
- **THEN** today is $100,000, 24 months ago is 100,000 × 1.03², and 24 months ahead is 100,000 ÷ 1.03²

#### Scenario: NH-12 Each Country deflates at its own inflation before summing
- **GIVEN** a US series of $100,000 and an India series of $100,000 (in USD), both 12 months ahead, with US inflation at 3% and India inflation at 5%
- **WHEN** the total is restated in Today's dollars
- **THEN** it is 100,000 ÷ 1.03 + 100,000 ÷ 1.05

### Requirement: Change attribution splits a Net Worth change exactly into three terms
For a range from t0 to today and a Country scope, the change in Net Worth SHALL be split into three terms that sum exactly to it:
- asset growth = Σ Holdings (native now − native at t0) ÷ FX at t0;
- debt paid down = Σ Liabilities (native at t0 − native now) ÷ FX at t0;
- Currency effect = Σ native now × (1/FX now − 1/FX at t0), assets positive and India Liabilities negative.

USD items SHALL use an FX of 1, so they have no currency term. An item added after t0 counts from 0.

#### Scenario: NH-13 The three terms sum to the change in Net Worth
- **GIVEN** a Portfolio with Holdings and Liabilities in both Countries, Valuations across the range, and different FX Rates at t0 and today
- **WHEN** the change since t0 is attributed for all Countries
- **THEN** asset growth + debt paid down + Currency effect equals Net Worth today minus Net Worth at t0, within $0.01

#### Scenario: NH-14 A weaker rupee shows as a negative Currency effect
- **GIVEN** an India Holding worth ₹8,340,000 at t0 and today, an FX Rate of 80.0 at t0 and 83.4 today
- **WHEN** the change since t0 is attributed
- **THEN** asset growth is 0, debt paid down is 0, and the Currency effect is −$4,250

#### Scenario: NH-15 An India Liability's Currency effect has the opposite sign
- **GIVEN** an India Liability with balance ₹834,000 at t0 and today, an FX Rate of 80.0 at t0 and 83.4 today
- **WHEN** the change since t0 is attributed
- **THEN** debt paid down is 0 and the Currency effect is +$425

#### Scenario: NH-16 Scope limits attribution to the chosen Country
- **GIVEN** a Portfolio with Holdings in both Countries
- **WHEN** the change since t0 is attributed with the scope set to US only
- **THEN** the Currency effect is 0 and the terms sum to the change in the US items' Net Worth alone

#### Scenario: NH-17 A Holding added during the range counts fully as asset growth
- **GIVEN** a US Holding first valued at $10,000 after t0 and still worth $10,000 today
- **WHEN** the change since t0 is attributed
- **THEN** it adds $10,000 to asset growth
