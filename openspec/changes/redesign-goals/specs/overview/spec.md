## MODIFIED Requirements

### Requirement: The right column keeps a place for Goals
The right column SHALL end with a slot below Needs updating that the Goals card fills. When there are no Goals the slot SHALL render nothing.

#### Scenario: OV-20 The Goals slot is empty
- **GIVEN** a Portfolio with Holdings and no Goals
- **WHEN** the Overview is rendered
- **THEN** there is no Goals card and no "All goals →" link
