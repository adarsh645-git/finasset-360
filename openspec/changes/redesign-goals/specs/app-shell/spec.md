## MODIFIED Requirements

### Requirement: The shell links only to pages that exist
A nav item, class row or card row SHALL be a link only when its target page exists in the app. Otherwise it SHALL be plain text with the same content. In this change only the Overview and Goals exist. The "+ Add" buttons SHALL be absent until adding exists.

#### Scenario: SH-08 Pages that don't exist yet are plain text
- **GIVEN** an app where only the Overview and Goals pages exist, and a Portfolio with Stocks Holdings
- **WHEN** the shell is rendered
- **THEN** Overview is a link to `/` and Goals is a link to `/goals`; Assets, Liabilities, Growth and the Stocks class row are plain text; and there is no "+ Add" button

#### Scenario: SH-09 A page that exists turns its links on
- **GIVEN** an app where the Overview and `/assets` pages exist
- **WHEN** the nav is built
- **THEN** Assets is a link to `/assets` and Liabilities stays plain text
