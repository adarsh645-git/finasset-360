# FinAsset 360

A multi-tenant net-worth tracker: each signed-in User records what they own (Holdings) and owe (Liabilities), and sees their own portfolio distribution against goals.

## Language

**User**:
An authenticated account (via Google sign-in), isolated from every other User's data by database-enforced Row-Level Security. Owns exactly one Portfolio.
_Avoid_: Account, tenant

**Asset Class**:
A category of thing one can own — Real Estate, Equity, Precious Metal, Cash, Crypto, etc.
_Avoid_: Asset type, category

**Holding**:
One specific thing owned within an Asset Class — e.g. "10 shares of AAPL," "123 Main St," "3 oz gold coins." Belongs to exactly one Asset Class.
_Avoid_: Asset, position, item

**Portfolio**:
The full set of a user's Holdings. The basis for the distribution view. Also the anchor record for that User's account-level settings (home/display currency, Target Allocation, Projection) — a Liability belongs to the User, not conceptually "inside" the Portfolio, but is scoped through this same anchor since a User has exactly one.
_Avoid_: Assets, holdings list

**Liability Class**:
A category of debt — Mortgage, Auto Loan, Credit Card, etc. Mirrors Asset Class.
_Avoid_: Debt type

**Liability**:
One specific debt owed — e.g. "mortgage on 123 Main St." Belongs to exactly one Liability Class. May optionally carry Amortization Assumptions and be linked to the Holding it financed (e.g. a mortgage linked to the house it's secured against), enabling a combined Projected Net Position for that pair.
_Avoid_: Debt, loan (unless the Liability Class itself is "Loan")

**Amortization Assumptions**:
Optional loan details (interest rate, required payment, any recurring extra payment, any escrow portion) attached to a Liability, letting Projection shrink that Liability's balance forward over time using standard loan-payoff math instead of holding it flat. When the balance reaches zero, the freed payment is added to the Projection's monthly contribution from that point on. Not specific to the "Mortgage" Liability Class — any Liability can carry them (e.g. an Auto Loan).
_Avoid_: Loan terms, mortgage details (not Mortgage-specific)

**Valuation**:
A point-in-time recorded value for a Holding, or a point-in-time recorded balance for a Liability. Holdings and Liabilities both accumulate a Valuation History over time (never just overwritten), so Net Worth trend can be reconstructed.
_Avoid_: Price, value (as a standalone term — always tie it to a point in time)

**Net Worth**:
Derived value: sum of current Holding Valuations minus sum of current Liability Valuations, each converted to the Portfolio's home currency using the FX rate stored on that Valuation at the time it was recorded. Never stored directly — always computed from the latest Valuations.
_Avoid_: Total assets, balance

**Live Estimate**:
A real-time computed value for a live-priced Holding (one tracking a market symbol — stocks, gold), derived as quantity × the latest cached market price. Shown in the UI as a convenience alongside the Holding's actual Valuation History, but never itself recorded as a Valuation — a Valuation is always a deliberate, user-recorded snapshot. Only exists for Holdings with a market symbol; a Holding valued manually (e.g. Real Estate) has no Live Estimate.
_Avoid_: Current value, live price, current price (always say "Live Estimate" to keep it distinct from Valuation)

**Target Allocation**:
A goal percentage per Asset Class (e.g. 60% Equity / 20% Real Estate / 10% Gold / 10% Cash), compared against the Portfolio's actual current distribution. Present-tense — describes a desired balance, not a trajectory.
The "Target" prefix denotes a value the User is aiming at; it carries no tense — the tense rides on the noun (compare Target Net Worth, which is future-dated).
_Avoid_: Goal, plan (too vague — always say "Target Allocation" for this specific concept)

**Projection**:
A forward-looking trajectory of future Net Worth, a single Holding's value, or a Projected Net Position, computed from one shared set of assumptions (growth rate, contributions, inflation, timeline) rather than per-item settings. Holdings and Liabilities are projected on **separate rules** and netted at each future point — a Projection never grows an already-netted figure, so a Liability's Amortization Assumptions genuinely move the projected Net Worth line. Distinct from Target Allocation — a Projection is about *when*, Target Allocation is about *balance right now*. Computed entirely in **nominal** terms (rates are quoted nominal, and a loan's rate is contractually nominal), then deflated for display so the figures read in today's purchasing power; both lines are charted, forking at today, since a raw future dollar amount conveys little on its own.
_Avoid_: Forecast, plan

**Target Net Worth**:
An amount the User wants to reach by a specific date — the amount and the date together are one term, never a bare figure. Stated in today's purchasing power, so it compares against the Projection's inflation-adjusted line. Exactly one per User.
_Avoid_: Net worth goal, milestone, target (unqualified — collides with Target Allocation)

**Required Contribution**:
The monthly contribution needed to reach the Target Net Worth by its date, derived by inverting the Projection. Always shown against the achievable date at the User's current contribution, so an implausible figure stays legible. Negative when the Portfolio alone suffices — read then as withdrawal capacity. Derived, never stored.
_Avoid_: Needed savings, shortfall (the shortfall is the gap in Net Worth, not in contribution)

**Projected Net Position**:
For a Holding linked to a Liability with Amortization Assumptions, the paired figure at a future point in a Projection: that Holding's projected value minus its linked Liability's projected balance (e.g. a house's projected value minus its projected remaining mortgage balance).
_Avoid_: Equity, home equity (collides with "Equity" the Asset Class, e.g. stocks) — always say "Projected Net Position"

**Sector**:
A stock's market-sector/industry label (e.g. "Technology," "Financial Services"), resolved from the market-data provider and shown alongside a Holding's ticker and company name when picked from the stock-picker's suggestions. Stored on the Holding once resolved, purely descriptive — carries no weight in Target Allocation, Projection, or Net Worth, and is unrelated to Asset Class (a User-defined ownership category) despite both being "what kind of thing is this." Only ever set for a Holding resolved through the stock-picker; a manually-entered Holding (Real Estate, etc.) has none.
_Avoid_: Segment (the Projection already uses "segment" for its piecewise time chunks — say "Sector" here to avoid the collision), category, industry (the provider's own field name, not the term to use in this app)

**Held at**:
A freeform label for where a Holding is held — a brokerage, a bank, an exchange, "at home," etc. — so two Holdings of the same thing (e.g. Apple stock in a 401k and in a taxable brokerage) don't need to be told apart by hacking the distinction into Name. Applies to every Asset Class, not just market-symbol Holdings (a Cash Holding at "Chase Checking" vs "Ally Savings" is the identical need). Purely descriptive, like Sector — carries no weight anywhere else in the app, and is edit-form-only (never shown in the Portfolio tree, the page header, Check-in, or the staleness list).
_Avoid_: Account (reserved above for the User's own login concept), Brokerage (too narrow — doesn't fit Cash, Crypto, or Precious Metal)
