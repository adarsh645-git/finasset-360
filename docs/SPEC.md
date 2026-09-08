# FinAsset 360 — v1 build spec

Status: ready-for-agent
Tracker ticket: [`.scratch/asset-tracker-spec/issues/14-build-v1.md`](../.scratch/asset-tracker-spec/issues/14-build-v1.md)

Vocabulary in this document is the project's domain language — **User, Asset Class, Holding, Portfolio, Liability Class, Liability, Amortization Assumptions, Valuation, Net Worth, Live Estimate, Target Allocation, Projection, Target Net Worth, Required Contribution, Projected Net Position**. Definitions and `_Avoid_` lists are in [CONTEXT.md](../CONTEXT.md); consult it before naming anything, and update it inline if this build sharpens or adds a term. The three accepted ADRs ([0001](adr/0001-multi-tenant-open-signup.md), [0002](adr/0002-stack-choice.md), [0003](adr/0003-valuation-snapshots-not-ledger.md)) bound this work and are not reopened here.

## Problem Statement

Someone with a spread-out financial life — a house, a mortgage, equities across a couple of brokerages, some gold, cash in more than one currency, a card balance — has no single place that answers *what am I worth, and am I going to get where I want to be*. The information exists, but it lives in a dozen apps that each see one slice, none of which knows about the others, and none of which will net a mortgage against the house it financed.

A spreadsheet is the usual fallback, and it fails in specific ways. It goes stale silently, because nothing prompts the monthly pass and nothing shows which figures are old. It loses history: overwriting last month's cell erases the trend, so "how did my distribution shift over three years" becomes unanswerable. Multi-currency holdings get converted at whatever rate was current when the row was typed, and nothing records which rate that was, so historical totals quietly drift. Every live-priced holding — a stock, an ounce of gold — has to be looked up by hand. And the planning question, the one that actually motivates the exercise, needs formulas most people won't write correctly: a projection that grows assets and amortizes debts on separate rules, that knows a paid-off loan frees up cash, and that reports the answer in money that means something rather than in inflated future dollars.

The result is that people either don't track net worth at all, or track it in a way that's confidently wrong in ways they can't see.

## Solution

FinAsset 360 is a hosted, multi-tenant net-worth tracker and planner. A User signs in with Google, gets their own isolated Portfolio, and records what they own and owe as periodic Valuations — deliberate, dated snapshots that accumulate into a history rather than overwriting each other.

The app is built around a **monthly check-in**: a guided pass over Holdings that pre-fills the last recorded value so confirming an unchanged figure costs one keystroke, offers a one-key accept of the Live Estimate for anything with a market symbol, and ends by showing the Net Worth delta since the last pass. Between check-ins the User visits to look at their distribution against their Target Allocation. Both facts about the session rhythm come from the User directly: 10–30 Valuations updated in a monthly pass, plus several distribution-only visits a month.

Navigation is a Finder-style Miller-column browser — Portfolio and Plan as the two roots, drilling Asset Class → Holding, with the rightmost column as the detail panel. Below 900px that shape is replaced by an accordion outline with a bottom-sheet detail, because Miller columns are the shape most hostile to a phone.

The planning half is a single Plan page: a Target Allocation editor, one set of Projection assumptions, and a Target Net Worth. The Projection grows the Holdings total forward and projects each Liability on its own rule — flat by default, or amortized to payoff when the User fills in Amortization Assumptions — netting the two at each future point, so filling in a loan's rate visibly moves the Net Worth line. It computes entirely in nominal terms and deflates for display, charting both lines forking at today, and it answers the question the User actually has: *what would I need to contribute monthly to hit my target on time, and if I keep contributing what I contribute now, when do I actually get there?*

What it deliberately is not: a trading journal, a tax tool, a budgeting app, or an investment-research product. It records what things are worth; it does not reason about whether to own them.

## User Stories

### Account, tenancy, and setup

1. As a visitor, I want to sign in with my Google account without an invite or an approval step, so that I can start using the app the moment I find it.
2. As a new User, I want a Portfolio created for me automatically on first sign-in, so that I never see an empty setup wizard before I can record anything.
3. As a new User, I want to choose my home/display currency, so that aggregate figures read in the money I think in.
4. As a User, I want my data to be invisible and inaccessible to every other User at the database level, so that I don't have to trust the application layer to get isolation right.
5. As a User, I want to sign out, so that I can leave the app safely on a shared machine.
6. As a User, I want a set of sensible Asset Classes and Liability Classes to exist the moment I sign in, so that I can record my first Holding without first designing a taxonomy.
7. As a User, I want to add my own custom Asset Class, so that something the shipped defaults don't cover has a home.
8. As a User, I want to add my own custom Liability Class, so that a debt the defaults don't cover has a home.
9. As a User, I want my custom classes to be mine alone and never visible to other Users, so that my categories don't leak.
10. As a User, I want to be prevented from deleting an Asset Class that still has Holdings in it, so that I can't orphan history by accident.
11. As a User, I want a custom class with no icon of its own to still render with a neutral glyph, so that the interface never looks broken because I invented a category.

### Recording Holdings and Liabilities

12. As a User, I want to add a Holding under an Asset Class with a name and a currency, so that I can start tracking something I own.
13. As a User, I want to pick any ISO currency code for a Holding, so that a foreign-currency asset is recorded in its own money rather than pre-converted by me.
14. As a User, I want to attach a market symbol and a quantity to a Holding, so that the app can show me a Live Estimate instead of my having to look the price up.
15. As a User, I want to leave the symbol blank on something like a house, so that I'm not forced to invent a ticker for an asset that doesn't have one.
16. As a User, I want to add a Liability under a Liability Class with a name and a currency, so that what I owe is tracked alongside what I own.
17. As a User, I want to edit a Holding's or Liability's name, class, and currency after creating it, so that a typo or a reclassification isn't permanent.
18. As a User, I want to archive a Holding I've sold rather than delete it, so that my past distribution and Net Worth history stay accurate for the period I owned it.
19. As a User, I want archived Holdings excluded from my current Net Worth and distribution, so that a sold asset stops inflating today's figures.
20. As a User, I want archived Holdings still included in historical trend and distribution-over-time views, so that the chart doesn't retroactively rewrite the past.
21. As a User, I want a true delete available for something I entered by mistake, so that a typo'd Holding doesn't linger forever as an archived ghost.

