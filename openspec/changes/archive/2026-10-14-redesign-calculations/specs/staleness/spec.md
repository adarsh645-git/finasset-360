# staleness

## Purpose

Decides when a Holding or Liability is Stale (its user-entered figure is more than 30 days old) and how old that figure is. Automatic daily Valuations never count.

## ADDED Requirements

### Requirement: An item is Stale when its user-entered figure is over 30 days old
An item SHALL be Stale when more than 30 whole days separate today from the date of its user-entered figure. Both dates are compared as calendar days. Exactly 30 days is not Stale. The age in whole days SHALL be reported alongside.

#### Scenario: ST-01 The 30-day boundary
- **GIVEN** a manually valued Holding whose latest Valuation is `<days>` days before today
- **WHEN** its staleness is checked
- **THEN** its age is `<days>` days and Stale is `<stale>`

Examples:

| days | stale |
|---|---|
| 0 | false |
| 30 | false |
| 31 | true |
| 47 | true |

### Requirement: Which date counts depends on the kind of item
The user-entered date SHALL be the latest Valuation for a manually valued Holding or a Liability. For a Stocks Holding it SHALL be the oldest Hand Price date among its Positions. A Stocks Holding with no Hand-Priced Position SHALL never be Stale.

#### Scenario: ST-02 A Liability is judged by its latest balance
- **GIVEN** a Liability whose latest Valuation was recorded 45 days ago
- **WHEN** its staleness is checked
- **THEN** it is Stale with an age of 45 days

#### Scenario: ST-03 A Stocks Holding is judged by its oldest Hand Price
- **GIVEN** a Stocks Holding with Positions whose Hand Prices are 10 and 47 days old, and a daily automatic Valuation recorded today
- **WHEN** its staleness is checked
- **THEN** it is Stale with an age of 47 days

#### Scenario: ST-04 Listed US tickers never go Stale
- **GIVEN** a Stocks Holding whose Positions all have market data and whose last Valuation is 90 days old
- **WHEN** its staleness is checked
- **THEN** it is not Stale

#### Scenario: ST-05 A brand-new item is fresh
- **GIVEN** a Holding whose only Valuation was recorded today
- **WHEN** its staleness is checked
- **THEN** it is not Stale with an age of 0 days
