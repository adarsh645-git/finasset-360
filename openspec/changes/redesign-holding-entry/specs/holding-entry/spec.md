# holding-entry

## Purpose

How a User adds a Holding, edits it, and records its value: the add/edit modal and its URL state, the form for each Asset Class, the Stocks positions editor with its Hand Price path, Update value and Edit positions, and the "+ Add account or asset" entry points.

## ADDED Requirements

### Requirement: The modal is opened and closed through the URL
The modal SHALL open from search params on any page in the app shell: `modal=add-asset` (with an optional `class`), `modal=edit&holding=<id>` or `modal=update&holding=<id>`. Each mode SHALL have a fixed title and save label. Closing the modal (Cancel, ×, the backdrop or Esc) SHALL remove the modal params and leave the rest of the URL.

#### Scenario: HE-01 Each mode has its title and save label
- **GIVEN** a Portfolio with a Cash Holding, a Metals Holding and a Stocks Holding
- **WHEN** a page is opened with `<params>`
- **THEN** the modal's title is `<title>` and its save button reads `<save>`

Examples:

| params | title | save |
|---|---|---|
| `modal=add-asset` | Add to portfolio | Add account |
| `modal=add-asset&class=realestate` | Add to portfolio | Add property |
| `modal=add-asset&class=metals` | Add to portfolio | Add asset |
| `modal=edit&holding=<Cash Holding>` | Edit account | Save |
| `modal=edit&holding=<Metals Holding>` | Edit asset | Save |
| `modal=update&holding=<Cash Holding>` | Update value | Save |
| `modal=update&holding=<Stocks Holding>` | Edit positions | Save |

#### Scenario: HE-02 Params that name nothing open nothing
- **GIVEN** a Portfolio with one current Holding and one archived Holding
- **WHEN** a page is opened with `<params>`
- **THEN** `<outcome>`

Examples:

| params | outcome |
|---|---|
| `modal=edit&holding=<archived Holding>` | no modal opens |
| `modal=update&holding=<an id that is not the User's>` | no modal opens |
| `modal=add-liability` | no modal opens |
| `modal=add-asset&class=boats` | the add modal opens with Stocks selected |

#### Scenario: HE-03 Closing keeps the page and its other params
- **GIVEN** the modal open at `/holdings/h1?position=h1~AAPL&modal=edit&holding=h1`
- **WHEN** the User closes it
- **THEN** the URL is `/holdings/h1?position=h1~AAPL`

### Requirement: The asset form adapts to the Asset Class
The add form SHALL show Asset Class chips in the fixed order, then a Name whose label and placeholder follow the class, "Held in" (United States · $ or India · ₹), and an optional Description. Each class SHALL then show its own fields. Amount prefixes SHALL follow the Country.

#### Scenario: HE-04 Fields per Asset Class
- **GIVEN** the add modal
- **WHEN** the User picks `<class>`
- **THEN** the Name field is labelled `<label>` with placeholder `<placeholder>`
- **AND** the class's own fields are `<fields>`

Examples:

| class | label | placeholder | fields |
|---|---|---|---|
| Stocks | Account name | e.g. Schwab brokerage | Positions |
| Real estate | Property name | e.g. Austin condo | Property type, City / location, Current value, Cost basis (optional) |
| Cash | Name | e.g. Chase savings | Current value, Cost basis (optional) |
| Crypto | Name | e.g. Coinbase | Current value, Cost basis (optional) |
| Metals | Name | e.g. Gold coins | Current value, Cost basis (optional), Quantity, Unit |
| Vehicles & other | Name | e.g. 2022 Honda CR-V | Current value, Cost basis (optional) |

#### Scenario: HE-05 New-form defaults
- **GIVEN** the add modal opened with no `class` param
- **WHEN** it first renders
- **THEN** Stocks is selected, Held in is United States, and amounts are prefixed "$"
- **AND** after picking Real estate the Property type is Residential, and after picking Metals the unit is Grams
- **AND** after picking India · ₹ amounts are prefixed "₹"

