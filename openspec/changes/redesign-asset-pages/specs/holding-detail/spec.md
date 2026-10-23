## MODIFIED Requirements

### Requirement: The actions update, edit and archive the Holding
The page SHALL offer "Update value" (or "Edit positions" for Stocks), "Edit" and "Delete", which open the matching modal. Delete SHALL need two clicks: the first SHALL change its label to "Confirm delete", and the second SHALL archive the Holding, which unlinks its loans, then go to the Holding's class page, or to the Overview when the class page does not exist.

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
- **AND** a second click archives the Holding, its Liability is no longer linked, and the User is on `/assets/realestate`, where the Holding no longer counts
