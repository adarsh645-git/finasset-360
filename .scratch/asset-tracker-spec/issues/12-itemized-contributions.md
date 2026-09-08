Type: grilling
Status: resolved
Assignee: Adarsh Reddy

## Question

Replace the Projection's single typed `monthly_contribution` scalar with an **itemized list of named contribution lines** plus **one annual escalation rate**.

Decided at charting (see the map's Out of scope entry): a full compensation model — salary, bonus, stock comp, blended tax rate, per-source savings rates — is *not* being built. Measurements that settled it: RSU vest lumpiness vs. a smoothed monthly equivalent is worth **0.99%** over 20 years; a user-guessed blended tax rate swings the answer by **5%** (a 208,000 spread between 28% and 37%), i.e. the derived number is less reliable than a typed one. What the comp model would genuinely have bought — catching a forgotten 401k employer match, worth **346,531 (9%)** on the sample — is a form-design problem, solved by a labelled empty row.

What escalation buys, by contrast, is large: at 7,400/mo over 20 years, 0% → 5% escalation moves the result from **6,450,441 to 8,166,250** (+27%), and cuts the *required starting* contribution to hit a 6M target from **6,425/mo to 4,278/mo**.

To settle:

- **The line shape.** Name + amount, and what else — is a line tagged by kind (pre-tax / employer / taxable), or is it free-text with an amount? The employer-match row is the one that must be prompted for by existing rather than derived.
- **Does escalation apply per-line or globally?** An employer match scales with salary; a fixed brokerage transfer might not. One global rate is simpler and matches the "one blunt assumption the user owns" pattern already used for the growth rate.
- **Escalation is contribution growth, not salary growth** — deliberately, so a user can say "salary grows 5%, but I'll realistically only raise savings 3%" (lifestyle creep). Confirm the field is labelled to make that distinction land.
- **The freed-payment redirect gets simpler.** [Projection formula reconciliation](07-projection-formula-reconciliation.md) specified that a paid-off loan's freed payment is added to the monthly contribution, mutating a scalar mid-projection. With itemized lines it becomes a line that *appears* at payoff — arguably visible in the UI as such. Confirm and restate.
- **Formula shape.** Annual escalation is 20 one-year closed-form segments; that is the same segmented chain [Projection method](04-projection-method.md) already specifies for the payoff staircase, just with more steps. Confirm the two step sources compose (a payoff mid-year and an escalation anniversary in the same year).

Schema: `projection` gains an escalation rate and a child `contribution_line` table, replacing the scalar column [Data-model schema](03-data-model-schema.md) fixed.

## Answer

**Itemization rejected. The single `monthly_contribution` scalar is retained, with one new `contribution_escalation_rate` field defaulting to 0.**

### Why itemization was dropped

Two reasons, the second decisive.

**It presumes employment.** The seeded rows the design depended on — *My 401k deferral*, *Employer match*, *Brokerage transfer* — are job-shaped, and specifically US-salaried-with-a-matching-plan shaped. A retiree living off investments, a freelancer, someone between jobs, or anyone outside the US gets a form that quietly tells them they're using the app wrong. The single question "how much can you add each month?" works for everyone.

**It had exactly one real job, and one sentence does it.** Everything else about itemization turned out decorative:

- **Kind tags compute nothing.** With no tax model (by decision), pre-tax vs. taxable vs. employer affects no formula. A taxonomy for its own sake.
- **Per-line escalation is expressively redundant.** Measured: half the contribution escalating at 5% with half flat lands at 7,308,346 against 8,166,250 for all-escalating — a material 857,904 (10.5%) difference, but **a single global rate of 2.9% reproduces that same outcome**. Any per-line mix has a near-equivalent global rate. (The equivalence holds at the horizon; intermediate years differ slightly, since a blend of two exponentials isn't one exponential.)

The one genuine job was **prompting for a forgotten employer match, worth 346,531 (9%)** on the sample — the very thing that justified rejecting the compensation model in favour of this ticket. That is fully served by helper text under a single field: *"include your own contributions plus any employer match."* No schema, no child table, no assumption that the user has a job.

So this resolves as a decision **not to build**, leaving [Projection method](04-projection-method.md)'s existing scalar exactly as specified.

**What is lost:** components made "adjust a contribution and watch the target move" tangible — you could raise one line rather than edit an aggregate. With one field you edit one number, which is arguably clearer, and the [Required-contribution solver](13-required-contribution-solver.md) gets simpler for it: it reports one number against one number, with nothing to apportion.

### What was kept: escalation

Escalation is separable from itemization and job-agnostic — it asks whether contributions grow over time, which is as true of a freelancer with a growing book, or someone whose expenses fall, as of a salaried employee. It is also the largest single input measured in this effort:

| | Year-20 Net Worth |
|---|---|
| Flat contribution | 6,450,441 |
| Growing 5%/yr | **8,166,250** (+27%) |

Inverted, which is how the solver reports it: hitting a 6M target needs **6,425/mo flat** but only **4,278/mo** at 5% growth. Assuming flat contributions for twenty years is itself a strong assumption — just an invisible one.

**Default 0**, so it is opt-in and the simple case behaves exactly as today.

**It is contribution growth, not salary growth**, and must be labelled to make that land — so a user can say "my salary grows 5% but I'll realistically only raise savings 3%." Lifestyle creep is the common case and the model should not assume it away.

### Formula shape — verified, not assumed

`C` is piecewise-constant from **two** step sources: escalation anniversaries (annual) and loan payoffs (from [Projection formula reconciliation](07-projection-formula-reconciliation.md)). They compose without interaction — a payoff falling mid-escalation-year simply splits that year into two segments.

Checked numerically against a month-by-month simulation on the sample (7,400/mo, 5% escalation, mortgage payoff at month 218, 20-year horizon): the segmented closed form over **21 segments** agrees to **1×10⁻⁷**. No simulation is required in the implementation; the chain of closed-form segments is exact.

### Schema

`projection` gains `contribution_escalation_rate numeric null default 0`. The `contribution_line` child table proposed by this ticket is **not** created, and `monthly_contribution` stays a scalar column. Recorded as a fourth amendment on [Data-model schema](03-data-model-schema.md).
