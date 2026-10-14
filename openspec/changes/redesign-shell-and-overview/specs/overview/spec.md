# overview

## Purpose

The home page at `/`: Net Worth rolled up to USD, how it has moved and where it is projected to go, and the cards that break it down (allocation, equity, Countries, currency, and what needs updating), plus the first-run state for an empty Portfolio.

## ADDED Requirements

### Requirement: The header shows Net Worth and its change over the chosen range
The header SHALL show "Net worth · rolled up to USD", Net Worth in full USD, and its change since the range start as a signed amount. The percent is added only when Net Worth at the start was above 0, followed by "since ⟨Mon YYYY⟩". The range start is today minus the range, clamped to the Portfolio's earliest Valuation.

#### Scenario: OV-01 Header change for a range
- **GIVEN** Net Worth of $1,180,000 today and $1,000,000 on 2025-10-13, with today 2026-10-13 and history back to 2020
- **WHEN** the Overview is built for range 1Y
- **THEN** the header shows $1,180,000, "+$180,000 (+18.0%)" and "since Oct 2025"

#### Scenario: OV-02 A range longer than the history starts at the first Valuation
- **GIVEN** a Portfolio whose earliest Valuation is 2026-08-20, with Net Worth of $40,000 then and $42,000 today
- **WHEN** the Overview is built for range All
- **THEN** the change reads "+$2,000 (+5.0%)" and "since Aug 2026"

#### Scenario: OV-03 No percent from a start at or below zero
- **GIVEN** Net Worth of −$5,000 at the range start and $15,000 today
- **WHEN** the Overview is built
- **THEN** the change reads "+$20,000" with no percent

### Requirement: The range is 1Y, 3Y, 5Y or All and lives in the address
The range SHALL be one of 1Y, 3Y, 5Y and All, read from the page address, so it survives reload and Back. A missing or unknown value SHALL mean All.

#### Scenario: OV-04 Reading the range
- **GIVEN** the address carries a range of `<param>`
- **WHEN** the Overview is built
- **THEN** the selected range is `<range>`

Examples:

| param | range |
|---|---|
| none | All |
| 1Y | 1Y |
| 5Y | 5Y |
| 2W | All |

### Requirement: The Net Worth chart shows history, the projection, and assets and liabilities on hover
The chart SHALL draw Net Worth (line and light area) from the range start to today, then the Projection over the User's horizon when the projection is on. Its tooltip SHALL also list Assets and Liabilities, which are not drawn. The chart has a slot for goal lines and receives none in this change.

#### Scenario: OV-05 Chart series and extent
- **GIVEN** a Portfolio with history since 2024 and a horizon of 10 years, with today 2026-10-13
- **WHEN** the Overview is built for range All with the projection `<projection>`
- **THEN** the chart runs from the first history point to `<end>`, draws Net worth, and lists Net worth, Assets and Liabilities in its tooltip

Examples:

| projection | end |
|---|---|
| on | Oct 2036 |
| off | 2026-10-13 |

### Requirement: Three stat cards summarise assets, liabilities and equity
The Overview SHALL show three cards:
- **Total assets:** current Holdings in USD, "N accounts & assets · ⟨signed compact 12-month change⟩ in 12 mo".
- **Liabilities:** current balances, "N loans · ⟨compact⟩ paid down in 12 mo".
- **Equity built:** "Across N financed assets · ⟨signed compact⟩ in 12 mo".

An absent 12-month figure reads "—". Each card links to its page once it exists.

#### Scenario: OV-06 Stat card contents
- **GIVEN** 14 current Holdings worth $1,300,000 (up $96,000 like-for-like in 12 months), 4 Liabilities of $120,000 ($20,000 paid down in 12 months), and 2 linked pairs with Equity of $260,000 (up $31,000)
- **WHEN** the Overview is built
- **THEN** the cards read "Total assets $1,300,000 · 14 accounts & assets · +$96K in 12 mo", "Liabilities $120,000 · 4 loans · $20K paid down in 12 mo" and "Equity built $260,000 · Across 2 financed assets · +$31K in 12 mo"

