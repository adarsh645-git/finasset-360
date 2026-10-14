# asset-class-page

## Purpose

The `/assets/[class]` pages, one per fixed Asset Class: the class's total, change, share and projected rates, its chart, its Holdings, and for Stocks and Real estate the breakdowns by sector, property type and location. It also turns on the links that lead to each class page.

## ADDED Requirements

### Requirement: Each of the six Asset Classes has a page
A class page SHALL exist at `/assets/⟨id⟩` for each fixed Asset Class id, whether or not the User has Holdings in it. Any other slug SHALL be not found.

#### Scenario: AC-01 Class slugs
- **GIVEN** a signed-in User
- **WHEN** the User opens `/assets/<slug>`
- **THEN** the result is `<result>`

Examples:

| slug | result |
|---|---|
| realestate | the Real estate page |
| stocks | the Stocks page |
| cash | the Cash page |
| crypto | the Crypto page |
| metals | the Metals page |
| other | the Vehicles & other page |
| bonds | not found |

### Requirement: The header shows the class's total, change, share and projected rate
The page SHALL show a breadcrumb "Assets / ⟨class⟩" whose "Assets" links to `/assets`, the class colour and name, its total in USD, and "⟨change⟩ in 12 mo · ⟨share⟩ of assets · ⟨rate⟩". The change uses the class set's 12-month change, or "—" when absent. The share is of total assets, and 0% when that total is 0.

#### Scenario: AC-02 Header of a class with history
- **GIVEN** Real estate Holdings worth $100,000 out of total assets of $400,000, with a Real estate 12-month change of +$12,000
- **WHEN** the Real estate page is built
- **THEN** the breadcrumb is "Assets / Real estate" with "Assets" linking to `/assets`
- **AND** the total is "$100,000" and the line starts "+$12K in 12 mo · 25% of assets"

#### Scenario: AC-03 A class of new Holdings has no change
- **GIVEN** a Crypto Holding whose first Valuation is 3 months old
- **WHEN** the Crypto page is built
- **THEN** the line starts "— in 12 mo"

### Requirement: The header states the projected rate
For Real estate, Stocks and Cash the rate SHALL read "projected at ⟨US rate⟩%/yr US · ⟨India rate⟩%/yr India". For Crypto, Metals and Vehicles & other it SHALL read "projected at ⟨rate⟩%/yr". Each rate is the User's Projection Assumption, or its default when blank.

#### Scenario: AC-04 Rates per Country or shared
- **GIVEN** Projection Assumptions with US Stocks set to 8% and every other rate blank
- **WHEN** the `<class>` page is built
- **THEN** its rate reads `<rate>`

Examples:

| class | rate |
|---|---|
| Stocks | projected at 8%/yr US · 11%/yr India |
| Real estate | projected at 4%/yr US · 6%/yr India |
| Cash | projected at 3.5%/yr US · 6.5%/yr India |
| Crypto | projected at 5%/yr |
| Metals | projected at 4%/yr |
| Vehicles & other | projected at −9%/yr |

### Requirement: "+ Add to ⟨class⟩" opens the add-asset modal for that class
The page SHALL offer "+ Add to ⟨class⟩", which opens the add-asset modal with that Asset Class preselected. The empty state's Add SHALL do the same.

#### Scenario: AC-05 Adding from a class page
- **GIVEN** the Metals page
- **WHEN** the User selects "+ Add to Metals"
- **THEN** the add-asset modal opens with Metals preselected

### Requirement: The class chart shows its history and Projection
The page SHALL show one full-size chart of the class's USD value in its class colour: recorded history from the class's earliest Valuation to today, sampled at month-ends plus today, followed by the class's Projection over the User's horizon. The shared projection toggle SHALL show or hide the projected part.

#### Scenario: AC-06 Chart span
- **GIVEN** a Stocks class whose earliest Valuation is 14 months ago, and a horizon of 10 years
- **WHEN** the Stocks page is built
- **THEN** the chart's recorded points run from that first Valuation to today
- **AND** its projected points continue monthly for 120 months, starting from today's class total

### Requirement: The class's Holdings table
After any class-specific cards, the page SHALL list the class's current Holdings by USD value, largest first, under the columns Holding, Where, Native, USD and Gain, with the same row content as the Assets page. A row SHALL open its Holding detail.

