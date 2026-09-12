Type: build
Status: resolved

# 03: Asset Classes and Holdings in the Miller shell

**What to build:** A signed-in User finds a set of sensible Asset Classes already there, so they can record their first Holding without first designing a taxonomy. They add a Holding under a class with a name and any ISO currency, edit it later, and browse Portfolio → Asset Class → Holding in Finder-style Miller columns with a clickable breadcrumb. They can add their own custom Asset Class when the defaults don't cover something.

This ticket introduces the navigation shell and the visual system that every later UI ticket builds on.

Spec: [`docs/SPEC.md`](../../../docs/SPEC.md) — user stories 6–7, 9–15, 17, 96–101, 108–111.

**Blocked by:** 01.

- [x] Global default Asset Classes ship with the app and are visible to every User (`owner_id IS NULL`)
- [x] A User can create a custom Asset Class; it is invisible to other Users
- [x] Global defaults are readable by everyone and editable by nobody at the row level — `SELECT` where `owner_id IS NULL OR owner_id = auth.uid()`, writes only where `owner_id = auth.uid()`
- [x] Add, edit and delete a Holding: name, Asset Class, currency
- [x] Currency is an open ISO-code picker, not a hardcoded list; validated at the application layer only (no DB reference table)
- [x] Deleting an Asset Class that still has Holdings is refused (`on delete restrict`)
- [x] Miller columns at ~270px with a clickable breadcrumb; the rightmost column is the detail panel; Portfolio is a breadcrumb root
- [x] Keyboard navigation with ↑/↓ and tab order
- [x] One minimal single-stroke monochrome icon per Asset Class, inheriting the row's text colour, never the accent
- [x] **An unrecognized class id falls back to a neutral glyph as the normal path, not an error** — Users define custom classes, so this is the expected case
- [x] Visual system: near-monochrome, one desaturated slate accent reserved for selection, no red/green, hairlines, tabular numerals, 15px base, system light/dark, reduced-motion aware, nothing loops
- [x] Test: User A cannot read, update or delete User B's Holdings
- [x] Test: a User's custom Asset Class is invisible to other Users

**Resolved:** all criteria verified against the local Supabase harness (`npm test`, 34/34 passing, including the two new route-boundary files exercising the RLS cases above) plus `npm run typecheck` and `npm run lint`. The Miller shell, keyboard navigation, icon fallback, and visual system are implemented but **not agent-verified in a browser** — per this map's own note, UI correctness is verified by hand at the user's viewport, not by agent-driven Chrome. The local dev server has Google OAuth configured, so it's directly testable at `http://localhost:3000`. Two known, deliberately deferred items: story 99's two-column wide-screen dashboard layout is not built, since the dashboard has no real content yet to fill two columns (Net Worth and the timeline land in later tickets); and `asset_class` picked up a `created_at` column beyond the schema's literal contract, matching the precedent `portfolio` and `holding` already set in this codebase.
