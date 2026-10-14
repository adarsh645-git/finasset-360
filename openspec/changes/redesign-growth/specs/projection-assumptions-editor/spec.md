# projection-assumptions-editor

## Purpose

Lets the User see and change their Projection Assumptions, Monthly savings, savings growth and horizon on the Growth page, see what each default is, and see what the Projection comes to by the end of the horizon.

## ADDED Requirements

### Requirement: Each field shows its saved value or its default as a placeholder
The card SHALL show, for the selected Country, Inflation, Real estate, Stocks and Cash in %/yr and Monthly savings in that Country's currency. Under "Shared across countries" it SHALL show Crypto, Metals, Vehicles & other and Savings growth in %/yr. Its header SHALL show the horizon in years beside "Reset defaults". A blank field SHALL be empty, with its default as the placeholder.

#### Scenario: PA-01 Saved values and default placeholders
- **GIVEN** Projection Assumptions with US Stocks 7.5, US Monthly savings 3,000 and the horizon 15, everything else blank
- **WHEN** the card is shown on the `<tab>` tab
- **THEN** the `<field>` field holds `<value>` with placeholder `<placeholder>`

Examples:

| tab | field | value | placeholder |
|---|---|---|---|
| United States | Stocks | 7.5 | 7 |
| United States | Inflation | (empty) | 3 |
| United States | Monthly savings | 3,000 | 0 |
| India | Stocks | (empty) | 11 |
| India | Inflation | (empty) | 5 |
| India | Monthly savings | (empty) | 0 |
| either | Vehicles & other | (empty) | −9 |
| either | Savings growth | (empty) | 0 |
| either | Horizon | 15 | 10 |

#### Scenario: PA-02 Amount-held hints and currency
- **GIVEN** the two-Country Portfolio of GR-02
- **WHEN** the card is shown on the `<tab>` tab
- **THEN** `<field>` has the hint `<hint>`

Examples:

| tab | field | hint |
|---|---|---|
| United States | Inflation | Used for today's dollars |
| United States | Cash | $100K held |
| United States | Real estate | none held |
| United States | Monthly savings | $ per month, invested at the Stocks rate |
| India | Real estate | $110K held |
| India | Monthly savings | ₹ per month, invested at the Stocks rate |
| either | Crypto | none held |
| either | Savings growth | Raises monthly savings once a year |

### Requirement: The Country tab follows the Country scope
The tab SHALL be United States or India, kept in the URL. With no tab chosen it SHALL be the scope's Country, or United States when the scope is All. Choosing United States or India as the Country scope SHALL also select that tab; choosing All SHALL leave the tab as it is.

#### Scenario: PA-03 Which tab is selected
- **GIVEN** the Growth page with tab `<tab in url>` and scope `<scope>`
- **WHEN** the card is shown
- **THEN** the selected tab is `<tab>`

Examples:

| tab in url | scope | tab |
|---|---|---|
| none | All | United States |
| none | India | India |
| India | All | India |
| United States | India | United States |

#### Scenario: PA-04 The scope control carries the tab
- **GIVEN** the Growth page with tab India and scope All
- **WHEN** the User chooses scope `<scope>`
- **THEN** the tab becomes `<tab>`

Examples:

| scope | tab |
|---|---|
| United States | United States |
| India | India |
| All | India |

### Requirement: Inputs are validated before they are saved
A rate (inflation, a class rate or savings growth) SHALL be a number from −50 to 50; a horizon a whole number of years from 1 to 40; Monthly savings a number of 0 or more. Commas, spaces, a trailing "%" and the currency symbol SHALL be ignored, and "−" counts as a minus sign. A blank field SHALL be valid and mean the default. An invalid entry SHALL show an inline message and SHALL NOT be saved.

#### Scenario: PA-05 Rate entries
- **GIVEN** the US Stocks field
- **WHEN** the User enters `<text>`
- **THEN** the result is `<result>`

Examples:

| text | result |
|---|---|
| 7 | 7 |
| 7.5% | 7.5 |
| −9 | −9 |
| -50 | −50 |
| 50 | 50 |
| (empty) | blank |
| 51 | "Enter a rate from −50 to 50" |
| abc | "Enter a rate from −50 to 50" |

#### Scenario: PA-06 Horizon entries
- **GIVEN** the horizon field
- **WHEN** the User enters `<text>`
- **THEN** the result is `<result>`

Examples:

| text | result |
|---|---|
| 1 | 1 |
| 40 | 40 |
| (empty) | blank |
| 0 | "Enter whole years from 1 to 40" |
| 41 | "Enter whole years from 1 to 40" |
| 12.5 | "Enter whole years from 1 to 40" |

