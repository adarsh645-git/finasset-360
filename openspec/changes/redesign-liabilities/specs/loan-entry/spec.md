# loan-entry

## Purpose

How a User adds, edits and updates a loan: the Liability side of the shared add/edit modal, its fields, defaults and validation copy, the choice of linked Holding, and the Update balance mode that records today's balance.

## ADDED Requirements

### Requirement: The add modal switches between Asset and Liability
In add mode the modal SHALL show an "Asset | Liability" toggle above the form, titled "Add to portfolio". Choosing Liability SHALL show the loan form with the save button "Add loan". Name and Held in SHALL carry over when switching. Edit and update modes SHALL show no toggle.

#### Scenario: LE-01 Toggling to the loan form
- **GIVEN** the add modal open on the Asset side with name "Car loan" and Held in United States
- **WHEN** the User chooses Liability
- **THEN** the loan form shows with "Loan name" "Car loan", Held in United States and the save button "Add loan"
- **AND** the toggle still reads "Asset | Liability" with Liability selected

### Requirement: The loan form has the mockup's fields and defaults
The loan form SHALL have Loan name, Held in (United States · $ / India · ₹), Current balance, Original principal (optional), Interest rate (% APR), Monthly payment / EMI, Borrowed in (month), Term (years, optional), Linked asset (optional) and a "Credit card (revolving)" checkbox. Borrowed in SHALL default to this month and accept no later month; revolving SHALL default to off.

#### Scenario: LE-02 A fresh loan form
- **GIVEN** today is 2026-10-14
- **WHEN** the loan form opens in add mode
- **THEN** Held in is United States, Borrowed in is October 2026 and the revolving checkbox is off
- **AND** Monthly payment carries the hint "What you pay toward the loan each month, including any regular extra. Leave out escrow (taxes and insurance)."
- **AND** the form ends with "Link a loan to the asset it financed and equity (value − balance) is tracked automatically."

### Requirement: Saving validates in the mockup's order with its copy
Saving SHALL check, in order: a non-blank name ("Give it a name"), balance ≥ 0 ("Enter the current balance"), APR ≥ 0 ("Enter the interest rate"), and Monthly payment > 0 ("Enter the monthly payment"). The first failure SHALL show in the modal footer and nothing is saved. Amounts SHALL accept commas, spaces, `$` and `₹`.

#### Scenario: LE-03 Validation messages
- **GIVEN** the loan form with name `<name>`, balance `<balance>`, APR `<apr>` and Monthly payment `<payment>`
- **WHEN** the User saves
- **THEN** the footer reads `<message>`

Examples:

| name | balance | apr | payment | message |
|---|---|---|---|---|
| (blank) | 9100 | 5.9 | 501 | Give it a name |
| Auto loan | (blank) | 5.9 | 501 | Enter the current balance |
| Auto loan | 9100 | (blank) | 501 | Enter the interest rate |
| Auto loan | 9100 | 5.9 | 0 | Enter the monthly payment |
| Auto loan | ₹ 34,30,000 | 8.5 | 33,000 | (none, saved) |

### Requirement: Principal defaults to the balance
A blank principal SHALL be saved as the balance. A principal below the balance SHALL be saved as the balance. A blank term SHALL be saved as no term.

#### Scenario: LE-04 Principal and term on save
- **GIVEN** the loan form with balance 9,100, principal `<principal>` and term `<term>`
- **WHEN** the User saves
- **THEN** the loan's principal is `<saved>` and its term is `<saved term>`

Examples:

| principal | term | saved | saved term |
|---|---|---|---|
| (blank) | (blank) | 9100 | none |
| 26000 | 5 | 26000 | 5 years |
| 5000 | (blank) | 9100 | none |

### Requirement: Adding a loan opens its Loan detail
A successful add SHALL create the loan with today's balance as its first Valuation, close the modal and open the new loan's Loan detail. A failed save SHALL keep the modal open with the error in the footer.

#### Scenario: LE-05 Adding a loan
- **GIVEN** the loan form filled with "Auto loan · Honda Financial", United States, balance 9,100, principal 26,000, APR 5.9, payment 501 and Borrowed in March 2024
- **WHEN** the User saves
- **THEN** the Loan detail of "Auto loan · Honda Financial" is shown with "$9,100" and "65% of principal paid off"
- **AND** it is not Stale

### Requirement: A loan can secure one Holding that no other loan secures
Linked asset SHALL offer "None" and every active Holding of the User not already linked from another active loan, by name; when editing, the loan's own Holding is offered too.

#### Scenario: LE-06 Linked asset options
- **GIVEN** active Holdings "Austin condo", "Pune apartment" (secured by loan L1) and "Honda CR-V", and an archived Holding "Old car"
- **WHEN** the loan form opens `<mode>`
- **THEN** Linked asset offers `<options>`

Examples:

| mode | options |
|---|---|
| to add a loan | None, Austin condo, Honda CR-V |
| to edit L1 | None, Austin condo, Honda CR-V, Pune apartment |

### Requirement: Edit loan pre-fills the form and records today's balance
Edit SHALL open the modal titled "Edit loan" with every field pre-filled, Held in fixed, and the save button "Save". Saving SHALL record the balance as today's Valuation, even when unchanged, and keep the User on the Loan detail.

#### Scenario: LE-07 Editing a Stale loan
- **GIVEN** a revolving US loan "Amex Gold card" whose latest Valuation of $1,850 is 47 days old
- **WHEN** the User opens Edit, changes nothing and saves
- **THEN** the form showed balance 1850, APR 24.9, payment 150 and revolving on, with Held in not changeable
- **AND** the Loan detail shows no stale cue

### Requirement: Update balance records today's balance
Update balance SHALL open the modal titled "Update balance" with one input, "Current balance of ⟨name⟩", pre-filled with the current balance and the line "Was ⟨native balance⟩ · logged as today’s value, ⟨Mon D, YYYY⟩". Saving SHALL record today's Valuation, even when unchanged; a second save the same day replaces it. A blank or negative balance SHALL show "Enter the current balance".

#### Scenario: LE-08 Updating a balance
- **GIVEN** today is 2026-10-14 and an India loan with balance ₹34,30,000 last recorded 40 days ago
- **WHEN** the User opens Update balance, enters 34,02,000 and saves
- **THEN** the modal had read "Was ₹34,30,000 · logged as today’s value, Oct 14, 2026"
- **AND** the Loan detail shows "₹34,02,000 at ₹83.40/$" with no stale cue

### Requirement: The add links open the loan form
"+ Add loan" on the Liabilities page, "Add loan" in its empty state, and the Overview first-run card's "or a loan" link SHALL open the add modal on its Liability side.

#### Scenario: LE-09 Every add-loan link opens the loan form
- **GIVEN** `<surface>`
- **WHEN** the User follows its add-loan link
- **THEN** the add modal opens on the Liability side

Examples:

| surface |
|---|
| the Liabilities page with loans ("+ Add loan") |
| the empty Liabilities page ("Add loan") |
| the Overview first-run card ("or a loan") |