#### Scenario: AC-07 Only this class's Holdings, largest first
- **GIVEN** Cash Holdings worth $6,200 and $11,800 and a Stocks Holding
- **WHEN** the Cash page is built
- **THEN** the table lists the $11,800 Holding, then the $6,200 one, and not the Stocks Holding
- **AND** each row links to its Holding detail page

### Requirement: An empty class shows a first-step state
With no current Holdings in the class, the page SHALL show the header with "$0", "—" and "0% of assets", and in place of the chart, cards and table, "No ⟨plural noun⟩ in ⟨class⟩ yet" with an Add button.

#### Scenario: AC-08 Empty class wording
- **GIVEN** a User with no current Holdings in `<class>`
- **WHEN** the `<class>` page is built
- **THEN** it shows `<message>` with Add, and no chart, card or table

Examples:

| class | message |
|---|---|
| Real estate | No properties in Real estate yet |
| Stocks | No accounts in Stocks yet |
| Cash | No accounts in Cash yet |
| Crypto | No accounts in Crypto yet |
| Metals | No assets in Metals yet |
| Vehicles & other | No assets in Vehicles & other yet |

### Requirement: Only Stocks has a Positions card and only Real estate has distribution cards
The Stocks page SHALL show the Positions card and no distribution cards. The Real estate page SHALL show By property type and By location and no Positions card. The other four pages SHALL show neither.

#### Scenario: AC-09 Which cards render
- **GIVEN** a User with Holdings in every Asset Class
- **WHEN** the `<class>` page is rendered
- **THEN** it shows `<cards>`

Examples:

| class | cards |
|---|---|
| Stocks | Positions |
| Real estate | By property type, By location |
| Cash | none |
| Vehicles & other | none |

### Requirement: The Positions card groups Positions by sector
The card's subtitle SHALL read "⟨N⟩ positions across ⟨M⟩ accounts · select a stock for details". In By sector view (the default) it SHALL show a distribution bar and one row per Sector, largest first: colour, name, "⟨n⟩ stock(s) · ⟨tickers⟩", USD value, gain %, and share of all Positions' USD value to one decimal. Each sector's Positions SHALL follow it, largest first.

#### Scenario: AC-10 Sector rows
- **GIVEN** Stocks Positions worth, in USD at today's FX Rate: AAPL $6,963 and MSFT $5,141 (Technology, cost $8,670 in total), JPM $3,690 (Financials, cost $2,550), and INFY.NS $2,029 (Technology, cost $1,565), across 2 accounts
- **WHEN** the Stocks page is built
- **THEN** the subtitle reads "4 positions across 2 accounts · select a stock for details"
- **AND** the first sector row is Technology with "3 stocks · AAPL, MSFT, INFY", "$14,133", "+38%" and "79.3%"
- **AND** the second is Financials with "1 stock · JPM", "$3,690", "+45%" and "20.7%"
- **AND** the distribution bar has a Technology segment of 79.3% then a Financials segment of 20.7%

#### Scenario: AC-11 Sector rows collapse and expand
- **GIVEN** the Stocks page in By sector view, where every sector starts collapsed and the control reads "Expand all"
- **WHEN** the User opens the Technology row
- **THEN** Technology's Positions show beneath it and the control reads "Collapse all"
- **AND WHEN** the User selects "Collapse all"
- **THEN** no sector is open and the control reads "Expand all"
- **AND WHEN** the User selects "Expand all"
- **THEN** every sector is open

#### Scenario: AC-12 A Position row inside a sector
- **GIVEN** the open Technology row with AAPL, 30 shares at $232.10, average cost $165, in a class with two accounts
- **WHEN** the Stocks page is built
- **THEN** the AAPL row shows "AAPL", "Apple Inc. · Fidelity Brokerage", "30 sh", "$232.10", "$6,963", "+41%" and its weight in all Positions

#### Scenario: AC-13 On a phone the share moves into the subtitle
- **GIVEN** the Technology row of AC-10
- **WHEN** the Stocks page is built
- **THEN** its phone subtitle reads "79.3% · 3 stocks · AAPL, MSFT, INFY"

### Requirement: All positions shows one flat table
In All positions view the card SHALL list every Position of every current Stocks Holding, largest USD value first: the ticker without its `.NS` or `.BO` suffix, the exchange, the company name (followed by " · ⟨Holding name⟩" when the class has more than one Holding), Sector, shares, price in native currency, USD value, gain % and weight. The same ticker in two Holdings is two rows.

