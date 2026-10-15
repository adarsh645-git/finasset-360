# projection Specification

## Purpose
Computes the Projection: a month-by-month forward trajectory of every Holding, Liability, Asset Class, Country and Net Worth over the User's horizon, from current values, Projection Assumptions and today's FX Rate.

## Requirements

### Requirement: Blank Projection Assumptions use their defaults
The Projection SHALL treat every blank Projection Assumption as its default. Per-Country defaults (inflation, Real estate, Stocks, Cash) come from the Country. Shared defaults (Crypto, Metals, Vehicles & other) come from the Asset Class. A blank Monthly savings or savings growth rate means 0, and a blank horizon means 10 years. A rate the User has filled in, including 0, overrides its default.

#### Scenario: PR-01 Each blank assumption resolves to its default
- **GIVEN** Projection Assumptions with every field blank
- **WHEN** the Projection resolves `<assumption>`
- **THEN** it uses `<default>`

Examples:

| assumption | default |
|---|---|
| US inflation | 3% |
| US Real estate | 4% |
| US Stocks | 7% |
| US Cash | 3.5% |
| India inflation | 5% |
| India Real estate | 6% |
| India Stocks | 11% |
| India Cash | 6.5% |
| Crypto | 5% |
| Metals | 4% |
| Vehicles & other | −9% |
| Monthly savings (either Country) | 0 |
| savings growth rate | 0% |
| horizon | 10 years |

#### Scenario: PR-02 A filled-in zero rate overrides the default
- **GIVEN** Projection Assumptions with US Stocks set to 0% and everything else blank
- **WHEN** a $100,000 US Stocks Holding is projected
- **THEN** its value is $100,000 in every month of the Projection

### Requirement: The Projection spans the horizon month by month
The Projection SHALL return one point per month from month 0 (today) to month horizon × 12, inclusive. At month 0 every figure SHALL equal the current values: each Holding's current value, each Liability's current balance, and no savings.

#### Scenario: PR-03 Series length follows the horizon
- **GIVEN** a horizon of `<years>` years
- **WHEN** the Projection is computed
- **THEN** every series has `<points>` monthly points, month 0 being today

Examples:

| years | points |
|---|---|
| 1 | 13 |
| 10 | 121 |
| 40 | 481 |

#### Scenario: PR-04 Month 0 equals today's Net Worth
- **GIVEN** a Portfolio with Holdings and Liabilities in both Countries and non-zero Monthly savings
- **WHEN** the Projection is computed
- **THEN** Net Worth at month 0 equals the sum of Holdings' current values minus the sum of Liabilities' current balances, in USD at today's FX Rate

#### Scenario: PR-05 An empty Portfolio projects to zero
- **GIVEN** a Portfolio with no Holdings, no Liabilities and blank Monthly savings
- **WHEN** the Projection is computed
- **THEN** every series is 0 at every month

### Requirement: Each Holding compounds at its Asset Class rate for its Country
Each Holding's projected native value at month k SHALL be its current value × (1 + r)^(k/12). Here r is the rate of its Asset Class, taken from its Country for Real estate, Stocks and Cash, and from the shared rate for Crypto, Metals and Vehicles & other.

#### Scenario: PR-06 A Holding compounds at the rate its class and Country select
- **GIVEN** a `<country>` `<class>` Holding with current value 100,000 and blank Projection Assumptions
- **WHEN** the Projection is computed
- **THEN** its native value at month 24 is 100,000 × (1 + `<rate>`)^2

Examples:

| country | class | rate |
|---|---|---|
| US | Stocks | 0.07 |
| India | Stocks | 0.11 |
| India | Real estate | 0.06 |
| US | Cash | 0.035 |
| US | Vehicles & other | −0.09 |
| India | Vehicles & other | −0.09 |
| India | Crypto | 0.05 |

### Requirement: The Projection holds FX flat at today's rate
Every projected native figure in India SHALL convert to USD at today's FX Rate, for every month of the Projection.

#### Scenario: PR-07 An India Holding converts at today's FX Rate throughout
- **GIVEN** an India Cash Holding of ₹8,340,000 and today's FX Rate of 83.4 INR per USD
- **WHEN** the Projection is computed
- **THEN** its USD value at every month k is its native value at month k ÷ 83.4

### Requirement: Each Liability amortizes by its APR and Monthly payment
Each month, a Liability's balance SHALL become max(0, balance × (1 + APR/12) − Monthly payment). Its payoff month is the first month its balance reaches 0, and it stays 0 after that. A Liability whose balance is already 0 today is paid off at month 0.

#### Scenario: PR-08 Payoff month matches the annuity formula
- **GIVEN** a US Liability with balance $200,000, APR 6% and Monthly payment $2,000
- **WHEN** the Projection is computed
- **THEN** its payoff month is ⌈−ln(1 − 200,000 × 0.005 / 2,000) ÷ ln(1.005)⌉ = 139
- **AND** its balance is 0 at month 139 and every month after

#### Scenario: PR-09 A Liability at zero balance is already paid off
- **GIVEN** a Liability with balance 0 and Monthly payment 500
- **WHEN** the Projection is computed
- **THEN** its payoff month is 0, its interest remaining is 0 and its balance is 0 throughout

#### Scenario: PR-10 Raising a Monthly payment raises projected Net Worth
- **GIVEN** a Portfolio with one Holding and one Liability
- **WHEN** the Liability's Monthly payment is raised and the Projection recomputed
- **THEN** projected Net Worth is strictly higher at every month from 1 until the earlier payoff month
- **AND** month 0 is unchanged