### Recording Valuations

22. As a User, I want to click a Holding's value, type a new number, and press Enter, so that recording a Valuation costs one interaction rather than opening a form.
23. As a User, I want the Valuation I record to be dated today by default, so that the common case needs no date entry at all.
24. As a User, I want to backdate a Valuation, so that I can enter a figure I looked up last week without lying about when it was true.
25. As a User, I want re-recording a value on a day I already recorded to correct that day's figure rather than create a second one, so that one day means one snapshot.
26. As a User, I want the exchange rate to my home currency captured at the moment I record a Valuation, so that a historical total is computed with the rate that was true then, not with today's.
27. As a User, I want a Holding's full Valuation History shown as a table with a sparkline, so that I can see how it has moved without leaving the panel.
28. As a User, I want to record a Liability's balance the same way I record a Holding's value, so that debt tracking doesn't have a separate mental model.
29. As a User, I want to see how many days old a Valuation is, so that I know which figures I'm actually looking at.
30. As a User, I want Valuations older than 30 days to be visibly dimmed in the browser, so that staleness is apparent without my checking each date.
31. As a User, I want a list of everything older than 30 days on my dashboard, so that I know what to update without hunting.

### Live Estimates and the price cache

32. As a User, I want a Live Estimate shown for a Holding with a market symbol, computed as my quantity times the latest cached price, so that I can see roughly where it stands without recording anything.
33. As a User, I want the Live Estimate shown as clearly distinct from my recorded Valuation, so that I never mistake a convenience figure for something I've actually snapshotted.
34. As a User, I want the Live Estimate labelled with how it differs from my last Valuation, so that I can see at a glance whether recording is worth doing.
35. As a User, I want a one-click "use this" action on a Live Estimate, so that accepting the market figure records a Valuation without my retyping the number.
36. As a User, I want prices fetched once server-side and shared, so that the app's free-tier API budget isn't consumed by every tenant polling independently.
37. As a User, I want a cached price's age visible where the freshness matters, so that a once-daily refresh doesn't read as real-time.
38. As a User, I want a failed price fetch to leave the last good price in place rather than blanking it, so that one provider outage doesn't erase every Live Estimate.

### Check-in mode

39. As a User, I want to start a guided Check-in from the dashboard, so that my monthly pass has an obvious entry point.
40. As a User, I want to choose between checking in on everything and checking in only on what's stale, so that I can do a quick pass when that's all that's needed.
41. As a User, I want each Check-in step to show one Holding, pre-filled with its last recorded value, so that I confirm rather than retype.
42. As a User, I want pressing Enter on an unchanged value to advance without recording a new Valuation, so that confirming doesn't pollute my history with duplicate snapshots.
43. As a User, I want one key to accept the Live Estimate during Check-in, so that live-priced Holdings take a single keystroke.
44. As a User, I want progress shown as "12 of 27", so that I know how much of the pass is left.
45. As a User, I want Esc to leave Check-in at any point, so that an interrupted pass isn't a trap.
46. As a User, I want the pass to end with my Net Worth change since the last check-in, so that the chore delivers the answer I did it for.
47. As a User on a phone, I want Check-in's keyboard shortcuts replaced by real tap targets, so that the flow works where there is no keyboard.

### Net Worth and distribution

48. As a User, I want a Net Worth headline computed as current Holdings minus current Liabilities, so that the top-line answer is the first thing I see.
49. As a User, I want the headline broken into its Holdings and Liabilities components with an as-of date, so that I can see what the figure is made of and how current it is.
50. As a User, I want Net Worth visible persistently in the top strip, so that it stays readable after I've navigated away from the dashboard.
51. As a User, I want every figure converted to my home currency using the rate stored on each Valuation, so that a multi-currency Portfolio totals correctly and consistently.
52. As a User, I want my Portfolio's distribution across Asset Classes shown as horizontal bars, so that I can read the balance without decoding a pie chart.
53. As a User, I want my Target Allocation drawn as a tick on the same track as my actual allocation, so that goal and reality are compared on one axis.
54. As a User, I want the gap expressed in home-currency money as well as in percent, so that I know how much to move rather than only that I'm off.
55. As a User, I want a recorded Net Worth timeline built from my Valuation History, so that I can see the trend I've been accumulating.

### Liabilities and Amortization Assumptions

56. As a User, I want Liabilities as their own top-level branch grouped by Liability Class, so that debt mirrors the way my assets are organised.
57. As a User, I want to optionally record a Liability's interest rate, original amount, and term, so that the app can project its payoff instead of holding it flat.
58. As a User, I want to override the derived payment with the payment I actually make, so that a statement payment carrying escrow or PMI is modelled as I really pay it.
59. As a User, I want to record a recurring extra payment, so that I can see what paying more each month does to my payoff date.
60. As a User, I want to record the escrow portion of my payment, so that the app doesn't assume my property tax stops when the loan does.
61. As a User, I want Amortization Assumptions available on any Liability, not only a mortgage, so that an auto loan gets the same treatment.
62. As a User, I want a Liability without loan details simply held flat in the projection, so that the app never invents a payoff schedule I didn't tell it about.
63. As a User, I want a warning when the payment I entered won't cover the monthly interest, so that a negative-amortization typo is caught at entry rather than producing a growing balance.
64. As a User, I want to link a Liability to the Holding it financed, so that the pair can be read together.
65. As a User, I want the Projected Net Position of a linked pair shown from both sides of the link, so that I find it whether I'm looking at the house or at the mortgage.
66. As a User, I want a Liability's payoff drawn as a curve in its detail panel, so that the schedule is legible without my reading a table.

