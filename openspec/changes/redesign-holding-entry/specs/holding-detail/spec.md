# holding-detail

## Purpose

The Holding detail page at `/holdings/[id]`: one account, property or asset with its value in USD and native currency, its actions, stat cards, Positions and Sectors for Stocks, its value over time, its Value log and its Stale cue. It is also where Overview rows about a Holding lead.

## ADDED Requirements

### Requirement: Each current Holding has a detail page
`/holdings/[id]` SHALL show one of the signed-in User's current Holdings. An archived Holding, an unknown id or another User's Holding SHALL get the not-found page.

#### Scenario: HD-01 Which ids have a page
- **GIVEN** a User with a current Holding, an archived Holding, and another User's Holding
- **WHEN** the User opens `/holdings/<id>` for `<which>`
- **THEN** `<outcome>`

Examples:

| which | outcome |
|---|---|
| the current Holding | its detail page shows |
| the archived Holding | the not-found page shows |
| another User's Holding | the not-found page shows |
| an id that doesn't exist | the not-found page shows |

### Requirement: The header names the Holding, its kind and its value
The header SHALL show a breadcrumb "Assets / ⟨class⟩ / ⟨name⟩", whose first two crumbs link only once the link registry knows those pages, the name, Country and currency badges, a kind tag, the current value in USD at today's FX Rate, and a native line. The kind tag SHALL be "Brokerage account" for Stocks, "Property" for Real estate, "Account" for Cash and Crypto, and "Asset" for Metals and Vehicles & other.

#### Scenario: HD-02 Kind tag and badges by class
- **GIVEN** a current `<class>` Holding in `<country>`
- **WHEN** its detail page renders
- **THEN** the kind tag reads `<tag>` and the badges read `<badges>`

Examples:

| class | country | tag | badges |
|---|---|---|---|
| Stocks | US | Brokerage account | United States, USD |
| Real estate | India | Property | India, INR |
| Cash | US | Account | United States, USD |
| Crypto | US | Account | United States, USD |
| Metals | India | Asset | India, INR |
| Vehicles & other | US | Asset | United States, USD |

#### Scenario: HD-03 Value and native line
- **GIVEN** today's FX Rate is 83.40 as of `<fx date>` and today is 2026-10-14
- **WHEN** the detail page renders `<holding>`
- **THEN** the value reads `<usd>` and the native line reads `<line>`

Examples:

| holding | fx date | usd | line |
|---|---|---|---|
| India Real estate "Pune apartment", ₹62,00,000, Description "2BHK · rented" | 2026-10-14 | $74,341 | ₹62,00,000 at ₹83.40/$ · 2BHK · rented |
| India Real estate "Pune apartment", ₹62,00,000, no Description | 2026-10-10 | $74,341 | ₹62,00,000 at ₹83.40/$ as of 10 Oct |
| US Cash "Chase Checking", $6,200, Description "Everyday account" | 2026-10-14 | $6,200 | Everyday account |
| US Cash "Chase Checking", $6,200, no Description | 2026-10-14 | $6,200 | (no line) |

#### Scenario: HD-04 Breadcrumb crumbs follow the link registry
- **GIVEN** a link registry where `<known>`
- **WHEN** the detail page of a Cash Holding "Chase Checking" renders
- **THEN** the breadcrumb reads "Assets / Cash / Chase Checking", with "Assets" `<assets>` and "Cash" `<cash>`

Examples:

| known | assets | cash |
|---|---|---|
| neither `/assets` nor the class pages exist | plain text | plain text |
| `/assets` and the class pages exist | a link to `/assets` | a link to `/assets/cash` |

### Requirement: A Stale Holding's page says how old its figure is
When the Holding is Stale, its native line SHALL end with "· updated ⟨N⟩ days ago", or read "Updated ⟨N⟩ days ago" when the line is otherwise empty. A Holding that isn't Stale SHALL show no cue.

#### Scenario: HD-05 The detail Stale cue
- **GIVEN** today is 2026-10-14 and `<holding>`
- **WHEN** its detail page renders
- **THEN** the native line reads `<line>`

Examples:

| holding | line |
|---|---|
| US Cash "Chase Checking", Description "Everyday account", last valued 47 days ago | Everyday account · updated 47 days ago |
| US Cash "Chase Checking", no Description, last valued 47 days ago | Updated 47 days ago |
| US Cash "Chase Checking", no Description, last valued 30 days ago | (no line) |
| India Stocks "Zerodha", Description "NSE equities", oldest Hand Price as of 2026-08-03 | ₹1,69,200 at ₹83.40/$ · NSE equities · updated 72 days ago |

### Requirement: The actions update, edit and archive the Holding
The page SHALL offer "Update value" (or "Edit positions" for Stocks), "Edit" and "Delete", which open the matching modal. Delete SHALL need two clicks: the first SHALL change its label to "Confirm delete", and the second SHALL archive the Holding, which unlinks its loans, then go to the Overview.

