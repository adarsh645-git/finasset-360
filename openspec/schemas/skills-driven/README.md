# skills-driven schema (opt-in)

The same four artifacts as the default `spec-driven` schema (proposal → specs → design → tasks), written through Matt Pocock's skills:

- `proposal`, `specs` and `design` go through the `opsx-to-spec` skill: user stories become requirements, and test seams are confirmed with you.
- `tasks` goes through the `opsx-to-tickets` skill: tracer-bullet tickets, each with a `Blocked by:` line and red-first boxes, confirmed with you before writing. `/implement-spec` builds the ready tickets in parallel.
- Every scenario has an ID and GIVEN/WHEN/THEN bullets, and is proven by a test named with that ID; `npm run spec:coverage` enforces it. The rule is in `docs/agents/issue-tracker.md` (Scenario IDs and their tests).

The team's rules in `openspec/config.yaml` apply to both schemas. Changes on `spec-driven` are untouched.

## Opting in

- **One change:** `/opsx:propose <change> with the skills-driven schema`, or `openspec new change <change> --schema skills-driven`. The schema is stored in the change's `.openspec.yaml`, so update, verify and archive follow it.
- **All your changes:** add this to your personal `~/.claude/CLAUDE.md`:

  > In repos that contain `openspec/schemas/skills-driven/`, create new OpenSpec changes with the skills-driven schema (`--schema skills-driven`) unless I ask for spec-driven.

## The full flow

`/wayfinder` or `/grill-with-docs` → `/opsx:propose` → review (`/opsx:update`, `openspec validate --strict`) → `/implement-spec openspec/changes/<change>` → `/opsx:verify` → PR → `/opsx:archive`.

`/wayfinder`, `/grill-with-docs` and `/implement-spec` are Matt Pocock's personal skills; the `opsx-to-*` skills ship with this repo in `.claude/skills/`. Where each skill's output lands is in `docs/agents/issue-tracker.md`.
