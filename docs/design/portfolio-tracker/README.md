# Handoff: Portfolio & Net Worth Tracker

## How to use this with Claude Code (existing project)

1. Copy this folder into the root of your existing repo (e.g. `/design_handoff_portfolio_tracker`).
2. Open Claude Code in that repo and paste:

```
Read design_handoff_portfolio_tracker/README.md and open
design_handoff_portfolio_tracker/Portfolio Tracker.dc.html (the design reference).

Our app already does something similar. First, survey our codebase and write a short
gap analysis: for each screen and behavior in the README, say whether we already have it,
have it partially, or are missing it, and which files are involved. Map our data model
to the one in "Data model" below and list mismatches.

Then propose an implementation plan in small, reviewable steps (data model changes first,
then calculations, then screens, then responsive behavior for phone/tablet). Reuse our existing components, styling system,
routing and state management — do not copy the prototype's inline styles or its runtime.
Wait for my approval before changing code.
```

3. Approve or adjust the plan, then let it implement step by step.

## Overview
A personal balance-sheet app: track assets (cash, stocks, real estate, crypto, metals, vehicles) and liabilities (generic loans, credit cards) held in **two countries (US and India)**, roll everything up to **USD**, see how net worth and **equity** (asset value − linked loan) grow over time, and project forward with **per-country growth and inflation assumptions**.

## About the design files
`Portfolio Tracker.dc.html` is a **design reference built in HTML**: a working prototype that shows the intended look and behavior. It is not production code. Recreate it in the target codebase using that codebase's framework, components and patterns. The prototype uses a small custom runtime (`support.js`) only so the file can be opened in a browser. Do not port it.

Open the file directly in Chrome. It is fully clickable and uses sample data. The Tweaks panel (if your viewer shows one) exposes: `classLayout` (A · Original / B · Table / C · Treemap), `fxRate` and `projectionYears`. **Layout A is the approved one.**

## Fidelity
**High fidelity** for layout, hierarchy, copy, interactions and calculations. For colors and typography, use the existing design system if your app has one. Otherwise use the tokens below.

---

## Data model

```ts
type Country = 'US' | 'IN';
type Currency = 'USD' | 'INR';           // derived from country
type AssetClass = 'cash' | 'stocks' | 'realestate' | 'crypto' | 'metals' | 'other';

interface Holding {                      // UI calls it "account", "property" or "asset" by class
  id: string;
  name: string;                          // e.g. "Fidelity Brokerage", "Pune apartment"
  sub?: string;                          // short description
  cls: AssetClass;
  country: Country;
  ccy: Currency;
  value: number;                         // current value, native currency (computed for stocks)
  cost?: number | null;                  // cost basis, native (computed for stocks)
  valueLog: { date: string; value: number }[];   // manual updates; "logged whenever you update"
  // stocks only
  positions?: Position[];
  // metals only
  units?: number; unit?: 'g' | 'oz t';
  // real estate only
  ptype?: 'Residential' | 'Land' | 'REIT / fund' | 'Commercial';
  city?: string;
}

interface Position {                     // a stock inside a brokerage account
  ticker: string;                        // Yahoo symbol, e.g. "AAPL", "INFY.NS"
  shares: number;
  avgCost: number;                       // per share, native
  // from market data (sample data in prototype): name, price, sector, exchange
}

interface Loan {
  id: string; name: string;
  country: Country; ccy: Currency;
  principal: number; balance: number;    // native
  rate: number;                          // APR %
  emi: number;                           // monthly payment, native
  termYears?: number | null;
  startDate: string;
  linkedHoldingId?: string;              // optional; enables equity tracking
  revolving?: boolean;                   // credit cards
}

interface Goal { id: string; name: string; target: number /* USD net worth */ }

interface Assumptions {
  US:  { inflation: number; realestate: number; stocks: number; cash: number };
  IN:  { inflation: number; realestate: number; stocks: number; cash: number };
  common: { crypto: number; metals: number; other: number };   // shared across countries
}
// defaults: US 3 / 4 / 7 / 3.5, IN 5 / 6 / 11 / 6.5, common 5 / 4 / -9  (% per year)
```

