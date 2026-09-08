Type: grilling
Status: closed — out of scope
Assignee: Adarsh Reddy

## Question

What exactly goes in the research-prompt template for each Asset Class?

Graduated from the map's fog on 2026-09-07, once [the UI shape ticket](02-tree-ui-prototype.md) settled. That fog line was blocked on "depends on what the UI prototype surfaces" — it now has: the prompt is a static, copyable line living in the Holding's detail panel with a Copy action, and no live LLM call for v1 (see the map's settled foundation). So the remaining question is purely the content.

To settle:

- The template text per default Asset Class (Real Estate, Equity, Precious Metal, Cash, Crypto) — Cash plausibly has no useful prompt at all, which is worth deciding rather than assuming.
- Which Holding fields get interpolated (name, last Valuation, as-of date, currency?) and how they're written into the sentence. The prototype's placeholder reads "Look up the current value of {name}. Last recorded {value} on {date}." — confirm or replace.
- What a **custom** Asset Class gets, since users can define their own and there's no authored template for it. A generic fallback, an empty prompt, or a per-class user-editable field?
- Whether the user can edit a template, and if so whether that's per-Holding or per-Asset-Class.
- Whether Liabilities get prompts at all (a mortgage balance is knowable from a statement, not research).

The last two questions may reach into the data model — if templates are user-editable, they need somewhere to live, which would amend [the schema](03-data-model-schema.md).

## Resolution (2026-09-08) — ruled out of scope, feature cut from v1

**The research-prompt feature is removed from v1 entirely.** No prompt on Holding detail, none on Liability detail. For v1 the user reads the number off whatever source they use and types it in — which is already the settled path for every manually-valued Holding, so nothing else in the spec moves.

None of the five sub-questions above were answered, because the feature they belong to no longer exists. They return with it if it returns.

### Why — the split the drafts made visible

The user's instinct on opening the ticket was that a prompt should be **detailed** — moats, competitors, sector position — not a one-line value lookup. Drafting that concretely (below) is what settled the scope, and it split cleanly in a way the ticket had not anticipated:

- The **Real Estate** and **Crypto** prompts answer *"what is this worth right now."* They feed a Valuation. That is the tracker's question — but the prompt is a thin wrapper around a number the user is about to type into the app anyway. A sentence and a Copy button save nothing.
- The **Equity** prompt answers *"should I own this."* Nothing it returns is a Valuation; its output fits no field in the schema. It is the only genuinely interesting one, and it has no home in this product.

So the prompt worth writing is the one this app can't use, and the ones this app could use aren't worth a feature.

The ticket's framing — one template per Asset Class — also doesn't survive the drafting. The good prompt is **Equity-shaped and doesn't generalize**: Real Estate wants comparable sales, Crypto wants a spot price, Cash wants silence, Precious Metal is already live-priced via Metals.Dev so a prompt there competes with a number the app already has. There is no per-class family here, just one strong prompt and several weak ones.

### What "already built" turned out to mean

The keep-it argument was that the feature already exists and costs nothing. It doesn't. `git ls-files` is empty — the repo has **no application source at all**. The only artifact is ~25 lines in the throwaway prototype (`prototypes/tree-ui/variant-e.html`, `eBuildActionsRow`) rendering one hardcoded sentence and a clipboard button, with no per-class variation and no template storage. A throwaway prototype is throwaway by construction: deleting the block is smaller than the ticket that would have specified it. With that argument gone, nothing stood against the cut.

### What the cut removes

- The `research_prompt_template` column that would have been needed on `asset_class` to make templates editable.
- The **custom-Asset-Class fallback** problem — users define their own classes, and no authored template could exist for them.
- The **global-defaults editability** problem: `asset_class` RLS grants `UPDATE` only where `owner_id = auth.uid()`, and global defaults are `owner_id IS NULL`, so a user could never have edited the shipped templates without a copy-on-write mechanism invented solely for this feature.
- A bug already latent in the prototype: `eBuildActionsRow` is shared, so the research line rendered on **Liability** detail too — inviting the user to research a mortgage balance that is knowable only from a statement, and that no LLM can know.

### Preserved drafts

Kept verbatim so the idea is recoverable whole if it is picked up as its own effort.

**Real Estate** — manually valued by settled decision (no automated home-value lookup):

```
I own a property at {name}. Give me an independent estimate of its
current market value for personal net-worth tracking.

1. Recent comparable sales in the last 6-12 months within ~1km,
   matched on property type, bedrooms and floor area. For each:
   price, date, size, distance.
2. Current local price per sq ft and its 12-month trend.
3. Anything that moves THIS property off the comp average —
   condition, floor, aspect, remaining lease, planned infrastructure.
4. A point estimate and a range, with your confidence and why.

For reference I last recorded INR 45,00,000 on 2026-03-12.
Don't anchor on it — tell me if it looks wrong.
```

**Crypto** — not in the price cache (Finnhub is equities, Metals.Dev is metals), so manually valued:

```
I hold {quantity} {name}. Give me the current spot price in {currency},
the 30-day and 12-month range, and my position's total value.
Flag any move over 10% in the last week and what caused it.
```

**Equity** — the deep prompt, and the reason the feature is worth pursuing somewhere else:

```
I hold {quantity} shares of {name}. Beyond the price, help me
understand what I own.

1. Where does revenue actually come from — by segment, most recent
   fiscal year.
2. What is the moat, and is it widening or narrowing? Cite specific
   evidence: pricing power, switching costs, network effects,
   regulatory protection, cost advantage.
3. The three closest competitors, and how relative market share has
   moved over three years.
4. Sector position — what structural forces are acting on this
   industry, and does this company benefit or suffer?
5. Valuation multiples vs its own 5-year history and vs those peers.
6. The two most credible bear arguments.

Cite sources with dates. No buy/sell recommendation.
```

**Cash** and **Precious Metal**: no prompt. Cash is a balance read off a statement; Precious Metal is already live-priced.

### Interpolation notes, if it ever returns

Two defects in the prototype's placeholder line, worth not repeating:

- It formatted the amount with `fmtMoney` and no currency marker, so a EUR Holding rendered as `$450,000`. Any future version must carry the ISO code — a Holding's `currency` is fixed per row and is not the Portfolio's home currency.
- "Last recorded {value} on {date}" invites the model to anchor on a stale figure instead of finding an independent one. The drafts above reframe it as a plausibility check ("don't anchor on it — tell me if it looks wrong").
- A Holding with **no Valuation yet** must degrade to the first sentence alone. That is the first-run case, and the case where a prompt would have been most useful.

### Follow-through

- Map's settled foundation: the "Research-prompt feature" line struck; replaced by a manual-entry line.
- Map's **Out of scope**: one line added, linking here.
- Prototype `variant-e.html`: research block removed from `eBuildActionsRow`, leaving Archive on both Holding and Liability detail.
- `CONTEXT.md`: unaffected — the glossary never carried a Research Prompt term.
