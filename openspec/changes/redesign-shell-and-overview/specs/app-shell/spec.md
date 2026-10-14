# app-shell

## Purpose

The signed-in frame around every page: design tokens and theme, the responsive navigation with its Net Worth and totals, the sign-in chrome, and the rule that the frame only links to pages that exist.

## ADDED Requirements

### Requirement: Every signed-in page sits in the shell
Every signed-in page SHALL render inside one shared shell. A visitor who isn't signed in SHALL be sent to the login page, and the login page has no shell.

#### Scenario: SH-01 A signed-out visitor goes to login
- **GIVEN** a visitor with no session
- **WHEN** they open the Overview
- **THEN** they are redirected to the login page

### Requirement: The theme is light or dark, chosen by the User and never flashed
The page SHALL be served already in the User's chosen theme, so it never shows the other theme first. The theme defaults to light. The toggle reads "Dark mode" in light and "Light mode" in dark ("Dark"/"Light" in the top bar), switches at once, and is remembered across visits on that browser.

#### Scenario: TH-01 The server renders the remembered theme
- **GIVEN** a remembered theme of `<stored>`
- **WHEN** any page is rendered on the server
- **THEN** the document's theme is `<theme>` and the sidebar toggle reads `<label>`

Examples:

| stored | theme | label |
|---|---|---|
| none | light | Dark mode |
| light | light | Dark mode |
| dark | dark | Light mode |
| purple | light | Dark mode |

#### Scenario: TH-02 Toggling flips the theme and remembers it
- **GIVEN** the theme is `<from>`
- **WHEN** the User toggles the theme
- **THEN** the theme becomes `<to>` and `<to>` is remembered for a year

Examples:

| from | to |
|---|---|
| light | dark |
| dark | light |

### Requirement: Colours, type and radii come from the design tokens
Every colour on screen SHALL come from the mockup's tokens: background, panel, three ink levels, two line weights, hover, selection, positive and negative, each with a light and a dark value. Each Asset Class and Country SHALL have its fixed colour in both themes.

#### Scenario: TH-03 Each Asset Class and Country has its token colour
- **GIVEN** the six Asset Classes and the two Countries
- **WHEN** their colours are looked up
- **THEN** each has the mockup's colour (e.g. Stocks oklch(0.62 0.12 255), India oklch(0.72 0.12 60)), and no two Asset Classes share one

### Requirement: The navigation adapts to three widths
The shell SHALL show the same five nav items (Overview, Assets, Liabilities, Growth, Goals) in one of three forms: a 240px sticky sidebar at 1024px and up; a sticky top bar with a row of scrolling tabs at 640–1023px; a top bar with a fixed bottom tab bar below 640px, which respects the safe-area inset and leaves about 76px at the end of the page.

#### Scenario: SH-02 All three nav forms list the same items
- **GIVEN** a signed-in User on the Overview
- **WHEN** the shell is rendered
- **THEN** the sidebar, the tablet tabs and the phone tab bar each list Overview, Assets, Liabilities, Growth and Goals in that order, with Overview marked active

### Requirement: The nav shows which section is active
The active nav item SHALL follow the current page: the Overview at `/`; Assets for `/assets`, any class page and any Holding detail; Liabilities for `/liabilities` and any Liability detail; Growth and Goals for their own pages.

#### Scenario: SH-03 The active item follows the page
- **GIVEN** the current path is `<path>`
- **WHEN** the nav is built
- **THEN** the active item is `<item>`

Examples:

| path | item |
|---|---|
| / | Overview |
| /assets/stocks | Assets |
| /holdings/abc | Assets |
| /liabilities/xyz | Liabilities |
| /growth | Growth |
| /goals | Goals |

### Requirement: The nav shows Net Worth and compact totals
The sidebar SHALL show Net Worth in full USD, with its 12-month change as signed amount and percent ("+$48,200 (+4.3%) 12 mo"), coloured by sign. With no year of history the change SHALL read "—". The Assets and Liabilities nav items SHALL show compact totals of current values and current balances (the phone tab bar shows them too).

#### Scenario: SH-04 Net Worth and totals in the nav
- **GIVEN** current Holdings worth $1,300,000 and Liabilities of $120,000 in USD, and Net Worth of $1,131,800 twelve months ago
- **WHEN** the nav is built
- **THEN** the sidebar shows $1,180,000 and "+$48,200 (+4.3%) 12 mo", Assets shows $1.30M and Liabilities shows $120K

#### Scenario: SH-05 A young Portfolio has no 12-month change
- **GIVEN** a Portfolio whose earliest Valuation is 3 months old
- **WHEN** the nav is built
- **THEN** the sidebar's 12-month change reads —

#### Scenario: SH-06 Archived items are left out of the totals
- **GIVEN** a current Holding worth $10,000 and an archived Holding last worth $5,000
- **WHEN** the nav is built
- **THEN** Assets shows $10K

### Requirement: The Asset classes list shows only classes that have Holdings
The sidebar's "Asset classes" list SHALL show, in the fixed class order, each Asset Class with at least one current Holding, with its colour dot and compact total. With no current Holdings the list and its heading SHALL be absent.

#### Scenario: SH-07 Only classes in use are listed
- **GIVEN** current Holdings in Stocks ($412,000) and Cash ($18,000) only
- **WHEN** the nav is built
- **THEN** the list shows Stocks $412K then Cash $18K, and no other class

### Requirement: The shell links only to pages that exist
A nav item, class row or card row SHALL be a link only when its target page exists in the app. Otherwise it SHALL be plain text with the same content. In this change only the Overview exists. The "+ Add" buttons SHALL be absent until adding exists.

#### Scenario: SH-08 Pages that don't exist yet are plain text
- **GIVEN** an app where only the Overview page exists, and a Portfolio with Stocks Holdings
- **WHEN** the shell is rendered
- **THEN** Overview is a link to `/`; Assets, Liabilities, Growth, Goals and the Stocks class row are plain text; and there is no "+ Add" button

#### Scenario: SH-09 A page that exists turns its links on
- **GIVEN** an app where the Overview and `/assets` pages exist
- **WHEN** the nav is built
- **THEN** Assets is a link to `/assets` and Liabilities stays plain text

### Requirement: The signed-in User can see who they are and sign out
The shell SHALL show the signed-in User's first name (or their email when there is no name) and a Sign out action, in the sidebar and in the top bar. Signing out SHALL end the session and return to the login page.

#### Scenario: SH-10 Name and Sign out in the shell
- **GIVEN** a User signed in as "Adarsh Reddy"
- **WHEN** the shell is rendered
- **THEN** it shows "Adarsh" and a Sign out action

### Requirement: An empty Portfolio's shell shows zeros and dashes
With no current Holdings or Liabilities, the sidebar SHALL show Net Worth $0 with a 12-month change of "—", Assets and Liabilities SHALL show $0, and no Asset classes list.

#### Scenario: SH-11 First-run shell
- **GIVEN** a User with no Holdings or Liabilities
- **WHEN** the shell is rendered
- **THEN** the sidebar shows $0 and —, Assets and Liabilities show $0, and there is no Asset classes heading
