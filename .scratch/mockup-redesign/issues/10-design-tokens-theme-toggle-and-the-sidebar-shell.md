> Snapshot of [#10](https://github.com/adarsh645-git/finasset-360/issues/10). The GitHub issue is canonical.

# Design tokens, theme toggle, and the sidebar shell

Type: build
State: closed (not planned)
Blocked by: none

## Question

Stand up the new chrome over **current data**, with no domain changes:
- the mockup's tokens (light and dark, class colours, country colours, radii, type scale) as Tailwind v4 `@theme` variables in `globals.css`;
- a light/dark toggle persisted in a cookie and read server-side;
- the desktop **sidebar shell** (240px, sticky) with brand, Net Worth with its 12-month change, nav (Overview, Assets, Liabilities, Growth, Goals, with compact totals), the "Asset classes" sub-list, "+ Add account or asset", the theme toggle, and re-homed sign-in chrome (display name, Sign out);
- the real routes as placeholder pages.

Move the Miller shell to `/legacy` so production keeps working. Tablet and phone chrome (top bar, tabs, bottom tab bar) belong to the responsive pass and are not part of this ticket.

Tracer bullet: one deploy where `/` shows the new sidebar around a placeholder Overview and `/legacy` is the old app.

**Blocked by:** none. Class names in the sub-list follow current data until #2 lands.

## Comments

### adarsh645-git, 2026-10-14

Ruled out of scope on 2026-10-13. The map was re-charted to planning only: it now hands off to an ordered sequence of OpenSpec changes rather than carrying build work. This slice's content (tokens, theme toggle, sidebar shell / the shared SVG chart primitive) moves into those changes' specs and tasks, sequenced by the change-split ticket. Settled choices recorded on the map stay as decisions.
