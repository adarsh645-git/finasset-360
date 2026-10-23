# overview

## MODIFIED Requirements

### Requirement: An empty Portfolio shows the first-run card
With no current Holdings and no current Liabilities, the Overview SHALL show only the header with $0 (no change, range control or projection toggle) and one card, "Add your first account or asset", with a short explainer. There SHALL be no chart, stat cards or other cards. The card's Add button and "or a loan" link SHALL be absent until adding exists, and shown once it does (from `redesign-holding-entry`, the Add button opens `?modal=add-asset`).

#### Scenario: OV-21 First-run Overview
- **GIVEN** a User with no Holdings or Liabilities
- **WHEN** the Overview is rendered
- **THEN** it shows "Net worth · rolled up to USD", $0 and the "Add your first account or asset" card, and no chart, range control, projection toggle, stat card, Allocation, Where it's held or Needs updating

#### Scenario: OV-22 Only archived items still counts as first run
- **GIVEN** a User whose only Holding is archived
- **WHEN** the Overview is rendered
- **THEN** it shows the first-run card and $0