#### Scenario: HE-06 Switching class keeps what was typed
- **GIVEN** the add modal with Name "Chase savings", Description "Everyday account" and India · ₹ chosen
- **WHEN** the User switches from Cash to Crypto and back to Cash
- **THEN** the Name, Description and Held in are unchanged

### Requirement: Edit pre-fills the Holding and leaves out its class and Country
The edit form SHALL be pre-filled with the Holding's saved fields and SHALL use the Holding's Asset Class for its fields and its Country for amount prefixes. It SHALL NOT offer the Asset Class chips or "Held in", because both are fixed after creation; changing them means archiving and adding again.

#### Scenario: HE-07 Editing a Real estate Holding
- **GIVEN** an India Real estate Holding "Pune apartment", Description "2BHK · rented", Property type Land, city "Pune", value ₹62,00,000 and Cost Basis ₹48,00,000
- **WHEN** its edit modal opens
- **THEN** every field shows those values, with Land selected and amounts prefixed "₹"
- **AND** there are no Asset Class chips and no "Held in" choice

### Requirement: Saving an asset validates with the mockup's messages
Saving SHALL check, in order: a non-blank name ("Give it a name"); for Stocks, at least one Position ("Add at least one position") and no typed but unadded ticker ("Add ⟨ticker⟩ or clear it first"); otherwise a current value of 0 or more ("Enter the current value"). The first failure SHALL show in the footer line and nothing SHALL be saved.

#### Scenario: HE-08 Validation messages
- **GIVEN** the add modal for `<class>` with `<input>`
- **WHEN** the User saves
- **THEN** the footer reads `<message>` and no Holding is saved

Examples:

| class | input | message |
|---|---|---|
| Cash | a blank name and value 5,000 | Give it a name |
| Cash | Name "Chase savings" and a blank value | Enter the current value |
| Cash | Name "Chase savings" and value "abc" | Enter the current value |
| Stocks | Name "Fidelity" and no Positions | Add at least one position |
| Stocks | Name "Fidelity", one Position, and "MSFT" typed but not added | Add MSFT or clear it first |

#### Scenario: HE-09 Amounts accept currency signs, commas and spaces
- **GIVEN** the add modal for an India Cash Holding named "SBI NRE"
- **WHEN** the User enters value "₹6,40,000" and Cost Basis " 5,00,000 " and saves
- **THEN** the Holding is saved with value 640000 and Cost Basis 500000

#### Scenario: HE-10 Blank optional fields are left empty
- **GIVEN** the add modal for a Metals Holding named "Silver Eagles" with value 640
- **WHEN** the User leaves Description, Cost Basis and Quantity blank and saves
- **THEN** the Holding has no Description, no Cost Basis and no quantity

### Requirement: A successful save closes the modal and shows the result
On success the modal SHALL close and the page SHALL show fresh data. An add SHALL go to the new Holding's detail page. If the save is rejected, the footer SHALL show the rejection's sentence, the modal SHALL stay open, and the typed values SHALL be kept. Save SHALL not submit twice while a save is in progress.

#### Scenario: HE-11 Adding goes to the new Holding
- **GIVEN** the add modal on the Overview, filled in for a Cash Holding "Chase savings" worth $11,800
- **WHEN** the save succeeds and the new Holding's id is h9
- **THEN** the User is on `/holdings/h9` with no modal open

#### Scenario: HE-12 A rejected save keeps the form
- **GIVEN** the edit modal for a Holding with Name changed to "Ally HYSA"
- **WHEN** the save is rejected with "Cost basis must be 0 or more"
- **THEN** the footer reads "Cost basis must be 0 or more"
- **AND** the modal is still open with Name "Ally HYSA"

