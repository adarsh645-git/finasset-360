# goals

## Purpose

Shows a User's Goals with each one's derived status and progress, lets the User add and remove them, and surfaces them on the Overview (Goals card and goal lines) and in the nav.

## ADDED Requirements

### Requirement: The Goals page lists every Goal by target
The Goals page SHALL show one card per Goal of the signed-in User, sorted by target ascending.

#### Scenario: GO-01 Cards are sorted by target ascending
- **GIVEN** Goals added in this order: "Half a million" $500,000, "$100K net worth" $100,000 and "Quarter million" $250,000
- **WHEN** the User opens the Goals page
- **THEN** the cards read "$100K net worth", "Quarter million", "Half a million"

### Requirement: Each Goal shows its derived status
Each Goal's status SHALL come from the Goal status rule applied to the all-Countries nominal Net Worth series (recorded history, then the Projection over the User's horizon). It reads "Reached ⟨Mon YYYY⟩" in the positive colour, "Projected ⟨Mon YYYY⟩ · in ⟨time from today⟩", or "Beyond the N-year projection", where N is the User's horizon.

#### Scenario: GO-02 Status label and colour
- **GIVEN** today is Oct 2026, a horizon of 10 years, and a Net Worth series that first reaches $150,000 in `<first month>`
- **WHEN** the User views a Goal with target $150,000
- **THEN** its status reads `<status>` in `<colour>`

Examples:

| first month | status | colour |
|---|---|---|
| Mar 2025 | Reached Mar 2025 | positive |
| Oct 2026 | Reached Oct 2026 | positive |
| May 2027 | Projected May 2027 · in 7 mo | secondary |
| Apr 2029 | Projected Apr 2029 · in 2.5 yrs | secondary |
| never | Beyond the 10-year projection | secondary |

#### Scenario: GO-03 "Beyond" names the User's horizon
- **GIVEN** Projection Assumptions with a horizon of `<horizon>` and a Goal the Net Worth series never reaches
- **WHEN** the User views the Goal
- **THEN** its status reads `<status>`

Examples:

| horizon | status |
|---|---|
| blank | Beyond the 10-year projection |
| 15 | Beyond the 15-year projection |

#### Scenario: GO-04 The Overview range never changes a Goal's status
- **GIVEN** a Portfolio with US and India Holdings and a Goal reached only in the Projection
- **WHEN** the Overview Goals card is built with the range `<range>`
- **THEN** the Goal's status is the same as on the Goals page

Examples:

| range |
|---|
| 1Y |
| All |

#### Scenario: GO-05 Projected dates include Monthly savings
- **GIVEN** a Portfolio whose Net Worth is projected to reach a Goal in Sep 2038 with blank Monthly savings, and a horizon of 20 years
- **WHEN** the User's US Monthly savings are $3,000
- **THEN** the Goal's Projected month is earlier than Sep 2038

### Requirement: Each Goal shows progress toward its target
Each Goal card SHALL show "⟨today's Net Worth⟩ of ⟨target⟩" in compact USD, and a progress bar at today's Net Worth ÷ target, clamped to 0–100% and shown as a whole percent. The bar SHALL use the positive colour at 100% and the ink colour below it.

#### Scenario: GO-06 Progress text and bar
- **GIVEN** today's Net Worth is `<net worth>`
- **WHEN** the User views a Goal with target $150,000
- **THEN** it reads `<text>` with a bar at `<bar>` in `<colour>`

Examples:

| net worth | text | bar | colour |
|---|---|---|---|
| 140000 | $140K of $150K | 93% | ink |
| 150000 | $150K of $150K | 100% | positive |
| 400000 | $400K of $150K | 100% | positive |
| −20000 | −$20K of $150K | 0% | ink |

#### Scenario: GO-07 A Reached Goal after a dip keeps its status but not a full bar
- **GIVEN** Net Worth reached $150,000 in Mar 2025 and is $140,000 today
- **WHEN** the User views a Goal with target $150,000
- **THEN** its status reads "Reached Mar 2025" in the positive colour
- **AND** its bar is at 93% in the ink colour

### Requirement: The Goals page explains how dates are projected
The Goals page SHALL show the heading "Net worth milestones" with the subtitle "Projected dates use the country-specific growth rates set on the Growth page, current loan payments and your monthly savings. Amounts are nominal.", whether or not the User has Goals.

#### Scenario: GO-08 Heading and subtitle
- **GIVEN** a User with `<goals>`
- **WHEN** the User opens the Goals page
- **THEN** it shows "Net worth milestones" and the subtitle "Projected dates use the country-specific growth rates set on the Growth page, current loan payments and your monthly savings. Amounts are nominal."

Examples:

| goals |
|---|
| no Goals |
| two Goals |

### Requirement: A User with no Goals sees an empty state above the add form
With no Goals, the Goals page SHALL show "No goals yet" in place of the cards, followed by the add form.