**Sectors:** Technology, Financials, Healthcare, Energy, Consumer Discretionary, Consumer Staples, Communication Services, Industrials, Utilities, Materials, Real Estate, Other.

## Calculations
- **USD roll-up:** `usd = native / fxINRperUSD` for INR items. Show the native amount as secondary text (`₹62,00,000`, Indian digit grouping via `en-IN`).
- **Stock account value** = Σ shares × price. **Cost** = Σ shares × avgCost.
- **Equity** (per financed asset) = asset USD value − linked loan USD balance. "% owned" = equity / value.
- **Net worth** = Σ assets − Σ liabilities (USD).
- **Projection** (monthly, N years, default 10): assets compound at their rate (country rate for cash/stocks/real estate, common rate otherwise): `v × (1+r)^(months/12)`. Loans amortize: `b = b×(1+apr/12) − emi` until 0. The payoff month is when b hits 0; if EMI ≤ interest, show "Not on track". FX is held flat at today's rate (call this out; a future option is a ₹ depreciation assumption).
- **Today's dollars:** deflate each **country's** series by its own inflation, then sum: `v / (1+infl_country)^((t−now)/12)`. This restates past values upward and future values downward.
- **Change attribution** (Growth page, for the selected range and country):
  - asset growth & savings = Σ (native_now − native_then) / fx_then
  - debt paid down = Σ (balance_then − balance_now) / fx_then
  - currency effect = Σ native_now × (1/fx_now − 1/fx_then), with assets positive and INR loans negative
  - These three add exactly to the net worth change.
- **Goal date** = first projected month where net worth ≥ target. Status reads "Reached ⟨date⟩", "Projected ⟨date⟩ · in N yrs" or "Beyond the N-year projection".

---

## Screens

### Shell
- Left **sidebar** (240px, sticky) on desktop. Tablet: top bar + scrolling tabs. Phone: top bar + bottom tab bar (see Responsive behavior).
- Sidebar contents: brand, net worth with 12-month change, nav (Overview, Assets, Liabilities, Growth, Goals; Assets and Liabilities show compact totals), an "Asset classes" sub-list with color dot and total, "+ Add account or asset", and a light/dark toggle (persisted).

### 1. Overview
- Header: "Net worth · rolled up to USD", big number, change and % since the range start. Controls: range 1Y / 3Y / 5Y / All, and a projection toggle.
- **Net worth chart:** area plus line. The projection is dashed with a shaded region and a "Today → projected" marker. Goal lines are dotted and labelled. Hover tooltip shows net worth, assets and liabilities.
- Three stat cards (clickable): Total assets, Liabilities (paid down in 12 mo), Equity built.
- Left column: **Allocation** (stacked bar plus rows: class, count, value, share, 12-month change; rows go to the class page) and **Equity in financed assets** (per linked pair: equity, an owned bar where red = loan share, "value − loan").
- Right column: **Where it's held** (US / India: net, assets, debt, share bar), a **Currency effect, 12 mo** line with explainer, and **Goals** (the next 3 unmet goals with progress).

### 2. Assets
- Class **tiles** act as filters (click again to clear).
- A single card with "Group by: Class | Country | None", Collapse/Expand all, and search (matches name, description, city, tickers and company names).
- Collapsible group headers (count with the right noun, share, total). Compact one-line rows: name + description, country badge, native value, USD, gain (USD + %).

### 3. Asset class page (layout A, approved)
- Breadcrumb, class name, total, 12-month change, share of assets and the projected rate(s). Actions: projection toggle, "+ Add to ⟨class⟩".
- Full-size class chart with projection.
- **Stocks:** one **Positions** card with a toggle **By sector | All positions** and a sector distribution bar.
  - *By sector:* a column header row (Sector / stock · Shares · Price · Value (USD) · Gain · % of stocks). Collapsible sector rows (chevron, color, name, "N stocks · tickers", value, gain, share) expand to their stocks. Columns align between sector rows and stock rows. Expand/Collapse all.
  - *All positions:* a flat table (Ticker + exchange + name · account, Sector, Shares, Price, Value, Gain, Weight).
  - Clicking a stock opens the **position drawer** (below).