#### Scenario: PA-07 Monthly savings entries
- **GIVEN** the India Monthly savings field
- **WHEN** the User enters `<text>`
- **THEN** the result is `<result>`

Examples:

| text | result |
|---|---|
| 50,000 | 50000 |
| ₹ 1,20,000 | 120000 |
| 0 | 0 |
| (empty) | blank |
| -100 | "Enter an amount of 0 or more" |

### Requirement: A valid edit is saved when the field is committed
Leaving a field or pressing Enter SHALL save that one field, if its value changed and is valid, as a partial update of the User's Projection Assumptions, with blank saved as blank. Every chart and figure SHALL then recompute from the saved value. There is no Save button. A failed save SHALL show an inline message and keep the typed text.

#### Scenario: PA-08 Only the committed field is saved
- **GIVEN** the card with every field blank
- **WHEN** the User commits `<text>` in `<field>`
- **THEN** only `<saved>` is saved, and every other field stays as it was

Examples:

| field | text | saved |
|---|---|---|
| United States Stocks | 7.5 | US Stocks rate 7.5 |
| India Monthly savings | 50,000 | India Monthly savings 50,000 |
| Metals | 3 | Metals rate 3 |
| Savings growth | 3 | savings growth 3 |
| Horizon | 15 | horizon 15 years |

#### Scenario: PA-09 Clearing a field saves it as blank
- **GIVEN** US Stocks saved as 7.5
- **WHEN** the User clears the field and commits it
- **THEN** US Stocks is saved as blank, and the Projection uses 7% again

#### Scenario: PA-10 Unchanged or invalid entries are not saved
- **GIVEN** US Stocks saved as 7.5
- **WHEN** the User commits `<text>`
- **THEN** nothing is saved, the field shows `<message>`, and the Projection still uses 7.5%

Examples:

| text | message |
|---|---|
| 7.5 | no message |
| 60 | Enter a rate from −50 to 50 |

### Requirement: Reset defaults blanks every field
"Reset defaults" SHALL save every rate, both Countries' Monthly savings, savings growth and the horizon as blank in one update, so the Projection uses every default: the Country and Asset Class rates, no savings and a 10-year horizon.

#### Scenario: PA-11 Reset defaults
- **GIVEN** Projection Assumptions with US Stocks 7.5, India inflation 6, Crypto 0, US Monthly savings 3,000, savings growth 3 and the horizon 15
- **WHEN** the User presses Reset defaults
- **THEN** every field is saved as blank and shows its default as the placeholder
- **AND** the projection toggle reads "10-yr projection on"

### Requirement: The footer shows Net Worth at the end of the horizon
The footer SHALL read "Projection for ⟨scope⟩" and show, for the Countries in scope, "Net worth by ⟨Mon YYYY⟩" (today's month plus the horizon) in nominal USD, the same in Today's dollars, and "Lost to inflation" (the difference), whatever the chart's basis and the projection toggle.

#### Scenario: PA-12 Footer per Country scope
- **GIVEN** today 2026-10-13 with FX Rate 83.4, blank Projection Assumptions, a US Stocks Holding of $100,000 and an India Stocks Holding of ₹8,340,000
- **WHEN** the footer is shown with scope `<scope>`
- **THEN** it reads `<label>`: Net worth by Oct 2036 `<nominal>`, in today's dollars `<real>`, lost to inflation `<lost>`

Examples:

| scope | label | nominal | real | lost |
|---|---|---|---|---|
| United States | Projection for United States | $196,715 | $146,375 | $50,341 |
| India | Projection for India | $283,942 | $174,316 | $109,626 |
| All | Projection for all countries | $480,657 | $320,690 | $159,967 |

#### Scenario: PA-13 The footer counts Monthly savings, even with nothing held
- **GIVEN** an empty Portfolio with US Monthly savings of $1,000 and everything else blank, today in Oct 2026
- **WHEN** the Growth page is shown
- **THEN** the footer reads Net worth by Oct 2036 $171,052, in today's dollars $127,279, lost to inflation $43,773

### Requirement: The saved horizon sets how far every Projection runs
The horizon saved here SHALL set the end of every chart's Projection, the footer's end month and the projection toggle's label "N-yr projection on" everywhere in the app.

#### Scenario: PA-14 A new horizon relabels the toggle and moves the footer
- **GIVEN** the projection toggle on, today in Oct 2026, and the horizon blank
- **WHEN** the User saves a horizon of 15
- **THEN** the projection toggle reads "15-yr projection on" on every page
- **AND** the footer reads "Net worth by Oct 2041"
