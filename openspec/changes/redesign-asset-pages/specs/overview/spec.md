## MODIFIED Requirements

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
- **GIVEN** an app where the Overview, Assets and Growth pages exist
- **WHEN** the Overview is rendered
- **THEN** Total assets is a link to `/assets`, Equity built is a link to `/growth`, and Liabilities is plain text

### Requirement: Allocation shows the split of Holdings across Asset Classes
The Allocation card SHALL show a stacked bar and one row per Asset Class with at least one current Holding, largest first. Each row has the colour dot, name, Holding count, USD value, share of total assets, and the class's 12-month change ("—" when absent; dropped on phones). Rows link to the class page once it exists. With no current Holdings the card SHALL be absent.

#### Scenario: OV-09 Allocation rows
- **GIVEN** current Holdings: Stocks 4 worth $412,000 (12-month change +$31,000), Real estate 3 worth $300,000 (+$12,000), and Cash 1 worth $0 added this month
- **WHEN** the Overview is built
- **THEN** the rows are Stocks "4 · $412,000 · 58% · +$31K", Real estate "3 · $300,000 · 42% · +$12K", then Cash "1 · $0 · 0% · —"

#### Scenario: OV-10 Allocation rows link to class pages
- **GIVEN** an app where the Overview and the class pages exist
- **WHEN** the Overview is rendered
- **THEN** each Allocation row is a link to `/assets/<id>`, such as `/assets/realestate` for Real estate
