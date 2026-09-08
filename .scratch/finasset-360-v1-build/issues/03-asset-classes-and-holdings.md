Type: build
Status: ready-for-agent

# 03: Asset Classes and Holdings in the Miller shell

**What to build:** A signed-in User finds a set of sensible Asset Classes already there, so they can record their first Holding without first designing a taxonomy. They add a Holding under a class with a name and any ISO currency, edit it later, and browse Portfolio → Asset Class → Holding in Finder-style Miller columns with a clickable breadcrumb. They can add their own custom Asset Class when the defaults don't cover something.

This ticket introduces the navigation shell and the visual system that every later UI ticket builds on.

Spec: [`docs/SPEC.md`](../../../docs/SPEC.md) — user stories 6–7, 9–15, 17, 96–101, 108–111.

**Blocked by:** 01.

- [ ] Global default Asset Classes ship with the app and are visible to every User (`owner_id IS NULL`)
- [ ] A User can create a custom Asset Class; it is invisible to other Users
- [ ] Global defaults are readable by everyone and editable by nobody at the row level — `SELECT` where `owner_id IS NULL OR owner_id = auth.uid()`, writes only where `owner_id = auth.uid()`
- [ ] Add, edit and delete a Holding: name, Asset Class, currency
- [ ] Currency is an open ISO-code picker, not a hardcoded list; validated at the application layer only (no DB reference table)
- [ ] Deleting an Asset Class that still has Holdings is refused (`on delete restrict`)
- [ ] Miller columns at ~270px with a clickable breadcrumb; the rightmost column is the detail panel; Portfolio is a breadcrumb root
- [ ] Keyboard navigation with ↑/↓ and tab order
- [ ] One minimal single-stroke monochrome icon per Asset Class, inheriting the row's text colour, never the accent
- [ ] **An unrecognized class id falls back to a neutral glyph as the normal path, not an error** — Users define custom classes, so this is the expected case
- [ ] Visual system: near-monochrome, one desaturated slate accent reserved for selection, no red/green, hairlines, tabular numerals, 15px base, system light/dark, reduced-motion aware, nothing loops
- [ ] Test: User A cannot read, update or delete User B's Holdings
- [ ] Test: a User's custom Asset Class is invisible to other Users