- **Real estate:** two distribution cards, **By property type** and **By location** (stacked bar plus rows with value and %).
- Then the table of accounts/properties in the class.

### 4. Account / asset / property detail
- Breadcrumb, name, country and currency badges, kind tag ("Brokerage account", "Property", "Account" or "Asset").
- Big USD value. Native line: "₹… at ₹83.40/$ · description".
- Actions: **Update value** (or **Edit positions** for brokerage), Edit, Delete (click twice to confirm).
- Stat cards: Property (type, city), Cost basis, Unrealized gain, Quantity (metals: units and per-unit price), 12-month change, Currency effect 12 mo (INR only), Your equity (if a loan is linked).
- Brokerage: **Positions in this account** (rows open the drawer) and **By sector** for that account.
- Linked loan card (goes to the loan).
- Chart: value over time. With a linked loan it shows the value line, the loan balance line and the shaded gap labelled as equity.
- **Value log:** date, value and change since the previous entry.

### 5. Position drawer (right side, 400px)
- Ticker (mono), exchange, close button. Company name, sector dot and the account it's held in.
- Big USD value, with the native or "shares × price" line.
- 2×3 stats: Price, Shares, Avg cost, Cost basis, Unrealized gain (colored), Weight in stocks.
- Primary button **Open on Yahoo Finance ↗**, linking to `https://finance.yahoo.com/quote/{TICKER}` in a new tab. Indian tickers use the `.NS` suffix.
- Secondary button "View ⟨account⟩".

### 6. Liabilities
- Total, plus "paid down in 12 mo". Stats: Monthly payments (USD), Weighted rate, Debt-free date, Interest remaining.
- **Payoff timeline:** balances stacked by loan, history plus projection.
- Loan rows: color, name, country, USD (+ native), paid-off bar, "N% paid · rate · EMI/mo", "Secures ⟨asset⟩ · Paid off ⟨date⟩".

### 7. Loan detail
- Balance (USD + native), paid-off bar ("N% of principal paid off · ₹… borrowed in ⟨date⟩").
- Stats: Interest rate, Monthly payment, Projected payoff, Interest remaining.
- Chart: balance history and projection, plus the linked asset value line.
- "Secured against" card showing equity.

### 8. Growth
- Header: net worth change for the range and **country scope**. Controls: **All | United States | India**, range, projection toggle.
- Chart card. The title sits on its own row; controls go on the row below it so layout never shifts:
  - Mode: **Simple** (net worth bold line, assets light area, "Owed" red line, all positive axis) / **By asset class** (light stacked class layers, Owed line, net worth line) / **By country** (per-country net worth lines plus bold total).
  - **Nominal | Today's dollars.**
  - The subtitle explains the basis (e.g. "Each country restated in Oct 2026 dollars at its own inflation: US 3.0%, India 5.0%").
  - Right-edge value labels for key lines. The legend sits **below** the chart.
- **Projection assumptions:** a country tab (United States | India) with Inflation, Real estate, Stocks and Cash inputs (%/yr, with amount held per country). A "Shared across countries" section holds Crypto, Metals and Vehicles & other. A footer shows net worth by the end year (nominal), the same in today's dollars, and the amount lost to inflation. Reset defaults.
- **Where the change came from:** waterfall rows (start, asset growth & savings, debt paid down, currency ₹→$ (India in scope only), today).
- **Year by year:** net worth, debt and % change at each year end.

### 9. Goals
- Goal cards: name, status (Reached / Projected / Beyond), current vs target, progress bar, Remove. An inline form adds a goal (name + target USD).

### 10. Add / edit modal
- Asset | Liability toggle (add mode).
- **Asset:** class chips, Name (label adapts: Account name / Property name), Held in (US · $ / India · ₹).
  - *Stocks:* a positions editor. Each row has Ticker / Shares / Avg cost / Add (Enter adds). Ticker lookup previews "name · sector · price · exchange". Unknown tickers ask for price and sector. India auto-appends `.NS`. Running total. Removable rows.
  - *Real estate:* property type chips and city.
  - *Metals:* quantity and unit (Grams / Troy oz).
  - *Others:* current value and cost basis (optional).
