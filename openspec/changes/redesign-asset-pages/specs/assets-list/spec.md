# assets-list

## Purpose

The `/assets` page: every current Holding of the User in one list, with totals, class tiles that filter it, grouping by Asset Class or Country, collapsible groups and search. It also turns on the links that lead to it.

## ADDED Requirements

### Requirement: The header shows total assets, counts and the 12-month change
The header SHALL show the sum of current Holdings' current values in USD at today's FX Rate. Its subtitle SHALL read "⟨N⟩ accounts & assets in ⟨M⟩ classes · ⟨change⟩ in 12 mo", where M counts Asset Classes with at least one Holding and the change is the 12-month change of the set of all Holdings, compact and signed, or "—" when that change is absent.

#### Scenario: AS-01 Header with Holdings in three classes
- **GIVEN** 5 current Holdings in Stocks, Cash and Real estate worth $412,900 in USD at today's FX Rate
- **AND** the 12-month change of all Holdings is +$44,300
- **WHEN** the User opens the Assets page
- **THEN** the header total is "$412,900"
- **AND** the subtitle reads "5 accounts & assets in 3 classes · +$44.3K in 12 mo"

#### Scenario: AS-02 No Holding is a year old
- **GIVEN** every current Holding's first Valuation is less than 12 months old
- **WHEN** the User opens the Assets page
- **THEN** the subtitle ends "· — in 12 mo"

### Requirement: Rows are grouped by Asset Class by default
With Group by Class, the list SHALL show one group per Asset Class that has a visible Holding, in the fixed class order (Real estate, Stocks, Cash, Crypto, Metals, Vehicles & other). Each group header SHALL show the class colour and name, its row count with the class noun, its share of total assets and its USD total. Rows within a group SHALL be sorted by USD value, largest first.

#### Scenario: AS-03 Group headers use the class noun
- **GIVEN** `<count>` current Holdings in `<class>`
- **WHEN** the Assets page is grouped by Class
- **THEN** that group's header count reads `<label>`

Examples:

| class | count | label |
|---|---|---|
| Stocks | 1 | 1 account |
| Cash | 3 | 3 accounts |
| Crypto | 2 | 2 accounts |
| Real estate | 1 | 1 property |
| Real estate | 3 | 3 properties |
| Metals | 2 | 2 assets |
| Vehicles & other | 1 | 1 asset |

#### Scenario: AS-04 Group order, share and row order
- **GIVEN** total assets of $400,000, with Cash Holdings worth $10,000 and $30,000 and a Real estate Holding worth $100,000
- **WHEN** the Assets page is grouped by Class
- **THEN** the Real estate group comes before the Cash group
- **AND** the Cash group shows a share of "10%" and a total of "$40,000"
- **AND** its $30,000 row comes before its $10,000 row
- **AND** no group appears for a class with no Holdings

### Requirement: Each row shows one Holding on one line
A row SHALL show the Holding's name and subtitle, a Country badge (US or IN), the native amount for an India Holding (blank for a US one), the USD value, and the unrealized gain as compact signed USD plus a whole-number percent, or "—" without a Cost Basis. The subtitle SHALL be the Positions summary for Stocks, "⟨Property type⟩ · ⟨city⟩" for Real estate, and the Description otherwise.

#### Scenario: AS-05 Row content by kind of Holding
- **GIVEN** the Holding `<holding>`
- **WHEN** it appears as a row on the Assets page
- **THEN** its subtitle is `<subtitle>`, its native amount is `<native>` and its gain is `<gain>`

Examples:

| holding | subtitle | native | gain |
|---|---|---|---|
| US Stocks "Fidelity Brokerage" with 6 Positions (AAPL, MSFT, JPM, XOM, JNJ, AMZN), value $28,914, Cost Basis $19,535 | 6 positions · AAPL, MSFT, JPM… | (blank) | +$9.4K · +48% |
| India Stocks "Zerodha" with 2 Positions (RELIANCE.NS, INFY.NS) | 2 positions · RELIANCE, INFY | ₹ value | gain in USD at today's FX Rate |
| India Real estate "Pune apartment", Residential, city Pune, value ₹62,00,000, Cost Basis ₹48,00,000, FX Rate ₹83.40 per $ | Residential · Pune | ₹62,00,000 | +$16.8K · +29% |
| India Real estate "Plot", Land, no city | Land | ₹ value | gain in USD |
| US Cash "Chase Checking", Description "Everyday account", no Cost Basis | Everyday account | (blank) | — |
| US Crypto "Coinbase", no Description, value $8,600, Cost Basis $6,100 | (empty) | (blank) | +$2.5K · +41% |

#### Scenario: AS-06 A Stale Holding carries its age cue
- **GIVEN** a manually valued Holding whose latest Valuation is 47 days old, and a Stocks Holding whose oldest Hand Price is 40 days old
- **WHEN** they appear as rows on the Assets page
- **THEN** the first row's subtitle ends "· 47 days old"
- **AND** the second row's subtitle ends "· prices 40 days old"

#### Scenario: AS-07 Archived Holdings are not listed
- **GIVEN** a Holding archived last month
- **WHEN** the User opens the Assets page
- **THEN** no row, group count, tile or total includes it

#### Scenario: AS-08 A row opens its Holding
- **GIVEN** a current Holding
- **WHEN** its row on the Assets page is selected
- **THEN** the Holding detail page for that Holding opens

