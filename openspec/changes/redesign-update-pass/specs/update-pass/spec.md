# update-pass

## Purpose

Lets the User clear every Stale Holding and Liability in one sitting: a guided pass, oldest first, over each item's own update form, ending with how Net Worth moved. Nothing about a pass is stored except the Valuations it saves.

## ADDED Requirements

### Requirement: The Needs updating card offers "Update all (N)"
When the Overview's Needs updating card is shown, it SHALL offer "Update all (N)", where N is the number of Stale items. It SHALL start a pass at step 1 on the oldest Stale item and carry today's Net Worth as the pass's starting figure. With nothing Stale there is no card and so no button.

#### Scenario: UP-01 Update all starts a pass on the oldest Stale item
- **GIVEN** three Stale items: a Cash Holding 90 days old, a Liability 45 days old and a Real estate Holding 31 days old
- **AND** Net Worth today is $1,284,300
- **WHEN** the User views the Overview
- **THEN** the Needs updating card offers "Update all (3)"
- **AND** it opens Update value for the Cash Holding as step 1, with $1,284,300 as the starting Net Worth

#### Scenario: UP-02 No Stale items, no Update all
- **GIVEN** a Portfolio where nothing is Stale
- **WHEN** the User views the Overview
- **THEN** neither the Needs updating card nor "Update all" is shown

### Requirement: Each step opens the item's own update form, pre-filled
Each step SHALL open the update form for that item's kind, pre-filled with its current figures: Update value for a manually valued Holding, Edit positions for a Stocks Holding, and the balance edit for a Liability. Items SHALL run in the Needs updating card's order: oldest first, then by name. The step SHALL show the counter "i of N".

#### Scenario: UP-03 The form matches the kind of item
- **GIVEN** a pass whose current step is `<item>`
- **WHEN** the step opens
- **THEN** the `<form>` is shown, pre-filled with `<prefill>`

Examples:

| item | form | prefill |
|---|---|---|
| a Cash Holding in India whose current value is ₹4,00,000 | Update value | ₹4,00,000 |
| a Stocks Holding with a Hand Price 47 days old | Edit positions | its current Positions |
| a Liability whose current balance is $212,400 | balance edit | $212,400 |

#### Scenario: UP-04 Items run oldest first, then by name, with an "i of N" counter
- **GIVEN** Stale items "Wells Fargo cash" 90 days old, "Amex Gold card" and "Pune apartment" both 45 days old
- **WHEN** the User starts the pass
- **THEN** step 1 shows "Wells Fargo cash" with "1 of 3"
- **AND** "Amex Gold card" follows as "2 of 3", then "Pune apartment" as "3 of 3"

### Requirement: Save & next records today's figure and moves on
"Save & next" SHALL be the step's default action, so Enter confirms. It SHALL save through the item's normal update. An unchanged figure still records today's Valuation, so the item stops being Stale. The pass SHALL then open the next item, or the summary after the last one. If the save is rejected, the step SHALL stay put with the error in the footer.

#### Scenario: UP-05 Confirming an unchanged value clears Stale and moves on
- **GIVEN** step 1 of 3 shows a Cash Holding 90 days old, worth $18,000
- **WHEN** the User confirms with Save & next without changing the value
- **THEN** a Valuation of $18,000 dated today is recorded and the Holding is no longer Stale
- **AND** step 2 of 3 opens on the next oldest Stale item

#### Scenario: UP-06 Save & next on the last item opens the summary
- **GIVEN** step 3 of 3
- **WHEN** the User confirms with Save & next
- **THEN** the summary step opens

#### Scenario: UP-07 A rejected save keeps the step
- **GIVEN** step 2 of 3 shows Update value
- **WHEN** the User clears the value and confirms
- **THEN** the footer shows the validation error
- **AND** the pass stays on step 2 of 3 and nothing is recorded

#### Scenario: UP-08 Save & next is the default action and Skip is not
- **GIVEN** any pass step
- **WHEN** the step is rendered
- **THEN** Save & next submits the step's form, so Enter confirms
- **AND** Skip doesn't submit it

### Requirement: Skip moves on without recording
"Skip" SHALL open the next step without saving. The skipped item SHALL stay Stale and stay on the Needs updating card, and SHALL NOT be offered again in the same pass.

