# charts

## Purpose

One shared time-series chart that every screen uses, with the same axes, projection split, goal lines, tooltip, touch behaviour and phone rules. Pages pass series and never draw their own charts.

## ADDED Requirements

### Requirement: The y-axis uses nice ticks that cover every scaled series
The y-range SHALL cover every point of every series that counts toward the scale, including stacked bases, in the visible x-range. It SHALL be widened to a "nice" step (1, 2, 5 or 10 × a power of ten, about four steps), with ticks at each step. A flat series SHALL still get a non-zero range. Tick labels are compact amounts.

#### Scenario: CH-01 Ticks for a range of values
- **GIVEN** one series whose visible values run from $112,000 to $487,000
- **WHEN** the chart's axis is computed
- **THEN** the ticks are $100K, $200K, $300K, $400K and $500K

#### Scenario: CH-02 A flat or single-point series still gets an axis
- **GIVEN** one series with a single point of $0
- **WHEN** the chart's axis is computed
- **THEN** the y-range has a non-zero span with $0 on it, and nothing in the result is NaN

#### Scenario: CH-03 Tooltip-only series don't move the axis
- **GIVEN** a Net Worth series up to $500,000 and an assets series up to $900,000 that is marked tooltip-only (not drawn, not scaled)
- **WHEN** the chart's axis is computed
- **THEN** the top tick is $500K

### Requirement: Series draw as lines and areas, with optional stacked bases
A series SHALL draw as a line, an area filled down to zero, or both. An area with a base series SHALL fill between the base and itself, so that layers stack.

#### Scenario: CH-04 A stacked layer fills between its base and itself
- **GIVEN** a Cash layer of $10,000 stacked on a Stocks layer of $30,000 at every point
- **WHEN** the Cash layer's area is computed
- **THEN** its lower edge sits at $30,000 and its upper edge at $40,000

### Requirement: A stacked layer can show its own value
A series MAY carry its own tooltip values, separate from the values it is drawn at. Its tooltip row and end label SHALL then show those values, while the line or area is still drawn (and scaled) at the drawn values, so a stacked layer shows its own amount rather than the running total.

#### Scenario: CH-15 A stacked layer's tooltip shows its own value
- **GIVEN** a Cash layer drawn at $40,000 (stacked on Stocks at $30,000) whose own tooltip value is $10,000
- **WHEN** the pointer selects that point and the end labels are placed
- **THEN** the Cash tooltip row and end label read $10,000 and $10K, and its upper edge is still drawn at $40,000

### Requirement: A chart can force $0 onto its axis
A chart MAY require that the y-range include $0. Then the range SHALL reach down (or up) to 0 even when every value is far from it.

#### Scenario: CH-16 Zero is forced into the y-range
- **GIVEN** one series whose values run from $300,000 to $340,000, with zero forced
- **WHEN** the chart's axis is computed
- **THEN** the lowest tick is $0 and the highest is at least $340,000

### Requirement: The projection is dashed after today, in a shaded region with a marker
When today lies inside the visible x-range, every line SHALL be solid up to today and dashed after it. The area after today SHALL be shaded, with a vertical line at today labelled "Today → projected". When today is at the end of the range, nothing is dashed or shaded and there is no marker.

#### Scenario: CH-05 History is solid and the projection dashed
- **GIVEN** a series running from 2024-10 through 2036-10, with today at 2026-10-13
- **WHEN** the chart is laid out
- **THEN** the line is solid up to today and dashed after it, the region after today is shaded, and a "Today → projected" marker sits at today

#### Scenario: CH-06 With the projection off, the chart ends at today
- **GIVEN** the same series with the projection turned off
- **WHEN** the chart is laid out
- **THEN** the x-range ends at today, with no dashed segment, no shaded region and no marker

