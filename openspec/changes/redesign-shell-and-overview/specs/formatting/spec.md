# formatting

## Purpose

Defines how amounts, percentages, dates, durations and ages are written throughout the app, so every screen in every `redesign-*` change shows the same figure the same way.

## ADDED Requirements

### Requirement: USD amounts are whole dollars with US grouping
A USD amount SHALL be rounded to whole dollars and written with a `$` and comma grouping. A negative amount SHALL use the minus sign `−` (U+2212) before the `$`. An amount that rounds to 0 SHALL be written `$0`, never `−$0`.

#### Scenario: FM-01 Writing a USD amount
- **GIVEN** a USD amount of `<amount>`
- **WHEN** it is formatted
- **THEN** it reads `<text>`

Examples:

| amount | text |
|---|---|
| 1234.4 | $1,234 |
| 1284300 | $1,284,300 |
| -9100.5 | −$9,101 |
| 0 | $0 |
| -0.2 | $0 |

### Requirement: Rupee amounts use Indian digit grouping
An INR amount SHALL be rounded to whole rupees and written with `₹` and en-IN grouping (lakh and crore). A native amount SHALL be written in its Country's currency: USD for US, INR for India.

#### Scenario: FM-02 Writing a rupee amount
- **GIVEN** an INR amount of `<amount>`
- **WHEN** it is formatted
- **THEN** it reads `<text>`

Examples:

| amount | text |
|---|---|
| 6200000 | ₹62,00,000 |
| 185000 | ₹1,85,000 |
| -3430000 | −₹34,30,000 |

#### Scenario: FM-03 A native amount follows its Country
- **GIVEN** an amount of 640000 held in `<country>`
- **WHEN** it is formatted as a native amount
- **THEN** it reads `<text>`

Examples:

| country | text |
|---|---|
| US | $640,000 |
| India | ₹6,40,000 |

### Requirement: Compact amounts shorten large USD figures
A compact USD amount SHALL be written as: two decimals with `M` at 1,000,000 or more; whole thousands with `K` from 100,000; one decimal with `K` from 1,000, dropping a trailing `.0`; whole dollars below 1,000. Negative amounts take `−`.

#### Scenario: FM-04 Writing a compact amount
- **GIVEN** a USD amount of `<amount>`
- **WHEN** it is formatted compactly
- **THEN** it reads `<text>`

Examples:

| amount | text |
|---|---|
| 1284300 | $1.28M |
| 412000 | $412K |
| 8600 | $8.6K |
| 3000 | $3K |
| 640 | $640 |
| -13900 | −$13.9K |

### Requirement: Signed amounts and percentages always show their sign
A signed amount SHALL start with `+` for zero or more and `−` below zero, in full or compact form. A signed percentage SHALL show one decimal by default. An unsigned share SHALL be a whole percent. A share of a total of 0 SHALL be 0%, never NaN or infinity.

#### Scenario: FM-05 Writing signed amounts and percentages
- **GIVEN** a value of `<value>` written as `<form>`
- **WHEN** it is formatted
- **THEN** it reads `<text>`

Examples:

| value | form | text |
|---|---|---|
| 6750 | signed | +$6,750 |
| -4250 | signed | −$4,250 |
| 0 | signed | +$0 |
| 48200 | signed compact | +$48.2K |
| 0.0812 | signed percent | +8.1% |
| -0.025 | signed percent | −2.5% |
| 0.523 | share | 52% |

#### Scenario: FM-06 A share of a $0 total is 0%
- **GIVEN** a part of $0 and a total of $0
- **WHEN** the share is formatted
- **THEN** it reads 0%

### Requirement: An absent figure is written as a dash
An absent figure (a 12-month change for an item without a year of history, or any value that doesn't exist yet) SHALL be written as `—`, never as 0, +100% or blank.

#### Scenario: FM-07 An absent change reads as a dash
- **GIVEN** a 12-month change that is absent
- **WHEN** it is formatted as a signed amount or a signed percentage
- **THEN** both read —

### Requirement: Dates, durations and ages have fixed shapes
A month SHALL be written "Oct 2026" (long) or "Oct ’26" (axis). A duration from today SHALL be "in N mo" under a year (at least 1), "in N.N yrs" under ten years, and "in N yrs" from ten. An age SHALL be "1 day old" or "N days old".

#### Scenario: FM-08 Writing months
- **GIVEN** the date 2026-10-13
- **WHEN** it is formatted as a long month and as an axis month
- **THEN** it reads "Oct 2026" and "Oct ’26"

#### Scenario: FM-09 Writing a duration from today
- **GIVEN** a month `<months>` months after today
- **WHEN** the duration is formatted
- **THEN** it reads `<text>`

Examples:

| months | text |
|---|---|
| 0 | in 1 mo |
| 8 | in 8 mo |
| 30 | in 2.5 yrs |
| 132 | in 11 yrs |

#### Scenario: FM-10 Writing an age
- **GIVEN** an age of `<days>` days
- **WHEN** it is formatted
- **THEN** it reads `<text>`

Examples:

| days | text |
|---|---|
| 1 | 1 day old |
| 47 | 47 days old |
