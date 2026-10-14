> Snapshot of [#3](https://github.com/adarsh645-git/finasset-360/issues/3). The GitHub issue is canonical.

# Liabilities as loans

Type: grilling
State: open
Blocked by: none

## Question

The mockup's `Loan` is flat: name, Country, principal, balance, APR, EMI, optional term, start date, optional linked Holding, and a `revolving` flag for credit cards. There are no Liability Classes. Today there are Liability Classes (mirroring Asset Classes), balances recorded as Liability Valuations, and optional Amortization Assumptions (rate, required payment, extra payment, escrow) linking to a Holding.

Decide:
- whether Liability Classes go away (and whether `revolving` is the only distinction left);
- how principal, start date and EMI map onto Amortization Assumptions, and which become required. The mockup assumes every loan has an EMI;
- whether a balance is still recorded as Valuations (history), or the mockup's "paid down in 12 mo" and the payoff timeline are derived from amortization alone;
- the fate of extra payment and escrow, and of a freed payment flowing into contributions (tied to 05);
- the vocabulary: "Liability" vs "Loan" in the UI and CONTEXT.md.

**Blocked by:** none.
