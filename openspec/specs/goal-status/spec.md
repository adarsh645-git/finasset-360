# goal-status Specification

## Purpose
Derives a Goal's status (Reached, Projected or Beyond the N-year projection) and its progress from one monthly Net Worth series. Goals themselves never store a date.

## Requirements

### Requirement: A Goal's date is the first month Net Worth reaches its target
Given one nominal USD Net Worth series (recorded history, then the Projection over the User's horizon) with today's position marked, a Goal's status SHALL come from the first point where Net Worth ≥ the target:
- **Reached** at that point's month if it is today or earlier;
- **Projected** at that month, with the months from today, if it is later;
- **Beyond** the N-year projection, N being the horizon, if no point reaches it.

#### Scenario: GS-01 Status from where the target is first reached
- **GIVEN** a Net Worth series reaching $150,000 first in `<first month>`, today being Oct 2026, and a horizon of 10 years
- **WHEN** the status of a Goal with target $150,000 is derived
- **THEN** it is `<status>`

Examples:

| first month | status |
|---|---|
| Mar 2025 | Reached Mar 2025 |
| Oct 2026 | Reached Oct 2026 |
| Apr 2029 | Projected Apr 2029, 30 months from today |
| never | Beyond the 10-year projection |

#### Scenario: GS-02 A target equal to today's Net Worth is reached today
- **GIVEN** a Net Worth series whose only point at or above $250,000 is today, at exactly $250,000
- **WHEN** the status of a Goal with target $250,000 is derived
- **THEN** it is Reached in the current month

#### Scenario: GS-03 Reached sticks after a dip
- **GIVEN** a Net Worth series that reached $150,000 in Mar 2025 and is $140,000 today
- **WHEN** the status of a Goal with target $150,000 is derived
- **THEN** it is Reached Mar 2025

### Requirement: Goal progress is today's Net Worth over the target, clamped
A Goal's progress SHALL be today's Net Worth ÷ its target, clamped to the range 0 to 1. Negative Net Worth gives 0, and Net Worth above the target gives 1.

#### Scenario: GS-04 Progress is clamped
- **GIVEN** today's Net Worth of `<net worth>`
- **WHEN** progress toward a Goal with target $150,000 is computed
- **THEN** it is `<progress>`

Examples:

| net worth | progress |
|---|---|
| 140000 | 0.9333 |
| 150000 | 1 |
| 400000 | 1 |
| −20000 | 0 |

#### Scenario: GS-05 Negative Net Worth projected to cross the target
- **GIVEN** today's Net Worth of −$20,000, projected to reach $50,000 in Jan 2031
- **WHEN** a Goal with target $50,000 is derived
- **THEN** its status is Projected Jan 2031 and its progress is 0