### Requirement: Class tiles filter the list
Above the list, an "All assets" tile SHALL show total assets and the Holding count, followed by one tile per Asset Class with Holdings, showing its compact total and "⟨share⟩ · ⟨count⟩ ⟨noun⟩". Selecting a class tile SHALL limit the list to that class. Selecting the selected tile again, or "All assets", SHALL clear the filter. Group shares stay relative to total assets.

#### Scenario: AS-09 Tiles summarise each class
- **GIVEN** total assets of $400,000 over 7 Holdings, of which 3 Real estate Holdings are worth $100,000
- **WHEN** the User opens the Assets page
- **THEN** the "All assets" tile shows "$400K" and "7 items"
- **AND** the Real estate tile shows "$100K" and "25% · 3 properties"

#### Scenario: AS-10 Selecting a tile filters, selecting it again clears
- **GIVEN** the Assets page with Holdings in Stocks and Cash
- **WHEN** the User selects the Stocks tile
- **THEN** only Stocks rows are listed, and the Stocks group still shows its share of total assets
- **AND WHEN** the User selects the Stocks tile again
- **THEN** every Holding is listed and "All assets" is selected

### Requirement: Group by Country or None
Group by Country SHALL show a "United States" and an "India" group, each only when it has a visible Holding, with counts in "item"/"items" and each row's badge showing its Asset Class instead of its Country. Group by None SHALL show one "All holdings" group with every visible Holding by USD value.

#### Scenario: AS-11 Grouped by Country
- **GIVEN** 4 US Holdings and 1 India Holding
- **WHEN** the User groups by Country
- **THEN** the groups are "United States" with "4 items" and "India" with "1 item"
- **AND** each row's badge shows its Asset Class name

#### Scenario: AS-12 Grouped by None
- **GIVEN** Holdings in three classes and both Countries
- **WHEN** the User groups by None
- **THEN** one group "All holdings" lists every Holding, largest USD value first

### Requirement: Groups collapse and expand
Selecting a group header SHALL toggle its rows, keeping the header. A Collapse all / Expand all control SHALL read "Expand all" only when every group is collapsed, and SHALL collapse or expand every group of the current grouping.

#### Scenario: AS-13 Collapsing groups
- **GIVEN** the Assets page grouped by Class with three groups, all open
- **WHEN** the User collapses one group
- **THEN** that group shows its header but no rows, and the control still reads "Collapse all"
- **AND WHEN** the User selects "Collapse all"
- **THEN** every group is collapsed and the control reads "Expand all"

### Requirement: Search filters rows
A search SHALL keep only Holdings whose name, Description, city, Position tickers or Position company names contain the query, ignoring case and surrounding spaces. It SHALL combine with the class filter. While the query is not empty, every group SHALL show as open. When no Holding is visible, the card SHALL show "No holdings match.".

#### Scenario: AS-14 What search matches
- **GIVEN** the Holdings "Pune apartment" (Description "2BHK · Baner · rented", city Pune), "Zerodha" (Positions RELIANCE.NS "Reliance Industries" and INFY.NS "Infosys") and "2022 Honda CR-V"
- **WHEN** the User searches for `<query>`
- **THEN** the list shows `<shown>`

Examples:

| query | shown |
|---|---|
| baner | Pune apartment |
| pune | Pune apartment |
| infy | Zerodha |
| reliance industries | Zerodha |
| "  HONDA " | 2022 Honda CR-V |

#### Scenario: AS-15 A search opens collapsed groups
- **GIVEN** every group on the Assets page is collapsed
- **WHEN** the User searches for a name in the Cash group
- **THEN** the Cash group shows open with the matching row

#### Scenario: AS-16 Nothing matches
- **GIVEN** the Assets page with Holdings
- **WHEN** the User searches for a query no Holding matches
- **THEN** no group is shown and the card reads "No holdings match."

### Requirement: An empty Portfolio shows a first-step state
With no current Holdings, the page SHALL show the header with "$0" and, in place of the tiles and the list card, "No accounts or assets yet" with an Add button. Both Add buttons SHALL open the add-asset modal with no class chosen.

#### Scenario: AS-17 No Holdings yet
- **GIVEN** a User with no current Holdings
- **WHEN** the User opens the Assets page
- **THEN** the header total is "$0"
- **AND** the page shows "No accounts or assets yet" with Add, and no tiles or list card

#### Scenario: AS-18 Add opens the add-asset modal
- **GIVEN** the Assets page, with or without Holdings
- **WHEN** the User selects "+ Add asset" or the empty state's Add
- **THEN** the add-asset modal opens with no Asset Class preselected

### Requirement: The Assets nav item and the Total assets stat card link to the Assets page
The Assets nav item SHALL link to `/assets` in the sidebar, the tablet tabs and the phone tab bar, and SHALL show as active on the Assets page, on every class page and on Holding detail. Overview's Total assets stat card SHALL link to `/assets`.

#### Scenario: AS-19 The Assets nav item is a link
- **GIVEN** a signed-in User on `<page>`
- **WHEN** the nav is rendered
- **THEN** the Assets item links to `/assets` and is active `<active>`

Examples:

| page | active |
|---|---|
| Overview | no |
| the Assets page | yes |
| the Stocks class page | yes |
| a Holding detail page | yes |

#### Scenario: AS-20 The Total assets stat card is a link
- **GIVEN** a User with at least one Holding
- **WHEN** Overview is rendered
- **THEN** the Total assets stat card links to `/assets`
