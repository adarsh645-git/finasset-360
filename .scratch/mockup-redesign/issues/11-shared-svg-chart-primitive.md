> Snapshot of [#11](https://github.com/adarsh645-git/finasset-360/issues/11). The GitHub issue is canonical.

# Shared SVG chart primitive

Type: build
State: closed (not planned)
Blocked by: none

## Question

Build the one hand-rolled SVG chart primitive every mockup chart uses: time x-axis, y-axis (36px on phone), lines and areas, stacked areas, a solid → dashed split at today with a shaded projection region and a "Today → projected" marker, dotted labelled reference lines (goals), right-edge value labels (hidden on phone), a crosshair tooltip (date, "· projected", rows with colour dots), and touch (tap/drag shows the tooltip, which clears ~1.8s after release, with `touch-action: pan-y`). Height × 0.78 on phone.

Tracer bullet: the Overview placeholder from #10 renders the current Net Worth timeline plus the existing projection through it. `NetWorthTimelineChart` is the starting point.

**Blocked by:** #10.

## Comments

### adarsh645-git, 2026-10-14

Ruled out of scope on 2026-10-13. The map was re-charted to planning only: it now hands off to an ordered sequence of OpenSpec changes rather than carrying build work. This slice's content (tokens, theme toggle, sidebar shell / the shared SVG chart primitive) moves into those changes' specs and tasks, sequenced by the change-split ticket. Settled choices recorded on the map stay as decisions.
