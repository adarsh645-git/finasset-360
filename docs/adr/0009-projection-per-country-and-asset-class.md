# Projection is per Country and per Asset Class, monthly, with FX held flat

The Projection runs month by month. Each Holding compounds at its Asset Class's rate, which is per Country for Real estate, Stocks and Cash and shared for Crypto, Metals and Vehicles & other. Every Liability amortizes by its Monthly payment, so no Liability is held flat. Each Country's Monthly savings, rising by a savings growth rate and joined by freed loan payments, are invested at that Country's Stocks rate. FX is held flat at today's rate. Today's dollars deflates each Country's series at that Country's own inflation and then sums. Goals compare against the nominal total.

This replaces the single growth rate, single inflation rate and Required Contribution solver. The Projection Assumptions storage, the Growth page's assumptions card, the meaning of today's dollars and every Goal date all key off this shape, which is why it is hard to reverse.

## Considered Options

An FX depreciation assumption was deferred, since the design holds FX flat. Dropping savings entirely (the design's default) was rejected by the User.

Decided in [Projection assumptions: per-Country rates, and contributions' fate](https://github.com/adarsh645-git/finasset-360/issues/5), [Keep monthly savings in the projection?](https://github.com/adarsh645-git/finasset-360/issues/19) and [Goals replace Target Net Worth?](https://github.com/adarsh645-git/finasset-360/issues/6).

## Status

accepted