### Requirement: The Projection reports interest remaining and payoff beyond the horizon
For each Liability that is on track, the Projection SHALL report its payoff month and interest remaining (the sum of monthly interest from month 1 to payoff, in native currency). It SHALL report both even when payoff falls after the horizon.

#### Scenario: PR-11 Interest remaining equals total paid minus today's balance
- **GIVEN** a Liability with balance $200,000, APR 6% and Monthly payment $2,000
- **WHEN** the Projection is computed
- **THEN** its interest remaining equals the sum of every payment made until payoff (the last one partial) minus $200,000, within $0.01

#### Scenario: PR-12 Payoff after the horizon is still reported
- **GIVEN** a horizon of 5 years and a Liability that pays off in month 139
- **WHEN** the Projection is computed
- **THEN** its payoff month is 139 and its interest remaining covers every month to 139
- **AND** its series stops at month 60 with a positive balance

### Requirement: A Liability whose payment doesn't cover its interest is Not on track
A Liability with a positive balance SHALL be "Not on track" when its Monthly payment is at or below today's balance × APR/12, or when it would not pay off within 720 months (60 years) of today. It then has no payoff month and no interest remaining, and its projected balance follows the same formula.

#### Scenario: PR-13 Not on track depends on the payment versus the interest
- **GIVEN** a Liability with balance 120,000, APR 10% (interest 1,000 a month) and Monthly payment `<payment>`
- **WHEN** the Projection is computed
- **THEN** its Not on track flag is `<flag>`

Examples:

| payment | flag |
|---|---|
| 900 | true |
| 1000 | true |
| 1001 | true |
| 1100 | false |

A payment of 1,001 covers the interest but would take 833 months to pay off, beyond the 720-month limit. A payment of 1,100 pays off in month 289.

#### Scenario: PR-14 A Not on track Liability grows and has no payoff
- **GIVEN** a Liability with balance 120,000, APR 10% and Monthly payment 900
- **WHEN** the Projection is computed
- **THEN** its balance at month 1 is 120,100 and keeps rising
- **AND** its payoff month and interest remaining are both absent

### Requirement: Monthly savings are invested at the Country's Stocks rate
Each Country's Monthly savings SHALL be added at the end of every month from month 1. The savings pool SHALL compound at that Country's Stocks rate with the same monthly compounding as a Holding. The amount steps up once a year by the savings growth rate (months 1–12 at the base amount, months 13–24 at base × (1 + g), and so on).

#### Scenario: PR-15 Level savings match the annuity formula
- **GIVEN** US Monthly savings of $1,000, US Stocks at 7%, savings growth 0% and no Liabilities
- **WHEN** the Projection is computed
- **THEN** the US savings pool at month 120 is 1,000 × ((1 + m)^120 − 1) ÷ m, where m = 1.07^(1/12) − 1, within $0.01

#### Scenario: PR-16 Savings step up once a year
- **GIVEN** US Monthly savings of $1,000, US Stocks at 0% and savings growth 10%
- **WHEN** the Projection is computed
- **THEN** the US savings pool is 12,000 at month 12, 13,100 at month 13 and 25,200 at month 24

#### Scenario: PR-17 Blank savings reproduce the no-savings Projection
- **GIVEN** a Portfolio whose Monthly savings and savings growth are blank
- **WHEN** the Projection is computed
- **THEN** every savings series is 0
- **AND** Net Worth at every month equals projected Holdings minus projected Liabilities

### Requirement: A paid-off Liability's Monthly payment joins its Country's savings
From the month after a Liability's payoff month, its Monthly payment SHALL be added to the same Country's Monthly savings at its own amount. The savings growth rate SHALL NOT raise it.

#### Scenario: PR-18 A freed payment starts the month after payoff
- **GIVEN** an India Liability that pays off in month 30 with a Monthly payment of ₹20,000, and blank India Monthly savings
- **WHEN** the Projection is computed
- **THEN** India's monthly savings amount is 0 up to month 30 and ₹20,000 from month 31

#### Scenario: PR-19 A freed payment does not rise with savings growth
- **GIVEN** India Monthly savings of ₹50,000, savings growth 5%, and a Liability with Monthly payment ₹20,000 that pays off in month 29
- **WHEN** the Projection is computed
- **THEN** India's monthly savings amount is 50,000 × 1.05² + 20,000 in month 30 and 50,000 × 1.05³ + 20,000 in month 37

### Requirement: The Projection rolls up by Holding, Liability, Asset Class, Country and total
The Projection SHALL return each Holding's and Liability's series in native currency and USD. It SHALL also return USD series for each Asset Class, each Asset Class within each Country, each Country (assets, liabilities, savings and net), and the totals: assets, liabilities, savings and Net Worth. Savings SHALL count in their Country's assets, in the Stocks class, in total assets and in Net Worth, never in a single Holding.

#### Scenario: PR-20 Totals reconcile at every month
- **GIVEN** a Portfolio with Holdings in several Asset Classes in both Countries, Liabilities in both Countries and Monthly savings in both Countries
- **WHEN** the Projection is computed
- **THEN** at every month, the Asset Class series sum to total assets (savings included, within Stocks)
- **AND** the Countries' net series sum to Net Worth
- **AND** Net Worth equals total assets minus total liabilities

#### Scenario: PR-21 Savings count in the Stocks class but in no Holding
- **GIVEN** a Portfolio with one US Cash Holding and US Monthly savings of $1,000
- **WHEN** the Projection is computed
- **THEN** the Stocks class series equals the US savings pool at every month
- **AND** the Cash Holding's own series is unchanged by the savings