#### Scenario: AC-14 Flat positions table
- **GIVEN** Fidelity Brokerage with AAPL and Roth IRA with AAPL and NVDA
- **WHEN** the User switches to All positions
- **THEN** there are three rows, two of them AAPL, one ending "· Fidelity Brokerage" and one "· Roth IRA"
- **AND** the rows are sorted by USD value, largest first

#### Scenario: AC-15 Exchange, name, Sector and price of a ticker
- **GIVEN** a Position on `<ticker>` where market data `<data>`
- **WHEN** it is listed in All positions
- **THEN** it shows exchange `<exchange>`, name `<name>`, Sector `<sector>` and the `<price>`

Examples:

| ticker | data | exchange | name | sector | price |
|---|---|---|---|---|---|
| AAPL | lists NASDAQ, "Apple Inc.", Technology | NASDAQ | Apple Inc. | Technology | market price |
| ZOMATO.NS | has nothing; the Position's own name "Zomato", Sector Consumer Discretionary, Hand Price ₹245 | NSE | Zomato | Consumer Discretionary | ₹245 |
| TDF2055 | has nothing; the Position has no name or Sector and a Hand Price of $31.20 | — | TDF2055 | Other | $31.20 |

#### Scenario: AC-16 A hand-priced Position carries its age cue
- **GIVEN** a Position whose Hand Price was entered 47 days ago
- **WHEN** it is listed on the Stocks page
- **THEN** its row shows "· price 47 days old"

### Requirement: A Position row opens the position drawer
Selecting a Position row in either view SHALL open the position drawer for that Holding and ticker, over the Stocks page.

#### Scenario: AC-17 Opening the drawer
- **GIVEN** the Stocks page with Zerodha holding INFY.NS
- **WHEN** the User selects the INFY row in By sector or All positions
- **THEN** the position drawer opens for Zerodha's INFY.NS, and closing it returns to the Stocks page

### Requirement: Real estate is broken down by property type and location
The Real estate page SHALL show "By property type" (subtitle "⟨N⟩ properties") and "By location" (subtitle "City or market"). Each SHALL have a stacked bar and one row per group, largest first: colour, label, the Holding names in it, USD value, and share to one decimal. Location groups by city, and Holdings with no city group as "Not set".

#### Scenario: AC-18 Property type and location rows
- **GIVEN** Real estate Holdings "Pune apartment" (Residential, Pune, $74,341), "Plot · Mysuru" (Land, no city, $14,388) and "Fundrise eREIT" (REIT / fund, "US (diversified)", $4,200)
- **WHEN** the Real estate page is built
- **THEN** By property type reads "3 properties" with rows Residential "Pune apartment" "$74,341" "80.0%", Land "Plot · Mysuru" "$14,388" "15.5%", and REIT / fund "Fundrise eREIT" "$4,200" "4.5%"
- **AND** By location has rows Pune, Not set and US (diversified), in that order

### Requirement: Class rows, Allocation rows and the Holding detail breadcrumb link to class pages
The sidebar's class rows SHALL link to their class page and show as selected on it. Overview's Allocation rows SHALL link to their class page. On Holding detail, the breadcrumb's "Assets" SHALL link to `/assets` and its class crumb to that class's page.

#### Scenario: AC-19 Sidebar class rows are links
- **GIVEN** current Holdings in Stocks and Cash
- **WHEN** the shell is rendered on the Stocks page
- **THEN** the Stocks row links to `/assets/stocks` and is selected, and the Cash row links to `/assets/cash`

#### Scenario: AC-20 Allocation rows are links
- **GIVEN** current Holdings in Stocks and Real estate
- **WHEN** Overview is rendered
- **THEN** the Stocks Allocation row links to `/assets/stocks` and the Real estate row to `/assets/realestate`

#### Scenario: AC-21 Holding detail breadcrumb
- **GIVEN** the Holding detail page of "Pune apartment"
- **WHEN** it is rendered
- **THEN** the breadcrumb's "Assets" links to `/assets` and "Real estate" links to `/assets/realestate`

### Requirement: Archiving a Holding returns to its class page
Once class pages exist, archiving a Holding from its detail page (the second click of Delete) SHALL take the User to the class page of that Holding's Asset Class instead of the Overview.

#### Scenario: AC-22 Delete lands on the class page
- **GIVEN** the Holding detail page of the Cash Holding "Chase Checking"
- **WHEN** the User clicks Delete, then "Confirm delete"
- **THEN** the Holding is archived and the User is on `/assets/cash`, where it is no longer listed