### Requirement: The ticker lookup previews a Position before it is added
As the User types a ticker, the editor SHALL look it up in the Holding's Country. With an empty ticker it SHALL show example tickers for the Country. A ticker with market data SHALL preview "name · Sector · price · exchange". A ticker without market data SHALL ask for its price, Sector and name.

#### Scenario: HE-13 Lookup preview
- **GIVEN** the positions editor in a `<country>` account
- **WHEN** the ticker field holds `<typed>` and the lookup returns `<lookup>`
- **THEN** the preview reads `<preview>`
- **AND** the price, Sector and name inputs are `<manual>`

Examples:

| country | typed | lookup | preview | manual |
|---|---|---|---|---|
| US | (empty) | (none) | Try AAPL, GOOGL, META, V, CAT, TSLA | hidden |
| India | (empty) | (none) | Try RELIANCE, INFY, TCS, ITC, LT | hidden |
| US | aapl | Apple Inc., Technology, 232.10, NASDAQ | Apple Inc. · Technology · $232 · NASDAQ | hidden |
| US | TDF2055 | no market data, no name | No market price for TDF2055. Enter its price and Sector. | shown |
| India | infy | no market data, name "Infosys Limited" | Infosys Limited · no market price. Enter its price and Sector. | shown |

#### Scenario: HE-14 India tickers get `.NS`
- **GIVEN** the positions editor in a `<country>` account
- **WHEN** the User types `<typed>`
- **THEN** the ticker looked up and stored is `<stored>`, shown as `<shown>`

Examples:

| country | typed | stored | shown |
|---|---|---|---|
| India | infy | INFY.NS | INFY |
| India | INFY.BO | INFY.BO | INFY |
| US | aapl | AAPL | AAPL |
| US | brk.b | BRK.B | BRK.B |

#### Scenario: HE-15 An unknown ticker's inputs are pre-filled
- **GIVEN** the positions editor in an India account
- **WHEN** the lookup for INFY.NS returns no market data and the name "Infosys Limited"
- **THEN** the name input holds "Infosys Limited" and the Sector is Other
- **AND** with no name from the lookup, the name input is empty and the Position is saved under its ticker

### Requirement: Adding a Position checks it and keeps one per ticker
Add (the button or Enter in any entry field) SHALL check for a ticker ("Enter a ticker"), shares above 0 ("Enter number of shares") and, without market data, a price above 0 ("Enter a price for ⟨ticker⟩"). A blank avg cost SHALL default to the price. Adding a ticker already listed SHALL replace that row. The entry fields SHALL then clear.

#### Scenario: HE-16 Add-time messages
- **GIVEN** the positions editor in a US account
- **WHEN** the User presses Enter with `<entry>`
- **THEN** the footer reads `<message>` and no row is added

Examples:

| entry | message |
|---|---|
| a blank ticker | Enter a ticker |
| ticker AAPL and shares 0 | Enter number of shares |
| ticker TDF2055 (no market data), shares 100 and a blank price | Enter a price for TDF2055 |

#### Scenario: HE-17 Avg cost defaults to the price
- **GIVEN** the positions editor in a US account, with AAPL at a market price of 232.10
- **WHEN** the User adds AAPL with 30 shares and a blank avg cost
- **THEN** the row reads "30 sh · avg $232 · now $232 · Technology"

#### Scenario: HE-18 One row per ticker
- **GIVEN** the positions editor holding AAPL with 30 shares
- **WHEN** the User adds AAPL with 45 shares
- **THEN** there is one AAPL row, with 45 shares

#### Scenario: HE-19 Re-typing a listed ticker pre-fills it
- **GIVEN** an India account's editor holding INFY.NS with 90 shares, avg cost ₹1,450, Hand Price ₹1,880, Sector Technology and name "Infosys Limited"
- **WHEN** the User types "INFY" in the ticker field
- **THEN** the shares, avg cost, price, Sector and name inputs hold 90, 1450, 1880, Technology and "Infosys Limited"
- **AND** changing the price to 1912 and adding replaces the row with the new price