#### Scenario: HD-06 Action targets
- **GIVEN** the detail page of `<holding>` with id h1
- **WHEN** it renders
- **THEN** the first action reads `<update>` and opens `/holdings/h1?modal=update&holding=h1`
- **AND** "Edit" opens `/holdings/h1?modal=edit&holding=h1`

Examples:

| holding | update |
|---|---|
| a Cash Holding | Update value |
| a Stocks Holding | Edit positions |

#### Scenario: HD-07 Delete takes two clicks and archives
- **GIVEN** the detail page of a Real estate Holding linked to a Liability
- **WHEN** the User clicks "Delete" once
- **THEN** the button reads "Confirm delete" and nothing is archived
- **AND** a second click archives the Holding, its Liability is no longer linked, and the User is on the Overview, where the Holding no longer counts

### Requirement: Stat cards show what is known about the Holding
Stat cards SHALL appear in this order, each only when it applies: Property (Real estate), Cost basis and Unrealized gain (when there is a Cost Basis), Quantity (Metals with a quantity), 12-month change (always), and Currency effect, 12 mo (India Holdings). This change SHALL leave room after them for "Your equity", which `redesign-liabilities` adds.

#### Scenario: HD-08 An India property's cards
- **GIVEN** an India Real estate Holding, Residential in "Pune", worth ₹62,00,000 with Cost Basis ₹48,00,000, held for over a year, and the FX Rate was 82.10 a year ago and is 83.40 today
- **WHEN** its detail page renders
- **THEN** the cards are Property "Residential" / "Pune", Cost basis "₹48,00,000" / "≈ $57,554 today", Unrealized gain "+₹14,00,000" / "+29.2% · +$16,787", 12-month change, and Currency effect, 12 mo "−$1,177" / "₹82.10 → ₹83.40 per $"

#### Scenario: HD-09 A Metals Holding shows its quantity and price per unit
- **GIVEN** an India Metals Holding worth ₹2,90,000 with a quantity of 40 g and no Cost Basis
- **WHEN** its detail page renders
- **THEN** the cards are Quantity "40 g" / "₹7,250 per g", 12-month change and Currency effect, 12 mo, with no Cost basis or Unrealized gain card

#### Scenario: HD-10 A US Holding without a Cost Basis
- **GIVEN** a US Cash Holding with no Cost Basis, held for over a year
- **WHEN** its detail page renders
- **THEN** the only card is 12-month change, with the sub-label "In USD terms"

#### Scenario: HD-11 A Holding added within the year has no 12-month change
- **GIVEN** today is 2026-10-14 and a Holding whose first Valuation is dated 2026-08-10
- **WHEN** its detail page renders
- **THEN** the 12-month change card reads "—" with the sub-label "Added Aug 2026"

#### Scenario: HD-12 A Stocks Holding's Cost Basis comes from its Positions
- **GIVEN** a US Stocks Holding with AAPL (30 sh, avg 165, price 232.10) and JPM (15 sh, avg 170, price 246)
- **WHEN** its detail page renders
- **THEN** Cost basis reads "$7,500" / "What you paid" and Unrealized gain reads "+$3,153" / "+42.0%"

### Requirement: One age cue phrases a Stale row
One shared cue SHALL phrase how old a row's user-entered figure is, in three variants: "⟨N⟩ days old" for a manually valued Holding or a Liability, "prices ⟨N⟩ days old" for a Stocks Holding, and "price ⟨N⟩ days old" for a hand-priced Position. It SHALL give nothing when the item isn't Stale. Every page that lists rows SHALL use it.

#### Scenario: HD-23 Age cue variants
- **GIVEN** today is 2026-10-14
- **WHEN** the cue is asked for `<row>`
- **THEN** it reads `<cue>`

Examples:

| row | cue |
|---|---|
| a Cash Holding last valued 47 days ago | 47 days old |
| a Liability last valued 31 days ago | 31 days old |
| a Stocks Holding whose oldest Hand Price is 40 days old | prices 40 days old |
| a Position with a Hand Price as of 2026-08-03 | price 72 days old |
| a Cash Holding last valued 30 days ago | (nothing) |
| a Stocks Holding of listed US tickers | (nothing) |

### Requirement: A Stocks Holding lists its Positions and Sectors
A Stocks Holding's page SHALL show "Positions in this account" with "⟨N⟩ positions", one row per Position sorted by USD value, descending: the ticker without exchange suffix, a Sector dot, "⟨shares⟩ sh · ⟨name⟩", the native price, the USD value with gain %, and the weight in the account. Beside it, "By sector" SHALL give each Sector's share and its tickers.