### Requirement: Projection on or off is one setting shared by every chart
The projection toggle SHALL be a single User setting that every chart obeys, kept across visits on the same browser, and on by default. Its label reads "N-yr projection on" (N being the User's horizon) or "Projection off".

#### Scenario: CH-07 The projection setting defaults to on and is remembered
- **GIVEN** a stored projection setting of `<stored>`
- **WHEN** a page with a chart is rendered
- **THEN** the projection is `<state>` and the toggle reads `<label>`, with a horizon of 10

Examples:

| stored | state | label |
|---|---|---|
| none | on | 10-yr projection on |
| on | on | 10-yr projection on |
| off | off | Projection off |

### Requirement: Goal lines are drawn when they fall near the data
Each goal line SHALL be a dotted horizontal line with its label at the left. A goal SHALL be drawn only when its target is at or above the visible minimum and no more than 1.15 × the visible maximum. A drawn goal widens the y-range to include it.

#### Scenario: CH-08 Only nearby goals are drawn
- **GIVEN** visible Net Worth from $100,000 to $400,000, and goals of $150,000, $450,000 and $1,000,000
- **WHEN** the chart is laid out
- **THEN** the $150,000 and $450,000 lines are drawn, the y-range reaches at least $450,000, and the $1,000,000 line is not drawn

### Requirement: The x-axis labels quarters for short spans and years for long ones
For a visible span of 30 months or less, the x-axis SHALL label every third month as "Mon ’YY". For longer spans it SHALL label January of each year, thinning to every 2nd year over 8 years and every 4th over 16.

#### Scenario: CH-09 X labels by span
- **GIVEN** a visible span of `<span>`
- **WHEN** the x-axis is labelled
- **THEN** the labels are `<labels>`

Examples:

| span | labels |
|---|---|
| Oct 2025 – Oct 2026 | Oct ’25, Jan ’26, Apr ’26, Jul ’26, Oct ’26 |
| Jan 2020 – Oct 2026 | 2020, 2021, 2022, 2023, 2024, 2025, 2026 |
| Jan 2018 – Oct 2036 | 2018, 2022, 2026, 2030, 2034 |

### Requirement: Right-edge labels show the last value of key series without overlapping
A series marked for an end label SHALL get a label at the right edge with its name and its compact value at the last visible point. The labels SHALL be pushed apart to at least 32px vertically. On phones there are no end labels.

#### Scenario: CH-10 End labels never overlap
- **GIVEN** two labelled series whose last points sit 10px apart
- **WHEN** the end labels are placed
- **THEN** the lower label sits 32px below the upper one, and each shows its series name and compact value

### Requirement: The crosshair tooltip shows the date and every named series
Pointing at or touching the chart SHALL pick the nearest point. It shows a crosshair, a dot on each line marked for dots, and a tooltip with the month ("Oct 2026", plus " · projected" after today) and one row per named series (colour dot, name, value), including series that aren't drawn.

#### Scenario: CH-11 Tooltip at a projected point
- **GIVEN** a chart with Net Worth, Assets and Liabilities series, with Assets and Liabilities not drawn, and today at Oct 2026
- **WHEN** the pointer is at the point for Mar 2029
- **THEN** the tooltip reads "Mar 2029 · projected", with rows Net worth, Assets and Liabilities and their values at Mar 2029

#### Scenario: CH-12 The pointer picks the nearest point
- **GIVEN** a chart whose points are at month-ends from Jan to Dec 2026
- **WHEN** the pointer is at `<fraction>` of the plot width
- **THEN** the selected point is `<month>`

Examples:

| fraction | month |
|---|---|
| 0 | Jan 2026 |
| 0.52 | Jul 2026 |
| 1 | Dec 2026 |

### Requirement: The chart works by touch without blocking scroll
On touch, a tap or drag SHALL show the tooltip at the touched point, and it SHALL clear about 1.8 seconds after the finger lifts. Vertical page scrolling SHALL keep working over the chart.

#### Scenario: CH-13 The touch tooltip clears after release
- **GIVEN** a chart showing a tooltip after a touch
- **WHEN** the finger lifts and 1.8 seconds pass
- **THEN** no point is selected

### Requirement: Charts shrink on phones
Below 640px a chart SHALL be 0.78 × its height, with a 36px y-axis and no end labels. The legend, when given, SHALL sit below the plot.

#### Scenario: CH-14 Phone rules are present in the chart's markup
- **GIVEN** a chart of height 270 with an end-labelled series and a legend
- **WHEN** it is rendered on the server
- **THEN** its markup carries the phone height of 211px and the 36px axis width for widths under 640px, marks the end labels as hidden there, and places the legend after the plot
