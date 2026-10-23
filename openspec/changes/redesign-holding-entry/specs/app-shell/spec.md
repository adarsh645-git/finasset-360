# app-shell

## MODIFIED Requirements

### Requirement: The shell links only to pages that exist
A nav item, class row or card row SHALL be a link only when its target page exists in the app. Otherwise it SHALL be plain text with the same content. The "+ Add" buttons SHALL be absent until adding exists. Pages exist as the link registry (`src/lib/views/links.ts`) lists them: the Overview from `redesign-shell-and-overview`, Holding detail pages from `redesign-holding-entry`, and later pages as their changes land. Adding exists from `redesign-holding-entry`, which turns the "+ Add" buttons on.

#### Scenario: SH-08 Pages that don't exist yet are plain text
- **GIVEN** a link registry where only the Overview page exists and adding is off, and a Portfolio with Stocks Holdings
- **WHEN** the shell is rendered
- **THEN** Overview is a link to `/`; Assets, Liabilities, Growth, Goals and the Stocks class row are plain text; and there is no "+ Add" button

#### Scenario: SH-09 A page that exists turns its links on
- **GIVEN** an app where the Overview and `/assets` pages exist
- **WHEN** the nav is built
- **THEN** Assets is a link to `/assets` and Liabilities stays plain text