#### Scenario: OV-07 Stat cards with no history, loans or links
- **GIVEN** 1 current Holding added last month worth $5,000, and no Liabilities
- **WHEN** the Overview is built
- **THEN** the cards read "1 account or asset · — in 12 mo", "Liabilities $0 · No loans" and "Equity built $0 · No loans linked to assets"

#### Scenario: OV-08 Stat cards are plain until their pages exist
- **GIVEN** an app where only the Overview page exists
- **WHEN** the Overview is rendered
- **THEN** none of the three stat cards is a link

### Requirement: Allocation shows the split of Holdings across Asset Classes
The Allocation card SHALL show a stacked bar and one row per Asset Class with at least one current Holding, largest first. Each row has the colour dot, name, Holding count, USD value, share of total assets, and the class's 12-month change ("—" when absent; dropped on phones). Rows link to the class page once it exists. With no current Holdings the card SHALL be absent.

#### Scenario: OV-09 Allocation rows
- **GIVEN** current Holdings: Stocks 4 worth $412,000 (12-month change +$31,000), Real estate 3 worth $300,000 (+$12,000), and Cash 1 worth $0 added this month
- **WHEN** the Overview is built
- **THEN** the rows are Stocks "4 · $412,000 · 58% · +$31K", Real estate "3 · $300,000 · 42% · +$12K", then Cash "1 · $0 · 0% · —"

#### Scenario: OV-10 Allocation rows are plain until class pages exist
- **GIVEN** an app where only the Overview page exists
- **WHEN** the Overview is rendered
- **THEN** the Allocation rows are plain text

### Requirement: Equity in financed assets shows each linked pair
The card SHALL list each current Liability linked to a current Holding: the Holding's name, its Equity, a bar of % owned, "⟨% owned⟩ owned · ⟨signed compact⟩ in 12 mo", and "⟨compact value⟩ value − ⟨compact balance⟩ loan". A pair with no year of history reads "—" for the 12-month part. With no linked pairs the card SHALL be absent.

#### Scenario: OV-11 One linked pair
- **GIVEN** the Pune apartment worth $74,340 linked to a loan of $41,127, with Equity $8,000 higher than 12 months ago
- **WHEN** the Overview is built
- **THEN** the card shows "Pune apartment", $33,213, "45% owned · +$8K in 12 mo" and "$74.3K value − $41.1K loan"

#### Scenario: OV-12 No linked pairs hides the card
- **GIVEN** Holdings and Liabilities with no links between them
- **WHEN** the Overview is rendered
- **THEN** there is no Equity in financed assets card

### Requirement: Where it's held lists only the Countries in use
The card SHALL show a block per Country with at least one current Holding or Liability: the Country, its net in USD, a bar and "⟨compact assets⟩ assets · ⟨compact debt⟩ debt" with "⟨share⟩ of assets". A Country's share of a $0 total is 0%.

#### Scenario: OV-13 Only Countries in use appear
- **GIVEN** current Holdings only in the US, worth $200,000, and no Liabilities
- **WHEN** the Overview is built
- **THEN** the card shows United States "$200,000 net", "$200K assets · $0 debt", "100% of assets", and no India block

### Requirement: The Currency effect line shows what the rupee did over 12 months
When the Portfolio has any current India Holding or Liability, the card SHALL end with "Currency effect, 12 mo" and its signed USD amount, coloured by sign. It comes from change attribution with a start 12 months ago, all Countries. A note gives the rates then and now ("Rupee moved ₹82.10 → ₹83.40 per $."), with "as of ⟨D Mon⟩" when today's FX Rate is older than today. Without India items the line SHALL be absent.