### Requirement: Listed Positions show their figures and a running total
Each listed Position SHALL show its ticker without exchange suffix, its name, "⟨shares⟩ sh · avg ⟨avg cost⟩ · now ⟨price⟩ · ⟨Sector⟩" and its native value, with a remove control. A Hand Price over 30 days old SHALL add "· price ⟨N⟩ days old". The Positions header SHALL show the native total.

#### Scenario: HE-20 Rows, removal and total
- **GIVEN** a US account's editor with AAPL (30 sh, avg 165, price 232.10) and JPM (15 sh, avg 170, price 246)
- **WHEN** it renders
- **THEN** the total reads "$10,653" and the AAPL row reads "30 sh · avg $165 · now $232 · Technology" with value "$6,963"
- **AND** after removing JPM the total reads "$6,963"

#### Scenario: HE-21 A stale Hand Price is flagged in the editor
- **GIVEN** today is 2026-10-14 and an India account's editor holding INFY.NS with a Hand Price as of 2026-08-03
- **WHEN** it renders
- **THEN** the INFY row's figures end "· price 72 days old"

### Requirement: Update value records today's value, even when unchanged
For a Holding that isn't Stocks, Update value SHALL show one large input pre-filled with the current value and the line "Was ⟨current value⟩ · logged as today's value, ⟨today⟩". Saving SHALL record today's Valuation, even when the value is unchanged. A blank or invalid value SHALL show "Enter the current value".

#### Scenario: HE-22 The Update value form
- **GIVEN** today is 2026-10-14 and an India Real estate Holding worth ₹62,00,000
- **WHEN** its Update value modal opens
- **THEN** the input holds 6200000 with prefix "₹"
- **AND** the line reads "Was ₹62,00,000 · logged as today's value, Oct 14, 2026"

#### Scenario: HE-23 Saving an unchanged value still logs today
- **GIVEN** a Cash Holding whose latest Valuation is $6,200, 47 days ago
- **WHEN** the User saves Update value without changing it
- **THEN** a Valuation of $6,200 dated today is recorded

### Requirement: Edit positions edits a Stocks Holding's Positions
For a Stocks Holding, the update mode SHALL be "Edit positions": the edit form with its saved Positions loaded into the positions editor. Saving SHALL send the whole Positions list and record today's Valuation.

#### Scenario: HE-24 Edit positions loads the saved list
- **GIVEN** a US Stocks Holding "Fidelity Brokerage" with AAPL and JPM
- **WHEN** its Edit positions modal opens
- **THEN** the editor lists AAPL and JPM with the total "$10,653"
- **AND** saving after removing JPM sends a Positions list with only AAPL
- **AND** the save doesn't ask for unchanged Hand Prices to be re-dated

#### Scenario: HE-25 A saved unknown ticker carries its Hand Price, Sector and name
- **GIVEN** the add modal for an India Stocks Holding "Zerodha"
- **WHEN** the User adds INFY with 90 shares, avg cost 1450, price 1880, Sector Technology and name "Infosys Limited", then saves
- **THEN** the Holding is saved with one Position INFY.NS: 90 shares, avg cost 1450, Hand Price 1880, Sector Technology and name "Infosys Limited"

### Requirement: "+ Add account or asset" opens the add modal
Every "+ Add account or asset" entry point SHALL be shown: the sidebar button, the top bar's "+ Add" and the first-run card's Add. Each SHALL open the add modal on the current page.

#### Scenario: HE-26 Add buttons open the modal where the User is
- **GIVEN** the User is on `/holdings/h1`
- **WHEN** the shell renders
- **THEN** "+ Add account or asset" is shown and points to `/holdings/h1?modal=add-asset`

#### Scenario: HE-27 The first-run card has its Add button
- **GIVEN** a Portfolio with no Holdings and no Liabilities
- **WHEN** the Overview renders
- **THEN** the first-run card shows an Add button pointing to `/?modal=add-asset`
