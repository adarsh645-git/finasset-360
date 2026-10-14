> Snapshot of [#16](https://github.com/adarsh645-git/finasset-360/issues/16). The GitHub issue is canonical.

# Which OpenSpec changes, in what order

Type: grilling
State: open
Blocked by: #1, #2, #3, #4, #5, #6, #7, #8, #12

## Question

Split the redesign into an **ordered sequence of OpenSpec changes**, each one shippable to production on its own and reviewable in one pass, each ready for `/opsx:propose` (skills-driven schema). This is the map's last ticket: once it's resolved, the map closes with the sequence as its handoff.

Decide, with the domain decisions from every other ticket in hand:
- the changes, their names and their order. A starting sketch: `data-model-v2` (new schema from scratch, since there's no data to keep), then calculations (equity, projection, today's dollars, change attribution, goal dates; pure functions behind the projection test seam), then tokens + sidebar shell + the shared SVG chart primitive, then the page groups, then cutover;
- whether **responsive behaviour** (the handoff's phone/tablet/desktop section) ships inside each page change or as its own closing change;
- where **empty and first-run states** land, since the mockup always has sample data;
- **cutover**: when the Miller shell is deleted (the map's earlier plan kept it at `/legacy` until a final cutover), and when `docs/SPEC.md`, `CONTEXT.md` and the superseded ADRs are updated;
- which decisions from this map go into which change's `design.md` under `## Decisions`.

Reference: [design handoff](https://github.com/adarsh645-git/finasset-360/tree/main/docs/design/portfolio-tracker).
