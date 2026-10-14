# Liabilities are amortizing loans, not classed balances

Liability Classes are removed. Every Liability is a flat loan with a required interest rate and Monthly payment, so its payoff always projects. "Revolving" (a credit card) is the only distinction left. Extra payment and escrow are no longer separate fields: a regular extra payment is part of the Monthly payment, and escrow is left out of it, which keeps the payoff math right. Balance history stays as recorded Valuations (ADR 0003); only the future is amortized, and nothing before the first recorded balance is back-filled.

## Considered Options

Keeping optional amortization (today's design) was rejected because the Projection and the Liabilities page assume every loan has a payment. Bringing classes or escrow back later would mean a schema change and a vocabulary change.

Decided in [Liabilities as loans](https://github.com/adarsh645-git/finasset-360/issues/3).

## Status

accepted