### Projection

67. As a User, I want to set one annual growth rate for my Portfolio, so that the projection has an assumption to run on without my tuning a rate per Asset Class.
68. As a User, I want to set one monthly contribution amount, so that the projection knows what I'm adding.
69. As a User, I want helper text on the contribution field reminding me to include my employer match, so that the single largest thing people forget is prompted for.
70. As a User, I want to set an annual escalation rate for my contribution, so that the projection reflects my saving more over time rather than the same amount for twenty years.
71. As a User, I want the escalation rate to default to zero, so that ignoring the field produces the conservative answer rather than a silently optimistic one.
72. As a User, I want to set a projection horizon in years, so that I can look as far ahead as I care about.
73. As a User, I want the projection to grow my Holdings total and project each Liability separately, then net them, so that my loan details actually move the Net Worth line.
74. As a User, I want a paid-off loan's freed payment added to my monthly contribution from that point on, so that the projection reflects the cash that genuinely becomes available.
75. As a User, I want the escrow portion excluded from that freed amount, so that the projection doesn't credit me money I still pay.
76. As a User, I want a marker on the timeline at each Liability payoff labelled with the step size, so that the inflection in the line is explained rather than mysterious.
77. As a User, I want the assumptions the projection is running on stated plainly on the Plan page, so that the freed-payment reinvestment and every other assumption is disclosed rather than hidden.
78. As a User, I want to see a projection for a single Holding, so that I can ask the same question about one asset.
79. As a User, I want the projection recomputed live as I edit an assumption, so that I can feel the sensitivity rather than guess it.

### Inflation, Target Net Worth, and the solver

80. As a User, I want to set an expected inflation rate, so that future figures can be expressed in money I understand.
81. As a User, I want the inflation rate to default to a reasonable figure, so that I get a meaningful answer before I've thought about it.
82. As a User, I want both the nominal and the inflation-adjusted lines charted, so that I can see both the number on a future statement and what it will actually buy.
83. As a User, I want the two lines to fork at today rather than my recorded history being restated, so that the past stays as recorded and only the guessed part is adjusted.
84. As a User, I want the inflation-adjusted line to be the primary one, so that headline figures answer the question I actually asked.
85. As a User, I want to set a Target Net Worth as an amount and a date together, so that "six million" is anchored to when.
86. As a User, I want my target read as today's purchasing power, so that the figure I typed means what I meant by it.
87. As a User, I want my target drawn as a line across the projection chart, so that I can see where the trajectory crosses it.
88. As a User, I want the gap reported as a date first — "2051, five years late" — so that I get the sentence I can act on rather than a bare shortfall figure.
89. As a User, I want the money figure shown beneath the date, so that the magnitude is available once the direction is clear.
90. As a User, I want to be prompted to set a new target once my target date passes, along with what I actually reached, so that a stale target stops quietly poisoning every later view.
91. As a User, I want to be told the monthly contribution required to hit my target on its date, so that I know what this month's decision needs to be.
92. As a User, I want the required figure paired with the date I'd reach the target at my current contribution, so that an implausibly large number still tells me something useful.
93. As a User, I want a required contribution below what I currently contribute shown as headroom, so that being ahead reads as being ahead.
94. As a User, I want a negative required contribution shown as withdrawal capacity, so that the drawdown question is answered rather than clamped to zero.
95. As a User, I want the required contribution recomputed whenever my assumptions or target change, so that it never disagrees with the chart beside it.

### Navigation and layout

96. As a User, I want to browse my Portfolio in Miller columns with a clickable breadcrumb, so that I can move up and down the hierarchy without losing my place.
97. As a User, I want Portfolio and Plan as the two roots, so that recording and planning are cleanly separated.
98. As a User, I want the dashboard shown in the rightmost column when nothing is selected, so that the landing view is the summary.
99. As a User, I want the dashboard to use two columns on a wide screen, so that a large window isn't half empty.
100. As a User, I want a minimal single-stroke icon per Asset Class and Liability Class, so that the rows are scannable without colour coding.
101. As a User, I want to navigate the columns with the keyboard, so that a check-in pass doesn't require the mouse.
102. As a User on a narrow screen, I want the columns replaced by an accordion outline I can expand in place, so that hierarchy and depth are both visible on a phone.
103. As a User on a narrow screen, I want to open several branches at once, so that I can see stale items across classes without navigating back and forth.
104. As a User on a narrow screen, I want a leaf's detail to open as a bottom sheet, so that I don't lose the outline behind it.
105. As a User on a narrow screen, I want to never scroll horizontally, so that the app behaves like a phone app rather than a shrunken desktop one.
106. As a User on a touch device, I want a persistent visual affordance on editable figures, so that editability doesn't depend on a hover I can't perform.
107. As a User on a touch device, I want comfortably sized rows, so that I can tap the right one.
108. As a User, I want the interface near-monochrome with one restrained accent and no red/green, so that a financial dashboard doesn't feel like an alarm.
109. As a User, I want the app to follow my system light/dark setting, so that it matches everything else on my screen.
110. As a User with reduced-motion enabled, I want animation suppressed, so that the interface doesn't make me ill.
111. As a User, I want numbers rendered with tabular numerals, so that columns of figures line up.

### Plan page

112. As a User, I want the Target Allocation editor to show my target percent beside my actual for each Asset Class, so that I'm editing against reality.
113. As a User, I want a running total of my target percentages, so that I can see when they don't sum to 100.
114. As a User, I want the Projection assumptions and the Target Net Worth edited on the same page as the chart they drive, so that cause and effect are visible together.
115. As a User, I want the recorded-plus-projected timeline shown on the Plan page too, so that I don't have to navigate away to see what an edit did.

### First run and empty states

116. As a new User with nothing recorded, I want the Portfolio to explain what to do next rather than showing an empty grid, so that a blank app is a starting point rather than a dead end.
117. As a new User, I want a Net Worth of zero to read as "nothing recorded yet" rather than as a real zero, so that the empty state isn't mistaken for a result.
118. As a new User, I want the Plan page to explain that it needs Holdings before it can project anything, so that an empty chart is understood.
119. As a User with Holdings but only one Valuation each, I want the timeline to handle a single point gracefully, so that the chart doesn't break before history accumulates.

