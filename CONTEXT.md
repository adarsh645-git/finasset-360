# FinAsset 360

A multi-tenant net-worth tracker: each signed-in User records what they own (Holdings) and owe (Liabilities) across Countries, sees it all rolled up to USD, and projects it forward against their Goals.

## Language

### People and scope

**User**:
An authenticated account (via Google sign-in), isolated from every other User's data by database-enforced Row-Level Security. Owns exactly one Portfolio.
_Avoid_: Account (in the UI "account" is the noun for some Holdings, see Asset Class), tenant

**Portfolio**:
The full set of a User's Holdings and Liabilities, and the anchor for that User's settings (Projection Assumptions, Monthly savings, Goals). Everything in it rolls up to USD.
_Avoid_: Assets, holdings list

**Country**:
Where a Holding or Liability lives, currently US or India. It fixes the item's native currency (USD or INR) and supplies its own inflation and growth rates to the Projection.
_Avoid_: Region, market, currency (the currency follows from the Country)

### What a User owns

**Asset Class**:
One of six fixed categories of thing a User can own: Real estate, Stocks, Cash, Crypto, Metals, Vehicles & other. The set is fixed, so Users cannot add classes. Each class has a colour, a noun (Stocks, Cash and Crypto are an "account", Real estate is a "property", the rest an "asset") and a Projection rate rule: Real estate, Stocks and Cash take a rate per Country, the other three share one rate. Rough guide: fixed deposits and savings schemes go in Cash, funds and ETFs in Stocks.
_Avoid_: Asset type, category, custom class, Equity (the old name for Stocks, now means something else)

**Holding**:
One thing a User owns, in one Country and one Asset Class: an account ("Fidelity Brokerage"), a property ("Pune apartment") or an asset ("Gold coins"). A Stocks Holding's value and Cost Basis come from its Positions. Every other Holding has an entered value and an optional Cost Basis.
_Avoid_: Asset, item

**Position**:
One stock held inside a Stocks Holding: a ticker, a number of shares and an average cost per share, in the Holding's currency. At most one per ticker per Holding. Only its current state is kept, with no history of trades. Its price, name and Sector come from market data, or, for a ticker market data doesn't cover, from a Hand Price, Sector and name the User enters.
_Avoid_: Lot, trade, stock (as the noun for this record)

**Hand Price**:
The price per share a User enters on a Position whose ticker has no market data (an Indian ticker, or a fund with no ticker), stored with the date it was entered. Market data always takes precedence over it.
_Avoid_: Manual quote, override

**Cost Basis**:
What was paid for a Holding, in its native currency. For a Stocks Holding it is the sum of shares × average cost over its Positions. For any other Holding it is optional and entered by hand. A current figure, not a history. Unrealized gain = value − Cost Basis.
_Avoid_: Purchase price, book value

**Description**:
Optional short free text on a Holding, shown under its name and included in search. Carries no weight anywhere else.
_Avoid_: Held at, notes

**Property type**:
A Real estate Holding's kind: Residential, Land, REIT / fund or Commercial.
_Avoid_: Property category

**Sector**:
A ticker's market-sector label, one of a fixed list of 12 (e.g. "Technology", "Financial Services"). Belongs to the ticker, or to a Position with a Hand Price, never to a Holding. Purely descriptive, and unrelated to Asset Class: the Sector "Real Estate" is not the Asset Class "Real estate".
_Avoid_: Segment, category, industry

### What a User owes

**Liability**:
One specific debt owed, e.g. "Home loan, Austin" or "Amex Gold card". Belongs to one Country and carries its balance, original principal, interest rate (APR), Monthly payment, start month and optional term, so every Liability amortizes in a Projection. May be flagged revolving (a credit card) and linked to the Holding it financed. In the UI a single Liability is called a "loan".
_Avoid_: Debt, Liability Class

**Monthly payment**:
What the User pays toward a Liability each month, including any regular extra payment and excluding escrow (taxes and insurance collected with the payment). Shown as "EMI" for fixed loans. When a Liability is paid off, its Monthly payment rolls into that Country's Monthly savings.
_Avoid_: Escrow-inclusive payment, required payment

### Values over time