#### Scenario: UP-09 Skipping leaves the item Stale
- **GIVEN** step 1 of 3 shows a Liability 90 days old
- **WHEN** the User skips it
- **THEN** no Valuation is recorded and the Liability is still Stale
- **AND** step 2 of 3 opens on the next oldest Stale item

#### Scenario: UP-10 A skipped item isn't offered again in the pass
- **GIVEN** Stale items A, B and C, oldest first
- **AND** the User skipped A at step 1 and saved B at step 2
- **WHEN** the User confirms C at step 3 of 3
- **THEN** the summary step opens, with A not offered again

### Requirement: Leaving keeps what was saved and nothing else
Esc, the close button or Back SHALL leave the pass from any step and close the modal. Every save already made stays recorded. Items not reached stay Stale, and "Update all" later starts a new pass over whatever is still Stale.

#### Scenario: UP-11 Leaving mid-pass, then starting again
- **GIVEN** a pass over three Stale items in which the User saved step 1
- **WHEN** the User leaves at step 2
- **THEN** the modal closes and the first item's Valuation stays recorded
- **AND** the Needs updating card offers "Update all (2)", starting on the oldest remaining Stale item

### Requirement: Each step follows the live Stale list
Each step SHALL read the Stale items as they are now, not a list frozen at the start. The next item is the first Stale item after the current one, in card order. N is the steps already taken plus the Stale items from the current one on. If the current item is no longer Stale, the next item is the oldest Stale item, and N is i plus the number of Stale items.

#### Scenario: UP-12 An item updated elsewhere drops out
- **GIVEN** step 1 of 3, and the third item's value is updated outside the pass
- **WHEN** the User confirms step 1 with Save & next
- **THEN** step 2 of 2 opens on the second item

#### Scenario: UP-13 A step whose item is no longer Stale
- **GIVEN** step 2 of a pass names an item that was already updated today, and Stale items A and B remain
- **WHEN** the User confirms that step with Save & next
- **THEN** step 3 of 4 opens on A, the oldest Stale item

### Requirement: Confirming a Stocks step re-dates its Hand Prices
Confirming the Edit positions step in a pass SHALL save the Positions as shown and confirm every Hand Price, dating each as today even when unchanged, so the Stocks Holding is no longer Stale. A plain Edit positions save outside a pass SHALL re-date only Hand Prices whose price changed.

#### Scenario: UP-14 Confirming unchanged Positions in a pass clears staleness
- **GIVEN** a Stocks Holding whose Hand Prices are 10 and 47 days old
- **WHEN** the User saves its Positions without changes `<where>`
- **THEN** its Hand Prices are dated `<dates>` with their prices unchanged
- **AND** the Holding is Stale: `<stale>`

Examples:

| where | dates | stale |
|---|---|---|
| with Save & next in a pass | today, both | false |
| with Save outside a pass | 10 and 47 days ago, as before | true |

### Requirement: The summary shows how Net Worth moved, unstored
The summary step SHALL show "Net worth $X → $Y (±$Z)". X is the starting Net Worth the pass carries, Y is today's Net Worth now, and Z = Y − X in whole dollars. It SHALL say how many items are still Stale, if any. Nothing about the pass SHALL be stored. Without a starting figure, the summary SHALL show only today's Net Worth.

#### Scenario: UP-15 The Net Worth line
- **GIVEN** a pass that started at a Net Worth of `<from>`
- **AND** Net Worth is now `<now>`
- **WHEN** the summary step opens
- **THEN** it shows `<line>`

Examples:

| from | now | line |
|---|---|---|
| $1,284,300 | $1,291,050 | Net worth $1,284,300 → $1,291,050 (+$6,750) |
| $1,291,050 | $1,288,900 | Net worth $1,291,050 → $1,288,900 (−$2,150) |

#### Scenario: UP-16 Items still Stale are counted
- **GIVEN** a pass in which `<skipped>` items were skipped and nothing else is Stale
- **WHEN** the summary step opens
- **THEN** it shows `<note>`

Examples:

| skipped | note |
|---|---|
| 0 | no "still need updating" line |
| 1 | 1 item still needs updating |
| 2 | 2 items still need updating |

#### Scenario: UP-17 No starting figure
- **GIVEN** a summary step opened without the starting Net Worth
- **AND** Net Worth is now $1,291,050
- **WHEN** it renders
- **THEN** it shows "Net worth $1,291,050" with no arrow or change