## Implementation Decisions

### Stack and deployment

- One combined Next.js application — frontend, API routes, and server logic together, no separate backend service — deployed to Vercel's hobby tier. Supabase provides Postgres and Google-based auth. Per ADR 0002 this is a deliberate lock-in choice.
- Multi-tenancy is open Google sign-up with no invite gating and no admin dashboard. Isolation is enforced by Postgres Row-Level Security scoped to `auth.uid()`, per ADR 0001. There is no application-layer tenancy filter to be forgotten — RLS is the mechanism, not a backstop.
- The Vercel account exists on the hobby tier and the git repo exists with a GitHub remote; connecting the two is part of this build. The Supabase project is not yet provisioned (see the open tracker ticket) — the build should assume it will exist and read its URL and keys from environment, never from committed files.

### Schema

The full schema was settled and amended four times across the effort. It is reproduced here as the contract; the tracker ticket carries the derivation.

**`portfolio`** — the per-User anchor and singleton profile row. `user_id uuid primary key references auth.users(id)`, `home_currency char(3) not null`. There is deliberately no separate `users` or `profiles` table: Supabase's `auth.users` isn't ours to extend, and this row is the app's profile. Every other tenant table hangs ownership off this same `user_id` rather than a separate `portfolio_id` — one anchor row per User makes a second key redundant.

**`asset_class`** and **`liability_class`** — two separate tables of identical shape, deliberately not one table with a `kind` discriminator, which would let a foreign key point a Holding at a Liability Class or require a trigger to prevent it. `id uuid pk`, `owner_id uuid null references auth.users(id)`, `name text not null`. A `NULL` `owner_id` is a global default shipped with the app and visible to everyone; a non-null one is a single User's custom class.

**`holding`** — `id`, `user_id`, `asset_class_id` (`on delete restrict`), `name`, `currency char(3)`, `price_lookup_symbol text null`, `quantity numeric null`, `archived_at timestamptz null`, `created_at`. Currency is validated at the application layer only; there is no database reference table of ISO codes. `quantity` is populated only alongside `price_lookup_symbol` and exists solely to compute the Live Estimate.

**`liability`** — the same shape minus `price_lookup_symbol` and `quantity` (Liabilities are never live-priced), plus the Amortization Assumptions: `interest_rate numeric null`, `original_loan_amount numeric null`, `term_months int null`, `custom_monthly_payment numeric null`, `extra_monthly_payment numeric null default 0`, `escrow_portion numeric null default 0`, `start_date date null` (display-only, read by no formula), and `linked_holding_id uuid null references holding(id)`. All optional: a Liability with none of them filled in is held flat by the Projection.

**`holding_valuation`** and **`liability_valuation`** — two separate tables, not one polymorphic table, because a plain foreign key cannot target one of two tables and the alternatives (nullable pairs, `(owner_type, owner_id)`) surrender real referential integrity. Each carries `id`, `user_id`, the owning `holding_id`/`liability_id` (`on delete cascade`), `amount numeric not null` in the Holding's own currency, `fx_rate_to_home numeric not null` recorded at the moment of entry, `home_currency_at_recording char(3) not null`, `recorded_at date not null`, `created_at`, and `unique (holding_id, recorded_at)`.

`user_id` is denormalized onto the Valuation tables even though it is derivable through the parent, so that every RLS policy in the schema is the same flat one-column check with no join. `home_currency_at_recording` guards against a later change to `portfolio.home_currency` retroactively misinterpreting old rows. `recorded_at` is a `date`, not a `timestamptz`, because sub-day precision is not meaningful for a periodic snapshot. The unique constraint is what makes a same-day correction an `UPDATE` rather than a second row.

Home-currency value is always computed on read as `amount * fx_rate_to_home` and never stored — a trivial multiplication in an app that is not a high-QPS service.

**`target_allocation`** — `user_id`, `asset_class_id` (`on delete cascade`), `target_percent numeric not null`, primary key on the pair. Asset Class only; there is no Liability Class equivalent.

**`projection`** — singleton per Portfolio, `user_id uuid primary key`. Holds the assumption set only: growth rate, `monthly_contribution` (a scalar), `contribution_escalation_rate numeric null default 0`, horizon in years, `target_amount numeric null`, `target_date date null`, `inflation_rate numeric null default 0.03`. One active assumption set per Portfolio — not multiple saved or named scenarios, and exactly one Target, which is why the Target is columns rather than a child table.

**`price_cache`** — the one non-tenant-scoped table. `symbol text primary key`, `price numeric not null`, `price_currency char(3) not null`, `source text not null`, `last_error text null`, `fetched_at timestamptz not null`. No foreign key from `holding.price_lookup_symbol` into it: the cache is global and independent of any tenant's data. `last_error` is separate from `fetched_at` specifically so `fetched_at` stays trustworthy as *last successful fetch* rather than *last attempt*.

### RLS policies

- Every tenant table: `USING (user_id = auth.uid())` for all operations.
- `asset_class` / `liability_class`: `SELECT` where `owner_id IS NULL OR owner_id = auth.uid()`; `INSERT`/`UPDATE`/`DELETE` where `owner_id = auth.uid()` only. Global defaults are therefore readable by everyone and editable by nobody at the row level.
- `price_cache`: RLS **enabled**, not disabled — `FOR SELECT TO authenticated USING (true)` and no write policy for any client role. Only the service-role key, used server-side by the refresh route, can write. Leaving RLS off would work but would leave an accidental client-side write reachable.

### Deletion and archival