**Valuation**:
The value of a Holding, or the balance of a Liability, on a date, in its native currency; at most one per item per day. Recorded each time the User saves a value (an unchanged value still records today's Valuation), and for a Stocks Holding also recorded automatically each day after prices refresh. The only source of past values; values between Valuations are interpolated. In UI copy, the "Value log".
_Avoid_: Live Estimate, snapshot, price

**Current value**:
What a Holding is worth now. For a Stocks Holding, the sum of shares × latest price over its Positions, always computed. For any other Holding, its latest Valuation. A Liability's current balance is its latest Valuation, never amortized forward.
_Avoid_: Live Estimate, latest price

**FX Rate**:
The daily rate of INR per USD. Current values convert at today's rate; a past value converts at the rate on its date. Never stored on a Valuation.
_Avoid_: Exchange rate captured at recording, home-currency rate

**Net Worth**:
The sum of Holdings' current values minus the sum of Liabilities' current balances, each converted to USD at today's FX Rate. Past Net Worth uses interpolated Valuations at each date's FX Rate. Never stored.
_Avoid_: Total assets, balance

**Currency effect**:
The part of a change in USD Net Worth caused only by the rupee moving against the dollar between two dates. INR assets count positive, INR loans negative.
_Avoid_: FX gain, exchange loss

**Equity**:
For a Holding linked to a Liability, the Holding's value minus that Liability's balance, both in USD, at any point, recorded or projected. "% owned" is Equity ÷ value. "Equity built" is the sum across all linked pairs.
_Avoid_: Net position, Projected Net Position, home equity

**Allocation**:
The Portfolio's current split of Holding value across the six Asset Classes, in USD, with each class's share and 12-month change. Descriptive only: there is no target to compare it against.
_Avoid_: Distribution, mix, Target Allocation

**Stale**:
A Holding or Liability whose user-entered figure is more than 30 days old: its latest Valuation for a manually valued Holding or a Liability, or its oldest Hand Price date for a Stocks Holding. Automatic daily Valuations never count, so a Stocks Holding of listed US tickers is never Stale.
_Avoid_: Outdated, expired

### Looking forward

**Projection**:
A month-by-month forward trajectory of every Holding, Liability, Asset Class, Country and Net Worth over the User's horizon. Each Holding compounds at its Asset Class's rate for its Country; each Liability amortizes by its interest rate and Monthly payment, and is "Not on track" if the payment doesn't cover the interest; each Country's Monthly savings are added on top. Holdings and Liabilities are projected separately and netted at each point. FX is held flat at today's rate. Computed in nominal terms.
_Avoid_: Forecast, plan

**Projection Assumptions**:
A User's projection settings: per Country, an inflation rate and Real estate, Stocks and Cash growth rates; one shared rate each for Crypto, Metals and Vehicles & other; a savings growth rate; and a horizon in years. A blank rate means the default, which comes from the Country or the Asset Class.
_Avoid_: Plan settings, growth inputs

**Monthly savings**:
The amount a User adds each month in a Country, in that Country's currency, invested at that Country's Stocks rate and rising each year by the savings growth rate. Freed Monthly payments from paid-off Liabilities are added to it. Counted in Net Worth and the Country totals, never in a single Holding.
_Avoid_: Contribution, Required Contribution

**Today's dollars**:
A figure restated in the purchasing power of the current month, by deflating each Country's series at its own inflation rate and then summing. Applies to past and projected values alike.
_Avoid_: Real terms, inflation-adjusted (in UI copy)

**Goal**:
A Net Worth milestone the User wants to pass: a name plus a target in nominal USD, with no date. A User may have any number. Its date is derived as the first month, in recorded history or the Projection, where Net Worth reaches the target: "Reached ⟨date⟩", "Projected ⟨date⟩", or "Beyond the N-year projection".
_Avoid_: Target Net Worth, target (unqualified)

## Retired terms

Kept here so older docs, tickets and code can still be read:

- **Liability Class**: removed. Liabilities are no longer classed; only the revolving flag remains.
- **Amortization Assumptions**: folded into Liability; every Liability now has a rate and Monthly payment.
- **Live Estimate**: replaced by Current value; a Stocks Holding's value is always computed live.
- **Target Allocation**: dropped; see Allocation.
- **Target Net Worth**: replaced by Goal.
- **Required Contribution**: removed; Goals have no date to solve for.
- **Projected Net Position**: renamed Equity.
- **Held at**: replaced by the Holding's name and Description.
- **Home currency**: everything rolls up to USD.