- **Liability:** current balance, original principal, rate % APR, EMI, term years (optional), linked asset (optional, with the note that linking enables equity tracking).
- **Update value** mode: a single large value input, "Was ⟨old⟩ · logged as today's value".
- Validation messages appear inline in the footer.

## Responsive behavior (phones & tablets)
Three breakpoints, by viewport width:
- **Phone (< 640px):** compact sticky top bar (logo, Dark/Light, + Add) and a **fixed bottom tab bar** (Overview, Assets, Liabilities, Growth, Goals, each with a compact total and an active indicator bar on top; respects `env(safe-area-inset-bottom)`). Content gets about 76px of bottom spacing.
- **Tablet (640–1023px):** sticky top bar plus a horizontally scrolling tab row. Tables keep all columns.
- **Desktop (≥ 1024px):** 240px sticky sidebar.

Other rules:
- Two-column sections (Overview, Growth, account detail) stack whenever the content area (viewport minus the sidebar) is under 820px.
- **Phone tables** drop secondary columns: shares, gain, weight, country, native value, and the 12-month delta on allocation rows. Sector rows put "% of stocks" in their subtitle.
- **Charts on phone:** height × 0.78, y-axis 36px, right-edge value labels hidden. Touch: tap or drag shows the tooltip, which clears about 1.8s after release. `touch-action: pan-y` keeps vertical scrolling working.
- **Add/edit modal** becomes a **bottom sheet** on phone (full width, top radius 16, max-height 92vh, scrolls internally).
- **Position drawer:** `width: min(400px, 100%)`.
- **Touch targets:** buttons and selects are at least 40px tall on coarse pointers or phone widths. Inputs are 16px on phone to prevent iOS zoom.
- Grids use `repeat(auto-fit, minmax(...))`, so cards reflow naturally.

## Interactions summary
- Every list row is clickable, with a hover background. Breadcrumbs navigate.
- Charts: crosshair hover tooltip (date, "· projected" suffix, rows with color dots), dots on lines, dashed after today.
- Projection on/off is shared across all charts.
- Theme: light/dark via CSS variables, persisted.
- Responsive: see “Responsive behavior” above.

## Design tokens (fallback if no design system)
- Fonts: **Geist** (UI), **Geist Mono** (labels, tickers, axis). Numbers use `tabular-nums`.
- Light: bg `#f6f5f1`, panel `#ffffff`, ink `#1b1b19`, ink2 `#5c5b56`, ink3 `#76756f`, line `rgba(27,27,25,.08)`, line2 `rgba(27,27,25,.16)`, pos `oklch(0.55 0.13 150)`, neg `oklch(0.56 0.16 28)`.
- Dark: bg `#121211`, panel `#1a1a18`, ink `#edece7`, ink2 `#acaba5`, ink3 `#8d8c86`, pos `oklch(0.74 0.14 150)`, neg `oklch(0.71 0.15 28)`.
- Class colors: Real estate `oklch(.70 .11 65)`, Stocks `oklch(.62 .12 255)`, Cash `oklch(.68 .10 175)`, Crypto `oklch(.62 .12 305)`, Metals `oklch(.78 .11 95)`, Vehicles & other `oklch(.66 .04 250)`.
- Country colors: US `oklch(.62 .10 250)`, India `oklch(.72 .12 60)`.
- Radius: cards 14, inner cards 10–12, buttons 9, chips 999. Card padding 20. Section gap 16, grid gap 12.
- Type: hero number 40–56/500/−0.035em; page number 32–44; card title 15/600; body 13–13.5; labels 10.5–11 mono uppercase with .06em tracking.

## Not in the prototype (needs real implementation)
- Market data API for quotes, sector and exchange (the prototype uses a hard-coded sample table).
- Live FX rate and historical FX.
- Persistence (the prototype resets on reload), auth, and a stored value-log history.

## Files
- `Portfolio Tracker.dc.html`: the full prototype (all screens, logic and sample data in one file).
- `support.js`: runtime needed only to open the prototype in a browser.