#### Scenario: OV-14 Currency effect with India items
- **GIVEN** an India Holding worth ₹8,340,000 both 12 months ago and today, FX Rates of 80.00 then and 83.40 today
- **WHEN** the Overview is built
- **THEN** the line reads "Currency effect, 12 mo −$4,250" in the negative colour, with the note "Rupee moved ₹80.00 → ₹83.40 per $."

#### Scenario: OV-15 A stale FX Rate shows its date
- **GIVEN** an India Holding and today's FX Rate stored on 2026-10-10, with today 2026-10-13
- **WHEN** the Overview is built
- **THEN** the note ends "as of 10 Oct"

#### Scenario: OV-16 No India items hides the line
- **GIVEN** only US Holdings and Liabilities
- **WHEN** the Overview is rendered
- **THEN** there is no Currency effect line

### Requirement: Needs updating lists Stale items, oldest first
When any current Holding or Liability is Stale, the right column SHALL show a "Needs updating" card with the count, and one row per Stale item: its name and "⟨N⟩ days old" ("prices ⟨N⟩ days old" for a Stocks Holding), oldest first, ties by name. Rows link to the item's detail page once that page exists. With nothing Stale the card SHALL be absent.

#### Scenario: OV-17 Stale items, oldest first
- **GIVEN** a Cash Holding "Chase Checking" last valued 35 days ago, a Liability "Student loan" last valued 47 days ago, a Stocks Holding "Zerodha" with a Hand Price 40 days old, and a Holding valued today
- **WHEN** the Overview is built
- **THEN** the card is titled "Needs updating (3)" with rows "Student loan · 47 days old", "Zerodha · prices 40 days old" and "Chase Checking · 35 days old"

#### Scenario: OV-18 Nothing Stale hides the card
- **GIVEN** every current item updated within 30 days
- **WHEN** the Overview is rendered
- **THEN** there is no Needs updating card

#### Scenario: OV-19 Rows link only to detail pages that exist
- **GIVEN** a Stale Holding and a Stale Liability, in an app where `<existing>` exist
- **WHEN** the Overview is built
- **THEN** the Holding row is `<holding row>` and the Liability row is `<liability row>`

Examples:

| existing | holding row | liability row |
|---|---|---|
| only the Overview | plain text | plain text |
| Holding detail pages | a link to its Holding detail | plain text |
| Holding and Liability detail pages | a link to its Holding detail | a link to its Liability detail |

### Requirement: The right column keeps a place for Goals
The right column SHALL end with a slot below Needs updating that the Goals card fills. In this change the slot SHALL render nothing.

#### Scenario: OV-20 The Goals slot is empty
- **GIVEN** a Portfolio with Holdings
- **WHEN** the Overview is rendered
- **THEN** there is no Goals card and no "All goals →" link

### Requirement: An empty Portfolio shows the first-run card
With no current Holdings and no current Liabilities, the Overview SHALL show only the header with $0 (no change, range control or projection toggle) and one card, "Add your first account or asset", with a short explainer. There SHALL be no chart, stat cards or other cards. The card's Add button and "or a loan" link SHALL be absent until adding exists.

#### Scenario: OV-21 First-run Overview
- **GIVEN** a User with no Holdings or Liabilities
- **WHEN** the Overview is rendered
- **THEN** it shows "Net worth · rolled up to USD", $0 and the "Add your first account or asset" card, and no chart, range control, projection toggle, stat card, Allocation, Where it's held or Needs updating

#### Scenario: OV-22 Only archived items still counts as first run
- **GIVEN** a User whose only Holding is archived
- **WHEN** the Overview is rendered
- **THEN** it shows the first-run card and $0

### Requirement: Two columns stack on narrow content
The cards below the stat row SHALL sit in two columns (left wider, about 1.45 : 1) when the content area beside any sidebar is at least 820px wide, and in one column otherwise, left column first.

#### Scenario: OV-23 Column order when stacked
- **GIVEN** a Portfolio with linked pairs, India items and a Stale item
- **WHEN** the Overview is rendered
- **THEN** the cards appear in the order Allocation, Equity in financed assets, Where it's held, Needs updating