- Holding and Liability: the normal "remove" action sets `archived_at`, preserving the row and its Valuation History. This is required for correctness, not tidiness — a hard delete would retroactively erase that Holding's contribution to *past* distribution, not only to today's. Current Net Worth and distribution queries filter `WHERE archived_at IS NULL`; historical and trend queries ignore the filter entirely and use every Valuation row regardless of archival state.
- A true `DELETE` (cascading its Valuations) exists for correcting a mistaken entry and is not the primary remove action in the UI.
- Asset Class / Liability Class: `on delete restrict` from Holding and Liability, since archived rows still need their class for historical grouping.
- Target Allocation and Projection: `on delete cascade` — current-state settings with no historical significance.
- No soft-delete or undo window anywhere else; hard delete elsewhere is final, consistent with ADR 0003's stance against audit-trail complexity. `archived_at` is a status flag serving a feature requirement, not a reintroduction of that complexity.
- **The archive-not-delete rule is a candidate for ADR 0004.** It is hard to reverse once data exists, surprising without this context, and the result of a real trade-off. It was offered during the schema ticket and not yet taken up; the build session should offer it once more rather than leave it implicit.

### Market data and the price cache

- Stocks and ETFs: **Finnhub**, 60 calls/min free, real-time US-exchange data, key server-side only. Chosen because every alternative fails on rate limit or data freshness — Alpha Vantage is 25/day, Polygon's and FMP's free tiers are end-of-day only, IEX Cloud shut down in August 2024, and Yahoo's unofficial API is ToS-violating scraping.
- Precious metals: **Metals.Dev** primary with **MetalpriceAPI** as fallback, roughly 100 free requests/month each. Metals-API.com, which this effort originally assumed, no longer has a free tier at all.
- Real estate and anything else without a symbol: manual entry only. There is no automated home-value lookup.
- **One shared server-side cached fetch serves all tenants.** This is a hard requirement, not an optimisation: none of these free tiers survive N tenants polling independently.
- Mechanism: a Vercel Cron Job in `vercel.json` invoking a Next.js API route, protected by Vercel's auto-sent `CRON_SECRET` bearer token; the route fetches from the providers and `UPSERT`s into `price_cache` using the service-role key. The hobby tier caps cron at once per day with ±59 minutes of timing slack — adequate for a net-worth tracker, and a reason the UI should show cached-price age rather than implying real-time.
- Two items to check by hand before shipping to real users: Finnhub's free-tier "personal, non-commercial" wording, and the provider figures flagged as lower-confidence in the research file (their pricing pages are JS-rendered and were not fully readable by the research tooling).

### Projection engine

The engine is one module behind one call. Its inputs are the current Holdings total, the list of Liabilities with their optional Amortization Assumptions, and the Projection assumption set. Its outputs are the nominal trajectory, the real trajectory, the payoff markers, the gap date and figure, and the Required Contribution. Nothing it computes is persisted — the trajectory, the gap and the Required Contribution are all derived live, exactly like Net Worth itself.

**Holdings are projected, Liabilities are projected separately, and the two are netted at each future point.** The Projection never grows an already-netted Net Worth figure. This distinction is the single most consequential decision in the whole model: growing a netted figure implicitly compounds every debt at the Portfolio's equity growth rate, which on the effort's sample data grew a mortgage to 1,357,184 two years after its scheduled payoff, tripled a credit-card balance, and — decisively — made Amortization Assumptions *decorative*, since filling them in moved the Net Worth line by exactly zero. The two readings differ by 1.4M at year 20 on the same data.

Core growth is the standard monthly-compounding future value of a lump sum plus an ordinary annuity, with contributions credited end-of-month:

```
FV = P(1+r)^n + C·[((1+r)^n − 1) / r]
```

