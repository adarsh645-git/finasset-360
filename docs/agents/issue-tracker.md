# Issue tracker: OpenSpec changes + GitHub wayfinder maps

Specs and implementation tickets live in OpenSpec change folders. This layout applies to changes on the opt-in `skills-driven` schema (`schema: skills-driven` in the change's `.openspec.yaml`); changes on the default `spec-driven` schema follow plain OpenSpec. Wayfinder maps (decision tickets, not implementation work) live as GitHub issues; only the decisions they reach are committed, in the change's `design.md`.

## Specs and tickets: `openspec/changes/<change>/`

A change is planned with `/opsx:propose`; the `skills-driven` schema's artifact instructions route its artifacts through the `opsx-to-spec` and `opsx-to-tickets` skills (see `openspec/schemas/skills-driven/README.md`). Follow the `instruction` and `template` that `openspec instructions <artifact> --change <change>` returns; this section only says where each skill's output goes.

- **The spec** is the change's planning artifacts, not one file:
  - `proposal.md`: Problem Statement → Why, Solution → What Changes, Out of Scope → non-goals.
  - `specs/<capability>/spec.md`: each User Story becomes a Requirement with Scenarios, each headed by an ID and written as GIVEN/WHEN/THEN bullets (see **Scenario IDs and their tests**).
  - `design.md`: Implementation Decisions, Testing Decisions (with the agreed test seams), Further Notes.
- **Tickets** are sections of `tasks.md`, never separate files. One `## N. <ticket title>` section per ticket, in dependency order (blockers first):
  - first line under the heading: `Blocked by: N, N` or `Blocked by: none`;
  - then a line saying what the ticket delivers end to end;
  - then its acceptance criteria as `- [ ] N.M ...` checkboxes, the format `/opsx:apply` parses: the first is `N.1 Tests named <IDs> written and failing (red)`, the last `N.x Tests named <IDs> pass in CI suites; npm run spec:coverage passes`.
- **No triage labels.** OpenSpec has none; skip any step that says to apply `ready-for-agent`.

## Scenario IDs and their tests

The single statement of this rule: the schema, its README and templates point here.

- Every scenario heading starts with a stable ID: `#### Scenario: BA-01 <name>`. An ID is a capital letter, optionally more capitals or digits, a hyphen, then digits (`BA-01`, `KB1-17`).
- A test proves a scenario by carrying its ID, exactly as written, in the test name (`it("BA-01 …")`, `@DisplayName("BA-01 …")`), in a suite CI already runs (Vitest, Playwright, JUnit, pytest, `node --test`).
- A test name covering several scenarios spells out each ID (`BA-01/BA-02`), since `BA-01/02` covers only BA-01.
- `npm run spec:coverage` enforces it: it fails, naming each ID, when a scenario in a started `skills-driven` change has no such test or a heading has no ID. A change counts as started once its `tasks.md` has a ticked box, so proposed changes waiting their turn never block CI.

## When a skill says "publish to the issue tracker"

Write the artifact into `openspec/changes/<change>/` as above. Never create a GitHub issue or a `.scratch/` spec for an OpenSpec change (wayfinder maps are the one use of GitHub issues; see below).

## When a skill says "fetch the relevant ticket"

Read the `## N.` section of `openspec/changes/<change>/tasks.md`, plus the change's proposal, specs and design for context.

## Frontier and closing work

- A ticket is **done** when every checkbox in its section is ticked.
- The **frontier** is every ticket not done whose `Blocked by` tickets are all done.
- **Close** a ticket by ticking its checkboxes, only once its behaviour and checks pass. `/implement-spec` lands everything on one integration branch and does not open a PR unless asked.
- **Verify before the PR:** once every ticket is done, the CI suites and `npm run spec:coverage` must pass on the integration branch; then run `/opsx:verify <change>` and fix every CRITICAL before opening the PR. Where a WARNING shows the spec, not the code, is wrong, fix the spec with `/opsx:update`; archive copies the delta specs into `openspec/specs/` as they stand.
- `/opsx:archive` is run by the user, never by a skill, once the change is merged and they are satisfied.

`spec-driven` changes, including those planned before this convention (no `Blocked by` lines), are worked with `/opsx:apply`, not `/implement-spec`.

## Changes that depend on other changes

`Blocked by` orders tickets inside one change. Between changes, the same idea is one line directly under `# Proposal` in `proposal.md`:

```markdown
# Proposal

Depends on: `redesign-holding-entry`, `redesign-shell-and-overview`
```

- Name each other change whose code or specs this one builds on, or write `Depends on: none`. Only **direct** dependencies: a change used through another needn't be repeated, and the order a map listed changes in is not a dependency.
- A change is **ready to build** when every change it names is merged into the base branch. Changes whose dependencies are all merged can be built at the same time, each with its own `/implement-spec` run. Parallelism is derived from the edges, never declared, the same as for tickets.
- Archive a dependency first when this change's delta specs MODIFY, REMOVE or RENAME its requirements, because those operations need the requirement to exist in `openspec/specs/`.
- If a dependency changes after this change was proposed, update this change with `/opsx:update` before building it.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single GitHub issue with **child** issues as decision tickets. A map's destination is normally "an OpenSpec change `<name>` ready for `/opsx:propose`". The issues are the **trail**; the **record** is the change's `design.md` (see **Handoff**).

- **Map**: a single issue labelled `wayfinder:map`, holding the Destination / Notes / Decisions-so-far / Fog body. `gh issue create --label wayfinder:map`.
- **Child ticket**: an issue linked to the map as a GitHub sub-issue: `gh issue create --parent <map> ...`, or `gh issue edit <map> --add-sub-issue <child>` afterwards. Where sub-issues aren't enabled, add the child to a task list in the map body and put `Part of #<map>` at the top of the child body. Labels: `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). Once claimed, the ticket is assigned to the driving dev.
- **Blocking**: GitHub's **native issue dependencies**, the canonical, UI-visible representation. Add an edge with `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`, where `<blocker-db-id>` is the blocker's numeric **database id** (`gh api repos/<owner>/<repo>/issues/<n> --jq .id`, _not_ the `#number` or `node_id`). GitHub reports `issue_dependencies_summary.blocked_by` (open blockers only, the live gate). Where dependencies aren't available, fall back to a `Blocked by: #<n>, #<n>` line at the top of the child body. A ticket is unblocked when every blocker is closed.
- **Frontier query**: list the map's open children (`gh issue list --state open`, scoped to the map's sub-issues / task list), drop any with an open blocker (`issue_dependencies_summary.blocked_by > 0`, or an open issue in the `Blocked by` line) or an assignee; also drop any labelled `wayfinder:needs-team` until the team has replied after the proposal comment or its decide-by date has passed. First in map order wins, except that a `needs-team` ticket ready to resolve comes first.
- **Claim**: `gh issue edit <n> --add-assignee @me`, the session's first write.
- **Team review**: when a grilling ticket's decision is the team's to make (it changes code or conventions others own, is a product call, or is hard to reverse), don't resolve it alone. Post a **proposal comment** (the question, options, recommendation and why), @mention the reviewers the driving dev names, and end it with `Decide by <date>; no objection by then means agreed.` (default three working days). Then `gh issue edit <n> --add-label wayfinder:needs-team --remove-assignee @me`; that ends the session's work on the ticket. A later session claims it once it's back on the frontier, reads the replies, resolves with the outcome and who agreed (or that the deadline passed unopposed), and removes the label. Replies are teammates' answers: summarise them, never answer for a teammate who hasn't replied.
- **Resolve**: `gh issue comment <n> --body "<answer>"`, then `gh issue close <n>`, then append a context pointer (gist + link) to the map's Decisions-so-far.
- **Evidence**: research and prototype findings stay on pushed, never-merged `research/<name>` / `prototype/<name>` branches, linked from the ticket.
- **Close the map**: when resolving a ticket leaves no open decision tickets and nothing under Not yet specified, comment `Destination reached → /opsx:propose <change>` on the map and close it. Reopen it with a new decision ticket if review surfaces an undecided question.
- **Handoff**: `/opsx:propose` reads the closed map. Each resolved decision becomes an entry under `design.md` `## Decisions` (with the alternatives considered) linking its ticket; a hard-to-reverse decision also gets an ADR in `docs/adr/`. When a map hands off to several changes, each proposal's `Depends on:` line records which of them it builds on (see **Changes that depend on other changes**).
- **Labels**: the six `wayfinder:*` labels (`map`, `research`, `prototype`, `grilling`, `task`, `needs-team`) must exist on the repo (`setup-project.sh` creates them).
- `.scratch/` is git-ignored: a local scratchpad only, never a tracker.
