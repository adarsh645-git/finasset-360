Type: grilling
Status: resolved
Assignee: Adarsh Reddy

## Question

Introduce a **Target Net Worth**: an amount the User wants to reach by a specific date, and the gap between it and the Projection. Three things to settle:

**1. Today's dollars or future dollars?** This is the sharp one. The map's settled foundation says "nominal rate only, no inflation adjustment," which was defensible for a flat-contribution projection. [Itemized contributions with escalation](12-itemized-contributions.md) breaks that: contribution escalation is an inflation-shaped assumption, and stacking it on a nominal growth rate compounds the optimism.

Concretely, on the running sample (Holdings 898,790, 6% growth, 7,400/mo itemized, 5% escalation): the projection reaches **8,166,250 by 2046**, which at 3% inflation is roughly **4.5M in today's money**. A user setting "6M by 2046" is near-certainly thinking in today's dollars, and the app would tell them they'd hit it in 2043. Options: state the target in future dollars and say so plainly; state it in today's dollars and deflate the projection to match; or add an inflation assumption and show both lines.

**2. Naming.** `Target Allocation` is defined in CONTEXT.md as explicitly present-tense ("describes a desired balance, not a trajectory"), with an `_Avoid_` line warning off "goal" and "plan" as too vague. A future-dated Net Worth goal is a third kind of thing alongside Target Allocation and Projection. Does it share the "Target" prefix, and what does that do to the existing term's carefully drawn present-tense boundary?

**3. The gap display.** What the user sees: the target as a point on the existing hero timeline, the shortfall or surplus as a figure, and whether "on track" is a binary or a trajectory. Note the Miller-column shape from [Tree-UI prototype](02-tree-ui-prototype.md) already fixes where this lives (the Plan root).

Adds fields to the `projection` row — a second schema amendment beyond [Data-model schema](03-data-model-schema.md)'s two existing ones.

## Answer

### 1. Dollar basis: compute nominal, display real, chart both

Every input stays **nominal** — 6% growth, 5% contribution escalation, 6.25% loan rate — exactly as those rates are quoted in the world. The projection computes precisely as [Projection method](04-projection-method.md) specifies, untouched. A new **expected inflation** assumption (default 3%) then deflates the finished Net Worth line for display:

```
real(y) = nominal(y) / (1 + inflation)^y
```

One divide, applied last, at display time only. **Both lines are charted** — the raw dollar figure alone means nothing to a reader, and the divergence between the two is the most useful thing on the plot. On the sample portfolio a 6,000,000 target drawn as a horizontal line is crossed by the nominal line in **2043** and the real line in **2051**: same portfolio, same target, **7.9 years apart** depending only on how the number is read.

**Why not a real growth rate instead** (the tempting simplification — no inflation field, user types "3% real"): the liability side cannot be converted. A mortgage rate is contractual; the bank charges 6.25% on a nominal balance and takes a fixed nominal payment regardless of inflation. There is no real-terms version of that loan. Running it anyway lands **63,017 above** the correct figure at year 20, and "fixing" it by deflating the liability too makes it **72,189** off — because the payments were made in nominal dollars at many different points in time, and one final deflation can't unwind that. It also pushes the conversion onto the user, who must restate growth *and* escalation in real terms consistently or compound an invisible error for twenty years.

**What deflating the whole figure gets for free**: it surfaces that inflation erodes debt. The 3,155/mo mortgage payment is worth 2,348/mo by year 10 and 1,909/mo by year 17 in today's money, without the payment ever changing — a real gain to the borrower that the nominal-only view hides completely.

**Cost, stated plainly**: this is a fourth compounding assumption alongside growth, escalation and freed-payment reinvestment. Accepted because it's the one that makes the other three legible — the same model that produces a confident 8,166,250 produces 4,521,455 that means what it says.

### 2. Naming: Target Net Worth

The term names the **pair** — an amount *and* a date — not a bare amount. Stated in today's purchasing power, consistent with §1.

The feared collision with `Target Allocation` (defined in CONTEXT.md as explicitly present-tense) is imagined: nobody confuses a percentage split across Asset Classes with a dollar figure at a date. What needed correcting was the implication that the **`Target` prefix carries tense** — it doesn't. It means "a value the User is aiming at"; the tense rides on the noun. Target Allocation's own present-tense line stays true as written.

Rejected: `Net Worth Goal` (collides with Target Allocation's `_Avoid_` line), `Milestone` (no collision, but loses the parallel).

### 3. One Target, not several

Several targets would be one projection line with several markers — not multi-scenario, so not ruled out by the settled foundation. Rejected anyway for two reasons:

- [Required-contribution solver](13-required-contribution-solver.md) solves for a single required contribution. With N targets it must pick which to solve for, or find the binding constraint — real machinery for v1.
- The Projection is portfolio-wide with no earmarking, so a near-term goal ("house deposit 200k by 2030") measured against *total* Net Worth is close to meaningless: you'd be told you can afford the deposit because your 401k is large.

### 4. Display

**The real line starts at today.** Deflating the future is a divide; deflating the *past* means multiplying recorded values up to today's purchasing power, which needs real historical CPI the app doesn't store. So recorded history stays nominal as recorded, the two lines coincide at today (deflator = 1), and the single line forks into two at the "Today" marker. History is a record; only the future is a guess, and the fork shows exactly where the guessing starts. Rejected: deflating history by the assumed rate (restates real history through a made-up number), and fetching CPI (new data dependency and failure mode).

**Real is the primary line.** The headline figure, the Target comparison and the solver all read from it — it answers the question the user asked, and it's the basis their typed Target is already in. Nominal is drawn as a fainter reference so the number they'd see on a future statement isn't hidden. No user toggle: that's a second mode to design and explain for a preference nobody holds strongly.

**The gap is a date and a figure, date leading.** At a 6M target in 2046 the same portfolio is 2,166,250 *over* on the nominal line and 1,478,545 *short* on the real line. Display reads as "2051 — five years late", with the dollar figure beneath. The date is the sentence someone acts on, and it degrades gracefully when a target is unreachable at any contribution, which a shortfall figure does not.

**A passed target date prompts on next visit** — "your 2046 target has passed; you reached 5.2M against 6M. Set a new one?" A stale target quietly poisons every later projection view, and silent auto-archiving throws away the one moment the app can say something true about whether the plan worked. With a single Target (§3), replacing it is a one-field edit.

### Schema amendment required

`projection` gains `target_amount`, `target_date`, and `inflation_rate` — a third amendment to [Data-model schema](03-data-model-schema.md), recorded there.

### CONTEXT.md updates made alongside this ticket

- **Target Net Worth** (new term).
- **Projection** — widened to state the nominal-compute / real-display split and the two charted lines.
- **Target Allocation** — clarified that the `Target` prefix denotes a value aimed at, not a tense.