#### Scenario: GO-09 Empty Goals page
- **GIVEN** a User with no Goals
- **WHEN** the User opens the Goals page
- **THEN** it shows "No goals yet" and no Goal cards
- **AND** the add form follows it

### Requirement: Adding a Goal takes a name and a positive USD target
The add form SHALL accept a target only when it is a number greater than 0 after removing `$`, commas and spaces. Otherwise nothing is saved and the form keeps what was typed. The name is saved trimmed, and may be blank. A saved Goal appears in its sorted place, and the form clears.

#### Scenario: GO-10 Which target text is accepted
- **GIVEN** a User on the Goals page
- **WHEN** the User adds a Goal named "Emergency fund" with target text `<target text>`
- **THEN** `<outcome>`

Examples:

| target text | outcome |
|---|---|
| $150,000 | a Goal with target $150,000 is saved |
| 250 000 | a Goal with target $250,000 is saved |
| 1500.50 | a Goal with target $1,500.50 is saved |
| (blank) | nothing is saved |
| 0 | nothing is saved |
| -5000 | nothing is saved |
| 150k | nothing is saved |

### Requirement: A Goal with a blank name is shown as its compact target
Wherever a Goal's name is shown (Goals page, Overview Goals card, goal line label), a Goal whose name is blank SHALL be shown as "⟨compact target⟩ net worth". A named Goal SHALL show its name trimmed.

#### Scenario: GO-11 Displayed Goal names
- **GIVEN** a Goal added with the name `<name>` and target `<target>`
- **WHEN** the User views it
- **THEN** it is shown as `<shown>`

Examples:

| name | target | shown |
|---|---|---|
| (blank) | 150000 | $150K net worth |
| (spaces only) | 2500 | $2.5K net worth |
| (blank) | 1284300 | $1.28M net worth |
| "  Emergency fund  " | 30000 | Emergency fund |

### Requirement: Each Goal card offers Remove and no edit
Each Goal card SHALL offer Remove and no way to edit the Goal. Remove deletes the Goal for good (a real delete, not an archive), after which it is gone from the Goals page, the Overview Goals card, the goal lines and the nav count.

#### Scenario: GO-12 A Goal card offers Remove and no edit
- **GIVEN** a User with one Goal
- **WHEN** the User opens the Goals page
- **THEN** the card offers Remove for that Goal and no way to edit it

### Requirement: The Overview shows the next three unreached Goals
The Overview SHALL show a Goals card with up to 3 Goals that are not Reached, in target order, each with its name, status and progress bar, plus "All goals →" linking to the Goals page. The card SHALL be absent when no Goal is unreached.

#### Scenario: GO-13 The next three unreached Goals
- **GIVEN** Goals of $100,000 and $150,000 (both Reached), and $250,000, $500,000, $1,000,000 and $2,000,000 (not Reached)
- **WHEN** the User opens the Overview
- **THEN** the Goals card lists the $250,000, $500,000 and $1,000,000 Goals in that order, each with name, status and bar
- **AND** "All goals →" links to the Goals page

#### Scenario: GO-14 No Goals card when nothing is unreached
- **GIVEN** a User with Holdings and `<goals>`
- **WHEN** the User opens the Overview
- **THEN** no Goals card is shown

Examples:

| goals |
|---|
| no Goals |
| only Reached Goals |

### Requirement: The Overview chart offers every Goal as a labelled goal line
The Overview chart SHALL be given every Goal as a goal line at its target, labelled with its displayed name. The chart's own rule decides which lines are near enough to draw; each drawn line is dotted and labelled.

#### Scenario: GO-15 Every Goal becomes a goal line
- **GIVEN** Goals "Quarter million" $250,000 and a blank-named $500,000 Goal
- **WHEN** the Overview is built
- **THEN** the chart is given goal lines at $250,000 labelled "Quarter million" and at $500,000 labelled "$500K net worth"

#### Scenario: GO-16 A nearby Goal is drawn and a distant one is not
- **GIVEN** Net Worth shown on the Overview chart between $100,000 and $400,000, and Goals "Quarter million" $250,000 and "Ten million" $10,000,000
- **WHEN** the User opens the Overview
- **THEN** the chart shows a dotted line labelled "Quarter million"
- **AND** no line labelled "Ten million"

### Requirement: The Goals nav item links to the Goals page and shows the count
The Goals nav item SHALL link to the Goals page in the sidebar, the tablet tabs and the phone tab bar. The sidebar and the phone tab bar SHALL show the number of Goals beside it, including 0.

#### Scenario: GO-17 Nav item and Goal count
- **GIVEN** a User with `<count>` Goals
- **WHEN** any page renders the nav
- **THEN** the Goals item links to the Goals page and shows `<shown>` in the sidebar and the phone tab bar

Examples:

| count | shown |
|---|---|
| 0 | 0 |
| 4 | 4 |
