# loan-detail

## Purpose

The `/liabilities/[id]` screen for one loan: its balance, how much of the principal is paid off, its rate, payment, projected payoff and interest remaining, its balance over time, the Holding it secures with the Equity in it, and archiving. Also the Equity surfaces a linked loan adds to Holding detail.

## ADDED Requirements

### Requirement: The header shows the balance in USD and native currency
Loan detail SHALL show a "Liabilities" breadcrumb link, the loan's name, Country and currency badges, its current balance in USD at today's FX Rate, and a native line: "⟨₹ balance⟩ at ₹⟨FX Rate⟩/$" for an India loan, "Current balance" for a US loan.

#### Scenario: LD-01 An India loan's header
- **GIVEN** an India loan "Apartment loan · HDFC" with balance ₹34,30,000 and an FX Rate of 83.40
- **WHEN** its Loan detail is shown
- **THEN** it shows "India", "INR", "$41,127" and "₹34,30,000 at ₹83.40/$"
- **AND** the breadcrumb's "Liabilities" links to `/liabilities`

### Requirement: The paid-off bar compares the balance with the principal
Loan detail SHALL show "⟨N%⟩ of principal paid off", where N is 1 − balance ÷ principal (0 when the principal is 0), and "⟨principal⟩ borrowed in ⟨Mon YYYY⟩" from the loan's start month, with a bar filled to N.

#### Scenario: LD-02 Paid-off share
- **GIVEN** a loan with principal `<principal>`, balance `<balance>` and start month April 2022
- **WHEN** its paid-off bar is shown
- **THEN** it reads "`<paid>` of principal paid off" and "`<principal text>` borrowed in Apr 2022"

Examples:

| principal | balance | paid | principal text |
|---|---|---|---|
| ₹38,00,000 | ₹34,30,000 | 10% | ₹38,00,000 |
| $13,900 | $13,900 | 0% | $13,900 |
| $26,000 | $0 | 100% | $26,000 |

### Requirement: The rate and payment stats follow the loan's kind and Country
The Interest rate stat SHALL show the APR with sub "Fixed APR", or "Revolving credit" for a revolving loan. The Monthly payment stat SHALL show the payment in native currency with sub "≈ ⟨USD⟩" for an India loan, otherwise "EMI", or "Your planned payment" for a revolving loan.

#### Scenario: LD-03 Rate and payment subs
- **GIVEN** a `<country>` loan, revolving `<revolving>`, APR `<apr>` and Monthly payment `<payment>`, with an FX Rate of 83.40
- **WHEN** its stats are shown
- **THEN** Interest rate reads `<rate>` with sub `<rate sub>`, and Monthly payment reads `<payment>` with sub `<payment sub>`

Examples:

| country | revolving | apr | payment | rate | rate sub | payment sub |
|---|---|---|---|---|---|---|
| US | no | 4.5 | $330 | 4.5% | Fixed APR | EMI |
| US | yes | 24.9 | $150 | 24.9% | Revolving credit | Your planned payment |
| India | no | 8.5 | ₹33,000 | 8.5% | Fixed APR | ≈ $396 |

### Requirement: Payoff and interest come from the Projection
Projected payoff SHALL show the payoff month with sub "In ⟨duration⟩", plus " · ⟨term⟩-yr term" when a term is set. Interest remaining SHALL show the native total with sub "If paid on schedule". A Not on track loan SHALL read "Never" and "—", with sub "Payment doesn’t cover interest". A loan with balance 0 SHALL read "Paid off" and 0.

#### Scenario: LD-04 An on-track loan with a term
- **GIVEN** today is 2026-10-14 and a US loan with balance $10,215, APR 6%, Monthly payment $250 and a 10-year term, which the Projection pays off 46 months from now with $1,240 interest remaining
- **WHEN** its stats are shown
- **THEN** Projected payoff reads "Aug 2030" with sub "In 3.8 yrs · 10-yr term"
- **AND** Interest remaining reads "$1,240" with sub "If paid on schedule"

#### Scenario: LD-05 Not on track and paid-off loans
- **GIVEN** a loan that is `<state>`
- **WHEN** its stats are shown
- **THEN** Projected payoff reads `<payoff>` with sub `<sub>`, and Interest remaining reads `<interest>`

Examples:

| state | payoff | sub | interest |
|---|---|---|---|
| Not on track | Never | Payment doesn’t cover interest | — |
| at balance 0 | Paid off | Balance is 0 | $0 |

### Requirement: The balance chart shows history, payoff and the linked Holding
"Balance over time" SHALL plot the loan's USD balance from its first Valuation to today, then its projected balance, dashed, to six months after payoff or the horizon's end, whichever is first. A Not on track loan runs to the horizon's end. When linked, the Holding's USD value SHALL be a second line and the subtitle "Against the value of ⟨Holding⟩", otherwise "History and payoff projection". The y-axis starts at 0.