#### Scenario: HD-13 Positions rows
- **GIVEN** a US Stocks Holding with AAPL (30 sh, avg 165, price 232.10, Technology) and JPM (15 sh, avg 170, price 246, Financials)
- **WHEN** its detail page renders
- **THEN** the sub-heading reads "2 positions"
- **AND** the first row is AAPL: "30 sh · Apple Inc.", "$232", "$6,963", "+41%", "65%"
- **AND** the second row is JPM: "15 sh · JPMorgan Chase & Co.", "$246", "$3,690", "+45%", "35%"

#### Scenario: HD-14 By sector
- **GIVEN** the same Stocks Holding
- **WHEN** its detail page renders
- **THEN** By sector lists Technology "AAPL" 65.4%, then Financials "JPM" 34.6%

#### Scenario: HD-15 Each Positions row opens the drawer
- **GIVEN** the detail page `/holdings/h5` of a Stocks Holding holding INFY.NS
- **WHEN** it renders
- **THEN** the INFY row points to `/holdings/h5?position=h5~INFY.NS`

#### Scenario: HD-16 A stale Hand Price is flagged on its row
- **GIVEN** today is 2026-10-14 and an India Stocks Holding with INFY.NS (90 sh, Hand Price as of 2026-08-03) and TCS.NS (Hand Price as of 2026-10-01)
- **WHEN** its detail page renders
- **THEN** the INFY row reads "90 sh · Infosys Limited · price 72 days old"
- **AND** the TCS row has no age cue

#### Scenario: HD-17 Non-Stocks Holdings have no Positions section
- **GIVEN** a Cash Holding
- **WHEN** its detail page renders
- **THEN** there is no "Positions in this account" and no "By sector"

### Requirement: The chart shows the Holding's value over time in USD
The page SHALL chart the Holding's value in USD at each date's FX Rate, interpolated between Valuations and sampled at month-ends plus today, from its first Valuation, followed by its Projection. The sub-title SHALL read "Interpolated between logged values", or "Shown in USD; includes rupee movement" for India Holdings.

#### Scenario: HD-18 Chart series and sub-title
- **GIVEN** today is 2026-10-14 and an India Cash Holding with Valuations ₹3,00,000 on 2026-06-30 and ₹6,40,000 on 2026-09-30
- **WHEN** its detail page renders
- **THEN** the chart is titled "Value over time" with the sub-title "Shown in USD; includes rupee movement"
- **AND** its recorded points run from 2026-06-30 to 2026-10-14 at each date's FX Rate, followed by projected points to the horizon

#### Scenario: HD-19 A brand-new Holding has a one-point history
- **GIVEN** a Holding whose only Valuation is today
- **WHEN** its detail page renders
- **THEN** the chart has one recorded point, today, followed by its Projection, and the Value log has one row

### Requirement: The Value log lists recorded values, newest first
The Value log ("Logged whenever you update") SHALL list the date, native value and change since the previous row ("+⟨amount⟩ · +⟨%⟩", or "—" for the oldest). A manually valued Holding SHALL show every Valuation. A Stocks Holding SHALL show one row per earlier month (its last Valuation) plus today's current value. The oldest row SHALL say "· added".

#### Scenario: HD-20 A manual Holding's log
- **GIVEN** today is 2026-10-14 and a US Cash Holding with Valuations $5,000 on 2026-06-02, $5,600 on 2026-08-10 and $6,200 on 2026-10-14
- **WHEN** its detail page renders
- **THEN** the Value log reads, in order:

| date | value | change |
|---|---|---|
| Oct 14, 2026 | $6,200 | +$600 · +10.7% |
| Aug 10, 2026 | $5,600 | +$600 · +12.0% |
| Jun 2, 2026 · added | $5,000 | — |

#### Scenario: HD-21 A Stocks Holding's log is monthly plus today
- **GIVEN** today is 2026-10-14 and a US Stocks Holding worth $10,653 now, with Valuations $10,000 on 2026-08-30, $10,100 on 2026-08-31, $10,300 on 2026-09-15, $10,400 on 2026-09-30 and $10,600 on 2026-10-13
- **WHEN** its detail page renders
- **THEN** the Value log reads, in order:

| date | value | change |
|---|---|---|
| Oct 14, 2026 | $10,653 | +$253 · +2.4% |
| Sep 2026 | $10,400 | +$300 · +3.0% |
| Aug 2026 · added | $10,100 | — |

### Requirement: Rows elsewhere lead to the Holding's page
Once this page exists, every Holding row the app shows through the link registry SHALL link to `/holdings/[id]`: Overview's "Equity in financed assets" rows and the Holding rows of "Needs updating". Liability rows SHALL stay plain text until their pages exist.

#### Scenario: HD-22 Overview rows link to Holding detail
- **GIVEN** a Portfolio with a Holding h1 linked to a Liability, and a Stale Holding h2 and a Stale Liability l1
- **WHEN** the Overview renders
- **THEN** the Equity row for h1 links to `/holdings/h1`
- **AND** the Needs updating row for h2 links to `/holdings/h2`, and the row for l1 is plain text