where `P` is the Holdings total (or a single Holding's value in the ad-hoc case), `r` is the annual growth rate over 12, and `n` is months.

**`C` is piecewise-constant, not constant.** It steps upward from two independent sources — each loan payoff, and the annual contribution escalation — so the projection is a chain of closed-form segments evaluated in step order rather than one evaluation:

```
FV₁ = P·(1+r)^n₁ + C₁·[((1+r)^n₁ − 1) / r]
FV₂ = FV₁·(1+r)^n₂ + C₂·[((1+r)^n₂ − 1) / r]     C₂ = C₁ + freed payment
…
```

The two sources compose without interaction: a payoff landing mid-escalation-year simply splits that year into two segments. Still deterministic and closed-form — no simulation and no per-month iteration. This was verified numerically against a month-by-month simulation on the sample data, agreeing to 1×10⁻⁷ across 21 segments.

**Liabilities** are held flat at their latest recorded balance by default. A Liability with Amortization Assumptions amortizes forward from its *current recorded balance* — not from the original loan amount, because manual Valuation snapshots stay authoritative for "now", consistently with every other Valuation in the app:

```
B(k) = P₀(1+r)^k − Payment·[((1+r)^k − 1) / r]      floored at 0, and 0 thereafter
```

`Payment` is `custom_monthly_payment` when set, otherwise the derived `M = L·[r(1+r)^t] / [(1+r)^t − 1]` from the original amount, rate and term, plus `extra_monthly_payment` either way. The capability is not tied to the Mortgage Liability Class; any Liability opts in by filling the fields.

If `Payment ≤ P₀·r` the closed form produces a growing balance rather than flooring at zero. This is a validation concern at entry time ("this payment won't cover interest"), not a change to the formula's shape.

**Freed payments redirect into contributions** at `ceil(payoff_months)` — the loan isn't clear until the final partial payment lands:

```
freed = (custom_monthly_payment or derived M) + extra_monthly_payment − escrow_portion
```

The `escrow_portion` subtraction exists because `custom_monthly_payment` is explicitly permitted to carry escrow and PMI baked into a statement payment, and property tax does not stop at payoff. On a $3,800 statement payment with $650 of tax and insurance, redirecting the full amount overstates year-20 Net Worth by 64,816. It is excluded from the redirect only, never from the payoff math itself. The `extra_monthly_payment` does redirect: it is money the User already chose to divert away from spending.

The redirect is **always on with no toggle**. A toggle whose off position is "the freed money vanishes" would make this a two-scenario projection, which the settled foundation rules out. Disclosure lives in the Plan page's assumptions block and in each payoff marker's label instead.

**Inflation** is applied last and at display time only:

```
real(y) = nominal(y) / (1 + inflation)^y
```

Every input stays nominal — growth, escalation, loan rates — exactly as those rates are quoted in the world. A real growth rate was considered as the tempting simplification (no inflation field, the User types "3% real") and rejected because *the liability side cannot be converted*: a mortgage rate is contractual, the bank charges a nominal rate on a nominal balance and takes a fixed nominal payment. Running it anyway lands 63,017 above the correct year-20 figure; deflating the liability too to "fix" it lands 72,189 off, because the payments were made in nominal dollars at many different points in time and one final deflation cannot unwind that.

**Both lines are charted, forking at today.** Recorded history stays nominal as recorded — deflating the past would require real historical CPI the app does not store, and deflating it by the assumed rate would restate real history through a made-up number. The deflator is 1 at today, so the single historical line forks into two exactly where the guessing starts. The real line is primary: the headline, the Target comparison and the solver all read from it, with nominal drawn as a fainter reference. No user toggle.

**The Required Contribution solver** solves for the starting contribution, with escalation held as an input. Future value is linear in the starting contribution — confirmed on the sample, where `f(1000) − f(0)` and `f(2000) − f(1000)` are both exactly 384,199 — so this is one subtract and one divide, no iteration:

```
C₀ = (target − f(0)) / slope
```

where `f(0)` is the projection run with zero contribution and `slope` is the derivative of real Net Worth at the target date with respect to `C₀`. Escalation is not solved for: it is a forecast about one's future self rather than a lever anyone can pull, and it is the only variable the linearity result covers — future value is *not* linear in the escalation rate. The date is not solved for either, because it falls out of the gap display for free.

The solver runs against the **real** line. This is worth stating loudly in the UI copy and in any documentation: the honest required contribution is roughly **2.6× the nominal one** — 16,893/mo rather than 6,425/mo for the sample's 6M-by-2046 target. That gap is the single largest practical consequence of the real-dollar decision and precisely why the nominal basis was rejected.

There is **no unreachability threshold**. The required contribution is never infinite or undefined — a one-year horizon yields 457,517/mo, absurd but finite and positive — so any plausibility constant would be a tuned guess that is wrong for someone. The display always pairs the figure with the achievable date: *"you'd need 16,893/mo — or at your current 7,400/mo you reach 6M in 2051."*

A negative result is displayed as **withdrawal capacity**, not clamped or suppressed. The sign-flip subtlety is decided and accepted: a negative contribution still gets multiplied by the escalation rate, so a −48/mo figure at 5% escalation is a withdrawal *rising* 5% a year. That is correct drawdown behaviour against rising costs, but it does silently repurpose a field the User set meaning "my savings will grow", so it must be **explicitly labelled**. Re-solving at 0% escalation when the result is negative was rejected: it would compute the displayed number under different assumptions depending on which side of zero it fell, kinking the curve at the crossing.

### UI structure

**Desktop (≥900px): Miller columns.** Finder-style columns roughly 270px wide with a clickable breadcrumb; the rightmost column is the detail panel. Portfolio and Plan are the two breadcrumb roots. No persistent sidebar tree. Column navigation uses ↑/↓ plus tab order.

**The dashboard** is the rightmost column when nothing is selected: Net Worth headline with its Holdings-minus-Liabilities breakdown and as-of date; the recorded-plus-projected timeline with a Today seam and one payoff marker per amortizing Liability; Target Allocation as horizontal bars with a target tick and the money gap; and a staleness list of Valuations older than 30 days linking back into the tree. Above roughly 1200px this lays out as two columns — headline and timeline beside allocation, staleness and Start Check-in — and stacks below. A persistent Net Worth readout lives in the top strip, because Miller columns scroll the first column out of view in a way a sidebar never did.

**Charts are horizontal bars with a target tick.** No pie, donut or treemap anywhere: they cannot show a target, they need a legend, and they ask the reader to compare angles. Bars are drawn in tree order rather than size order so the eye maps rows to rows.

**The detail panel** carries the Valuation History table and sparkline, the Live Estimate against the last Valuation, the linked Liability with its Projected Net Position, Amortization Assumptions rendered as a payoff curve, and Archive.

**The Plan page** is the second breadcrumb root: Target Allocation editor with a running total, Projection assumptions, Target Net Worth, and the timeline beneath. Amortization Assumptions are edited in the Liability's detail panel, not here. Note that the Plan page was settled as a single page when it carried three inputs and now carries six inputs and four outputs — it may need sectioning, and nobody has looked at it since the inputs doubled. Flagged for the build session's judgement.

**Narrow (<900px): an accordion outline.** The breakpoint is 900px because the column shell has an 830px floor (270px columns plus a 560px detail minimum) and an 834px portrait tablet must not land where the shell technically fits but has no room for a second list column. One breakpoint only; 900–1199px already degrades acceptably.

Below it, Asset Classes and Liabilities become expandable rows that open in place, several branches may be open at once, and tapping a leaf opens its detail as a bottom sheet. Section order is Net Worth (figure, subline, timeline) → Portfolio outline → Target Allocation, staleness, Start Check-in. This is structurally the sidebar-tree shape that *lost* on desktop, winning on narrow for the same reason it lost on wide: it shows hierarchy and depth simultaneously, so stale items across several classes are visible without navigating. Miller columns structurally cannot do that, which is exactly why the desktop design needs the staleness list to compensate.

**Two navigation models across widths is a deliberate call.** The cost — someone switching devices relearns the navigation — was weighed and accepted rather than reopening the settled desktop shape. The alternative (Miller windowed to one pane at a time) preserves one model but makes depth invisible, so a phone would give no signal that something three levels down is stale.

Measurement, not guesswork, produced this scope: at a true 390×780 viewport the top strip already wrapped correctly, Check-in mode already bypassed the column shell entirely and needed no layout work, the dashboard content already reflowed, and the Plan page already returned before building the column shell. The entire narrow problem was the 830px floor.

**Touch affordances below 900px**: inline click-to-edit carries a persistent 1px dotted underline plus a trailing pencil glyph rather than a hover signal; Check-in's keyboard hints are replaced by real Keep / Use estimate / Done tap targets with the key bindings retained and **both routed through one shared action so they cannot drift**; 44px minimum row height; sticky top strip; no horizontal scrolling anywhere.

**Visual system**: near-monochrome with one desaturated slate accent reserved for selection and active state, no red or green, hairlines rather than boxes, tabular numerals, 15px base type, system light/dark, reduced-motion aware, nothing loops. One minimal single-stroke monochrome icon per Asset Class and Liability Class, inheriting the row's text colour and never the accent — classes only, not Holdings or Liabilities. **An unrecognized class id must fall back to a neutral glyph as the normal path, not as an error**, because Users define custom classes.

**Two rendering lessons carried from the prototypes**, both of which cost a debugging cycle: an SVG containing text must never be stretched with `preserveAspectRatio="none"`, which scales x and y independently and distorts every glyph — size the coordinate system to the measured container instead, with a debounced resize re-render. And any SVG measurement must happen after the node is in the document, with a fallback for a zero measurement; measuring before attach throws in Chrome and blanked an entire pane.

### Left to the build session's judgement

These were explicitly deferred rather than overlooked:

- Whether the narrow outline's expanded/collapsed state persists between visits. The prototype resets it.
- The bottom sheet's dismissal gesture. It is a second overlay concept the app does not otherwise use; the prototype gives it a close button and a minimal drag-to-dismiss on the handle, and the real implementation should settle it properly.
- Whether the Plan page needs sectioning or splitting now that its inputs have doubled.
- Empty and first-run states, which no prototype ever exercised — every one was populated with fictional data. User stories 116–119 state the requirement; the design is not settled.
- UI-level affordances for unarchiving and for displaying edit history. The schema-level rules are settled (same-day edits overwrite; removal archives) but no unarchive path was designed.

## Testing Decisions

A good test here exercises **external behaviour through a real boundary** and says nothing about how the code inside is arranged. It does not assert on internal function calls, does not mock the thing under test, and survives a refactor that changes structure without changing behaviour. Two seams only — deliberately, because the fewer seams a codebase has, the less there is to keep honest.

### Seam 1 — the projection engine, as a pure function

One module, called directly with plain data, returning plain data. No I/O, no database, no clock beyond an injected "today". Everything from the projection, amortization, inflation, target and solver decisions is exercised here.

This is the right seam because the engine is where the genuinely difficult correctness lives, and because it is *already* pure by design — the trajectory, the gap and the Required Contribution are all derived and never stored, so there is nothing to set up and nothing to tear down.

**The oracle already exists and is not a mock.** The effort verified the segmented closed form against an independent month-by-month simulation, agreeing to 1×10⁻⁷ across 21 segments. That simulation should be written into the test suite as a reference implementation and the closed form checked against it — an independent computation, not a recorded snapshot of the code's own output, which is the difference between a test and a tautology.

What must be covered:

- The closed form matching the month-by-month simulation across a multi-segment case, to a stated tolerance.
- Segmentation from both step sources independently and together, including a payoff landing mid-escalation-year.
- Holdings-minus-projected-Liabilities netting, specifically the case that motivated it: setting `extra_monthly_payment` on a loan must move the projected Net Worth line. A test asserting only that the number is "about right" would have passed under the wrong reading; this one must assert the *sensitivity*.
- A Liability with no Amortization Assumptions staying exactly flat.
- `B(k)` flooring at zero and staying there, and the negative-amortization case being flagged rather than silently producing a growing balance.
- The freed-payment redirect starting at `ceil(payoff_months)`, and `escrow_portion` being excluded from the redirect while remaining in the payoff math.
- Nominal and real lines coinciding at today and diverging thereafter.
- The solver's linearity — the property that made it a closed form — asserted directly, as equal deltas across equal contribution steps.
- The solver against the real line specifically, since solving against nominal is the error the decision exists to prevent.
- A negative required contribution surviving as withdrawal capacity with escalation applied, rather than being clamped.
- Degenerate inputs: zero horizon, zero growth (which divides by `r`), no Target set, no Liabilities, no Holdings.

The sample portfolio the effort has been reasoning about throughout — with its documented year-20 figures — makes a good golden-case fixture, since several published numbers can be asserted against directly.

### Seam 2 — the HTTP route boundary against a real Postgres

Requests in, responses out, against a local Supabase with **RLS actually enabled** and at least two distinct authenticated Users. Nothing below this is mocked; the database is real.

This is the right seam and the boundary must not be lowered. Testing repository functions against a mocked database would exercise zero lines of the RLS policies — and RLS *is* the tenancy guarantee. A test suite that passes with every policy dropped would be worse than no test suite, because it would be reassuring.

What must be covered:

- User A cannot read, update or delete any of User B's Holdings, Liabilities, Valuations, Target Allocation or Projection — asserted by attempting each, not by inspecting policy definitions.
- Global Asset Classes and Liability Classes are readable by every User and writable by none.
- A User's custom class is invisible to other Users.
- The one-Valuation-per-day rule: recording twice on the same date updates the row rather than creating a second.
- `fx_rate_to_home` and `home_currency_at_recording` are captured at record time, and changing `portfolio.home_currency` afterwards does not retroactively alter historical totals.
- Archiving excludes a Holding from current Net Worth and distribution while leaving it in historical trend queries — the specific correctness property that the archive rule exists for.
- Deleting an Asset Class that still has Holdings is refused, including when those Holdings are archived.
- Deleting a Holding cascades its Valuations.
- `price_cache` is readable by an authenticated client and not writable by one, including with a client-side key.
- The cron refresh route rejects a request without the `CRON_SECRET` bearer token.
- A provider failure leaves the previous good price in place and records `last_error` without touching `fetched_at`.
- First sign-in creates exactly one `portfolio` row, and signing in again does not create a second.

### Prior art

There is none in this repository — it is greenfield, so both seams are new. The nearest prior art in the effort is the numerical verification work already done in the tracker: the month-by-month simulation cross-check from the itemized-contributions ticket, and the linearity check from the solver ticket. Both are reference computations rather than assertions on recorded output, and both should be carried into the suite in that spirit rather than reimplemented as snapshot tests.

### Explicitly not tested automatically

UI correctness is verified by hand, at the User's own viewport, consistent with how every prototype in this effort was reviewed. This is a decision, not an omission — and it carries one standing hazard worth stating: **an agent's browser tooling clamps to roughly 1288px while the User reviews at roughly 2000px**, which is exactly how the desktop dashboard shipped a version stranding 900px of empty window that read as "a minor aesthetic note" at the narrower width. Any UI verification claim should name the width it was made at.

## Out of Scope

**A transaction ledger, cost basis, or capital-gains tracking.** Holdings and Liabilities are periodic snapshots, per ADR 0003. Revisiting this means introducing a new concept alongside Valuation, not modifying it.

**A compensation model** — base salary, bonus, stock compensation, employer match, ESPP, blended tax rate, used to *derive* the savings figure. Ruled out on measurement rather than taste: RSU vest lumpiness is worth 0.99% over 20 years, while a user-guessed blended tax rate swings the result by 5% — so the derived number is *less* reliable than a typed one while looking more authoritative, and it goes stale silently on every raise. The one thing it genuinely bought, catching a forgotten 401k match (worth 9%), is delivered far more cheaply by helper text on the single contribution field. The input that actually matters — contribution growth, worth 27% — is one escalation field needing no salary at all. Returns only if the destination is redrawn toward a compensation planner, which is a different product.

**Itemized contribution lines.** Rejected on its own ticket: the seeded line list presumed employment, kind tags computed nothing, and per-line escalation proved redundant, since a single 2.9% global rate reproduces a half-at-5%/half-flat mix. The scalar plus one escalation field stays.

**Any LLM feature, including research-prompt templates.** Ruled out after drafting the prompts concretely, which split them cleanly: the prompts that answer *"what is this worth"* are a thin wrapper around a number the User is about to type in anyway, and the prompt that answers *"should I own this"* — moats, bear cases, market share — returns nothing that is a Valuation and fits no field in the schema. The good prompt is the one this app cannot use. It also failed to generalise across Asset Classes, and cutting it removes a template column, a custom-class fallback problem, and a copy-on-write problem invented for that feature alone. It holds ADR 0003's line: this app records what things are worth, it does not reason about whether to own them. It returns as its own effort, an investment-research product.

**Multiple or named Projection scenarios.** One growth rate, one escalation rate, one inflation rate, one Target. This is why the freed-payment redirect has no toggle — an off position would be a second scenario.

**Several Target Net Worths.** One per User. Several would force the solver to pick which to solve for or find the binding constraint, and a near-term earmarked goal measured against *total* Net Worth is close to meaningless: you would be told you can afford a house deposit because your 401k is large.

**Per-Asset-Class or per-Holding growth rates.** One portfolio-wide rate. See Further Notes — this is the most likely place for pushback.

**Automated home-value lookup.** Real estate is manual entry only.

**Real-time or intraday prices.** The cron refreshes once daily with ±59 minutes of slack on the hobby tier.

**An admin dashboard, invite gating, or an allowlist.** Per ADR 0001.

**Data export and import.** Not specified, not built.

**Out-of-app reminders or notifications.** Check-in mode and the staleness list cover the in-app nudge; email or push is out.

**Historical CPI data.** Recorded history stays nominal; only the future is deflated.

**Expense or budget tracking, and anything tax-related.**

## Further Notes

**Two known soft spots, flagged rather than hidden.**

The first is the single portfolio-wide growth rate. The settled foundation says one flat rate, but netting Holdings and Liabilities separately grows each Holding explicitly, which makes the consequence *visible* in a way the old reading hid: on the sample data the house compounds to 2,052,327 over 20 years at the same 6% as the equities. That is not defensible as a forecast, and it is the place someone will push back first. It is not reopened here — but the build session should expect the question and should not be surprised by it.

The second is that four assumptions now compound over the horizon — growth rate, contribution escalation, full reinvestment of freed loan payments, and inflation. Charting the nominal and real lines together addresses the inflation one by making it visible. The other three are stated once and never stress-tested. Multi-scenario is ruled out, but a single downside line or a stated sensitivity would be within the spirit of the settled foundation, and is worth raising once the app is real enough to feel the gap.

**On the numbers in this spec.** The figures quoted throughout — 1,404,690, 64,816, 63,017, 16,893/mo, 2.6×, 1×10⁻⁷ — come from worked calculations on the effort's sample portfolio, not from illustration. They are the evidence the decisions were made on, and several are directly usable as test assertions. Where a decision cites a rejected alternative's cost, that cost was computed.

**On disclosure.** Several decisions here are defensible but surprising to a User who did not make them: the freed-payment redirect is always on, the real line is primary with no toggle, a negative required contribution escalates, and non-amortizing Liabilities never shrink. Each was accepted *on condition of being visible* — in the Plan page's assumptions block, in a marker label, or in explicit labelling on the figure. Those disclosures are part of the spec, not polish to be dropped when the sprint runs long.

**On the prototypes.** `.scratch/asset-tracker-spec/prototypes/tree-ui/variant-e.html` and `variant-e-narrow.html` are the confirmed shapes and are worth opening before writing UI code. They are reference for structure, interaction and visual system only — their projection math predates the reconciliation and is wrong; do not port it.

**Provisioning still open.** The Supabase project does not exist yet: creating it, enabling the Google provider, configuring the OAuth client, and recording the URL and keys are a human-only task tracked separately. The build can proceed against a local Supabase in the meantime, but cannot deploy without it.
