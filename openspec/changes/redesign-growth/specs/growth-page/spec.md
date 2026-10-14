# growth-page

## Purpose

The `/growth` screen: how Net Worth changed over a range and Country scope and why, a chart of what is owned and owed with its Projection in nominal or Today's dollars, the year-end record, and the links that lead to it.

## ADDED Requirements

### Requirement: The Growth page's view state lives in the URL
The page SHALL read its range (1Y, 3Y, 5Y, All; default All), Country scope (All, United States, India; default All), chart mode (Simple, By asset class, By country; default Simple) and basis (Nominal, Today's dollars; default Nominal) from the URL, so Back restores them. An unknown value SHALL fall back to its default. The projection toggle is the shared one, not a page setting.

#### Scenario: GR-01 Missing or unknown view state uses the defaults
- **GIVEN** a Portfolio with Holdings in both Countries
- **WHEN** the Growth page is opened with `<url state>`
- **THEN** the range is `<range>`, the scope `<scope>`, the mode `<mode>` and the basis `<basis>`

Examples:

| url state | range | scope | mode | basis |
|---|---|---|---|---|
| none | All | All | Simple | Nominal |
| range 3Y, scope India | 3Y | India | Simple | Nominal |
| mode By country, basis Today's dollars | All | All | By country | Today's dollars |
| range 2Y, scope Mars, mode pie, basis real | All | All | Simple | Nominal |

### Requirement: The header shows the Net Worth change for the range and Country scope
The header SHALL show the nominal change in Net Worth from the range start to today for the Countries in scope, coloured by its sign, and the line "Net worth change since ⟨Mon YYYY⟩ · ⟨scope⟩ · $A → $B", where the scope reads "all countries", "United States" or "India". The range start SHALL be clamped to the Portfolio's earliest Valuation.

#### Scenario: GR-02 Header change per Country scope
- **GIVEN** today is 2026-10-13, with FX Rates of 80.0 on 2025-10-13 and 85.0 today, and the two-Country Portfolio: a US Cash Holding $80,000 on 2025-10-13 and $100,000 now; an India Real estate Holding ₹8,000,000 then and ₹9,350,000 now; a US Liability $50,000 then and $45,000 now; an India Liability ₹1,600,000 then and ₹1,190,000 now
- **WHEN** the Growth page is shown with range 1Y and scope `<scope>`
- **THEN** the headline is `<change>`
- **AND** the line reads `<line>`

Examples:

| scope | change | line |
|---|---|---|
| All | +$41,000 | Net worth change since Oct 2025 · all countries · $110,000 → $151,000 |
| United States | +$25,000 | Net worth change since Oct 2025 · United States · $30,000 → $55,000 |
| India | +$16,000 | Net worth change since Oct 2025 · India · $80,000 → $96,000 |

#### Scenario: GR-03 A range longer than the history starts at the first Valuation
- **GIVEN** a Portfolio whose earliest Valuation is on 2026-03-05, with today 2026-10-13
- **WHEN** the Growth page is shown with range 5Y
- **THEN** the line reads "Net worth change since Mar 2026 · …"
- **AND** the chart's history starts on 2026-03-05

### Requirement: The chart runs from the range start through the horizon
The chart SHALL plot history from the range start to today at the sample dates of the calculations module, followed by the Projection to the end of the User's horizon, for the Countries in scope. The shared projection toggle decides whether the projected part is shown.

#### Scenario: GR-04 The projected part reaches the end of the horizon
- **GIVEN** a Portfolio with history since 2024-01-01, a horizon of `<years>` years, and today 2026-10-13
- **WHEN** the Growth chart is built
- **THEN** its points run from 2024-01-01 to `<end month>`, with today as the last recorded point

Examples:

| years | end month |
|---|---|
| 10 | Oct 2036 |
| 15 | Oct 2041 |

### Requirement: Simple mode draws Net worth, Assets and Owed
In Simple mode the chart SHALL draw Net worth as a bold line, Assets as a light area and Owed as a red line with a light area, all on a positive axis, each with a right-edge value label. The legend below the chart SHALL read Net worth, Assets, Owed.

#### Scenario: GR-05 Simple mode series and legend
- **GIVEN** the two-Country Portfolio of GR-02 and scope All
- **WHEN** the chart is shown in Simple mode
- **THEN** it has three series, Net worth (bold), Assets (area) and Owed (area), each with an end label
- **AND** Net worth today is $151,000, Assets $210,000 and Owed $59,000
- **AND** the legend reads Net worth, Assets, Owed

### Requirement: By asset class mode stacks the classes held in scope
In By asset class mode the chart SHALL stack one light layer per Asset Class that has a value anywhere in the chart for the Countries in scope, ordered by current value, largest first, at the bottom. It SHALL add the Owed line and a bold Net worth line, each end-labelled. The legend SHALL list the classes in that order, then Owed, then Net worth.

#### Scenario: GR-06 Class layers follow the scope and current value
- **GIVEN** the two-Country Portfolio of GR-02
- **WHEN** the chart is shown By asset class with scope `<scope>`
- **THEN** the layers, bottom to top, are `<layers>`
- **AND** each layer's tooltip value is its own class's value, not the stacked total
- **AND** the legend reads `<legend>`

Examples:

| scope | layers | legend |
|---|---|---|
| All | Real estate, Cash | Real estate, Cash, Owed, Net worth |
| United States | Cash | Cash, Owed, Net worth |
| India | Real estate | Real estate, Owed, Net worth |

#### Scenario: GR-07 Monthly savings add a Stocks layer even with no Stocks Holding
- **GIVEN** a Portfolio with one US Cash Holding, no Stocks Holding, and US Monthly savings of $1,000
- **WHEN** the chart is shown By asset class with scope All
- **THEN** a Stocks layer is drawn, 0 up to today and equal to the US savings pool in the Projection

### Requirement: By country mode draws each Country's Net Worth
In By country mode the chart SHALL draw one Net Worth line per Country in scope, in its Country colour and end-labelled with the Country's short name. With both Countries in scope it SHALL add a bold "Total net worth" line, end-labelled "Total". The legend SHALL list the total first, when drawn, then the Countries.

#### Scenario: GR-08 Country lines follow the scope
- **GIVEN** the two-Country Portfolio of GR-02
- **WHEN** the chart is shown By country with scope `<scope>`
- **THEN** the lines are `<lines>`, ending today at `<values>`

Examples:

| scope | lines | values |
|---|---|---|
| All | Total net worth, US net worth, India net worth | $151,000, $55,000, $96,000 |
| India | India net worth | $96,000 |

### Requirement: Nominal or Today's dollars sets the chart's basis
With Nominal, the chart SHALL use nominal USD, with the title "What you own, what you owe" and the subtitle "Nominal dollars, not adjusted for inflation". With Today's dollars, every series, past and projected, SHALL be restated by the calculations module, with the title "In today's dollars" and a subtitle naming each in-scope Country's resolved inflation. A single-Country scope SHALL add " · ⟨Country⟩" to the title.

#### Scenario: GR-09 Today's dollars restates the past upward
- **GIVEN** a US Cash Holding worth $100,000 since 2024-10-13, today 2026-10-13, and US inflation blank (3%)
- **WHEN** the chart is shown in Today's dollars with range All
- **THEN** its first point, 2024-10-13, is $106,090
- **AND** today's point is $100,000

#### Scenario: GR-10 Title and subtitle name the basis and the inflation in scope
- **GIVEN** US inflation set to 2.5 and India inflation blank, with today in Oct 2026
- **WHEN** the chart is shown with basis `<basis>` and scope `<scope>`
- **THEN** the title is `<title>` and the subtitle is `<subtitle>`

Examples:

| basis | scope | title | subtitle |
|---|---|---|---|
| Nominal | All | What you own, what you owe | Nominal dollars, not adjusted for inflation |
| Nominal | India | What you own, what you owe · India | Nominal dollars, not adjusted for inflation |
| Today's dollars | All | In today's dollars | Each country restated in Oct 2026 dollars at its own inflation: US 2.5%, India 5.0% |
| Today's dollars | United States | In today's dollars · United States | Each country restated in Oct 2026 dollars at its own inflation: US 2.5% |

### Requirement: Where the change came from splits the header's change into rows
The card SHALL list "Net worth ⟨Mon YYYY⟩" at the range start, "Asset growth & savings", "Debt paid down", "Currency (₹ → $)" only when India is in scope, and "Net worth today", from the calculations module's change attribution for the range start and scope. The middle rows SHALL sum exactly to the header's change.

#### Scenario: GR-11 Waterfall rows per Country scope
- **GIVEN** the two-Country Portfolio of GR-02 and range 1Y
- **WHEN** the waterfall is shown with scope `<scope>`
- **THEN** its rows are `<rows>`

Examples:

| scope | rows |
|---|---|
| All | Net worth Oct 2025 $110,000; Asset growth & savings +$36,875; Debt paid down +$10,125; Currency (₹ → $) −$6,000; Net worth today $151,000 |
| United States | Net worth Oct 2025 $30,000; Asset growth & savings +$20,000; Debt paid down +$5,000; Net worth today $55,000 |
| India | Net worth Oct 2025 $80,000; Asset growth & savings +$16,875; Debt paid down +$5,125; Currency (₹ → $) −$6,000; Net worth today $96,000 |

#### Scenario: GR-12 The subtitle names the exchange-rate month and the scope
- **GIVEN** range 1Y with today 2026-10-13
- **WHEN** the waterfall is shown with scope `<scope>`
- **THEN** its subtitle is `<subtitle>`

Examples:

| scope | subtitle |
|---|---|
| All | Asset growth uses Oct 2025 exchange rates, so currency moves are split out |
| India | India only. Asset growth uses Oct 2025 exchange rates, so currency moves are split out |

#### Scenario: GR-13 Each bar spans its step on one shared scale
- **GIVEN** the two-Country Portfolio of GR-02, range 1Y and scope All
- **WHEN** the waterfall is shown
- **THEN** on a scale from 0 to 157,000, the bars span 0–110,000, 110,000–146,875, 146,875–157,000, 151,000–157,000 and 0–151,000
- **AND** the totals are in ink, the positive steps green and the Currency step red

### Requirement: Year by year lists Net Worth at each year end
The card SHALL list one row per calendar year from the year of the Portfolio's earliest Valuation to the current year, newest first, for the Countries in scope and always nominal. Each row shows Net Worth and debt at 31 December, or at today for the current year (marked with a star), and the % change from the previous row, "—" for the first year or when the previous Net Worth is 0.

#### Scenario: GR-14 Year-end rows with the current year starred
- **GIVEN** today 2026-10-13, a US Holding valued $50,000 on 2024-12-31, $70,000 on 2025-12-31 and $84,000 now, and a US Liability with balances $20,000 on 2024-12-31, $12,000 on 2025-12-31 and $10,000 on 2026-10-01
- **WHEN** Year by year is shown
- **THEN** the rows are 2026* $74K, $10K, +28%; 2025 $58K, $12K, +93%; 2024 $30K, $20K, —

#### Scenario: GR-15 Year by year ignores the basis and follows the scope
- **GIVEN** the Portfolio of GR-14 plus an India Holding added in 2026
- **WHEN** Year by year is shown with scope United States and basis Today's dollars
- **THEN** the rows are the same as in GR-14

### Requirement: An empty Portfolio shows a way to add something and the assumptions card
With no current Holdings and no current Liabilities (archived ones don't count), the Growth page SHALL show one card with a link that opens the add-asset modal in place of the header controls, chart, waterfall and Year by year. The Projection assumptions card SHALL still be shown and editable.

#### Scenario: GR-16 Empty Growth page
- **GIVEN** a Portfolio with no Holdings or Liabilities, or only archived ones
- **WHEN** the Growth page is rendered
- **THEN** it shows a link "Add an account or asset" that opens the add-asset modal
- **AND** it shows no range, scope or projection controls, no chart, no waterfall and no Year by year
- **AND** it shows the Projection assumptions card with its inputs

#### Scenario: GR-17 A brand-new item gives a one-point history
- **GIVEN** a Portfolio whose only item is a US Holding first valued today, 2026-10-13, at $5,000
- **WHEN** the Growth page is shown with range All
- **THEN** the line reads "Net worth change since Oct 2026 · all countries · $5,000 → $5,000"
- **AND** the waterfall's middle rows are all 0, and Year by year has one row, 2026*, with "—"

### Requirement: The Growth nav item and the Equity built stat card lead to the Growth page
The Growth item in the sidebar, the tablet tabs and the phone tab bar SHALL link to `/growth` and show as active there. The Overview's Equity built stat card, when shown, SHALL link to `/growth`.

#### Scenario: GR-18 Growth nav item is a link in every nav form
- **GIVEN** any signed-in User
- **WHEN** the shell is rendered on `/growth`
- **THEN** the Growth item links to `/growth` in the sidebar, the tablet tabs and the phone tab bar, and is the active item

#### Scenario: GR-19 Equity built goes to Growth
- **GIVEN** a Portfolio with a Holding linked to a Liability
- **WHEN** the Overview is rendered
- **THEN** the Equity built stat card links to `/growth`