#### Scenario: LD-06 A linked loan's chart
- **GIVEN** a loan linked to "Pune apartment", with Valuations since 2025-01-31, paying off 46 months from now, and a 10-year horizon
- **WHEN** its balance chart is built
- **THEN** it has a "Balance" series from 2025-01-31 to 52 months after today, projected after today
- **AND** a "Pune apartment" value series over the same dates, with subtitle "Against the value of Pune apartment"

#### Scenario: LD-07 A brand-new loan's chart
- **GIVEN** a loan whose only Valuation is today's, with no linked Holding
- **WHEN** its balance chart is built
- **THEN** it has one recorded point at today followed by the projection
- **AND** the subtitle reads "History and payoff projection"

### Requirement: The Secured against card shows the Equity in the linked Holding
A linked loan's Loan detail SHALL show a "Secured against" card with the Holding's name, "Worth ⟨USD value⟩ · ⟨% owned⟩ owned" and "⟨Equity⟩ equity →", linking to the Holding's detail. An unlinked loan SHALL show no card.

#### Scenario: LD-08 Secured against card
- **GIVEN** a loan with balance ₹34,30,000 linked to "Pune apartment" worth ₹1,20,00,000, and an FX Rate of 83.40
- **WHEN** its Loan detail is shown
- **THEN** the card reads "Pune apartment", "Worth $143,885 · 71% owned" and "$102,758 equity →"
- **AND** it links to `/holdings/<Pune apartment's id>`

### Requirement: A Stale loan says how old its balance is
When the loan is Stale, its native line SHALL end with " · updated ⟨N⟩ days ago". Otherwise nothing is added.

#### Scenario: LD-09 Stale cue on Loan detail
- **GIVEN** a US loan whose latest Valuation is `<days>` days old
- **WHEN** its Loan detail is shown
- **THEN** the native line reads `<line>`

Examples:

| days | line |
|---|---|
| 12 | Current balance |
| 47 | Current balance · updated 47 days ago |

### Requirement: Delete takes two clicks and archives the loan
The Delete action SHALL ask for a second click by reading "Confirm delete". The second click SHALL archive the loan and return to `/liabilities`, where it no longer has a row while its past balances still count in history. Leaving the page resets the button.

#### Scenario: LD-10 Deleting a loan archives it
- **GIVEN** a loan with Valuations a year ago and today
- **WHEN** the User clicks Delete, then "Confirm delete"
- **THEN** the loan is archived and the Liabilities page shows no row for it
- **AND** the payoff timeline and Net Worth history still include its balance before the archive date

### Requirement: Only the User's active loans have a Loan detail
A Loan detail SHALL render only for an active Liability of the signed-in User. An unknown, archived or other User's id SHALL show the not-found page.

#### Scenario: LD-11 Not found
- **GIVEN** an id that is `<case>`
- **WHEN** its Loan detail is requested
- **THEN** the not-found page is shown

Examples:

| case |
|---|
| not a Liability |
| an archived Liability of this User |
| another User's Liability |

### Requirement: Holding detail shows the loan that secures it
A Holding linked from an active loan SHALL show a "Linked loan" card on its detail page: the loan's name, "⟨APR⟩% · ⟨Monthly payment⟩/mo" and its USD balance with "→", linking to the Loan detail. A Holding with no linked loan SHALL show no card.

#### Scenario: LD-12 Linked loan card
- **GIVEN** "Pune apartment" linked from "Apartment loan · HDFC" with balance ₹34,30,000, APR 8.5% and Monthly payment ₹33,000, and an FX Rate of 83.40
- **WHEN** the Holding detail is shown
- **THEN** a "Linked loan" card reads "Apartment loan · HDFC", "8.5% · ₹33,000/mo" and "$41,127 →"
- **AND** it links to `/liabilities/<that loan's id>`

### Requirement: Holding detail shows Your equity
A Holding linked from an active loan SHALL have a "Your equity" stat, after its other stats: Equity in USD with sub "⟨% owned⟩ owned outright", with % owned clamped to 0–100%.

#### Scenario: LD-13 Your equity stat
- **GIVEN** a linked Holding worth `<value>` and its loan's balance `<balance>`, both USD
- **WHEN** the Holding detail is shown
- **THEN** "Your equity" reads `<equity>` with sub `<sub>`

Examples:

| value | balance | equity | sub |
|---|---|---|---|
| $500,000 | $320,000 | $180,000 | 36% owned outright |
| $300,000 | $350,000 | −$50,000 | 0% owned outright |

### Requirement: Holding detail charts value against the loan
A Holding linked from an active loan SHALL title its chart "Value vs. loan" with subtitle "The shaded gap between the two lines is your equity". The value is shaded down to the loan balance line, the y-axis starts at 0, and the tooltip adds Equity at each point, recorded or projected.

#### Scenario: LD-14 Value vs. loan chart
- **GIVEN** a linked Holding and loan, each with history and a Projection
- **WHEN** the Holding detail chart is built
- **THEN** it has a "Value" series shaded down to a "Loan balance" series
- **AND** at every point its tooltip Equity equals value minus loan balance, in USD
- **AND** after the loan's payoff month the Equity equals the value
