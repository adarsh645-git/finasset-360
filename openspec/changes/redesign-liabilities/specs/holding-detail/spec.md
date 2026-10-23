## MODIFIED Requirements

### Requirement: Rows elsewhere lead to the Holding's page
Once this page exists, every Holding row the app shows through the link registry SHALL link to `/holdings/[id]`: Overview's "Equity in financed assets" rows and the Holding rows of "Needs updating". Liability rows SHALL link to `/liabilities/[id]` once Loan detail exists (from `redesign-liabilities`).

#### Scenario: HD-22 Overview rows link to their detail pages
- **GIVEN** a Portfolio with a Holding h1 linked to a Liability, and a Stale Holding h2 and a Stale Liability l1
- **WHEN** the Overview renders
- **THEN** the Equity row for h1 links to `/holdings/h1`
- **AND** the Needs updating row for h2 links to `/holdings/h2`, and the row for l1 links to `/liabilities/l1`
