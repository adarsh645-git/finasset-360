# Changelog: Portfolio Tracker

Each version is a frozen snapshot in `versions/`. The working file is `Portfolio Tracker.dc.html` at the project root. When it changes, a new entry is added here describing what changed since the previous version.

---

## v1 · 2026-10-07 (baseline, handed off)
Snapshot: `versions/v1 - 2026-10-07/`

**Screens:** Overview, Assets, Asset class (stocks / real estate / others), Account or asset detail, Position drawer, Liabilities, Loan detail, Growth, Goals, Add/edit modal.

**Key decisions in this version:**
- Holdings live in two countries (US / India) and roll up to USD. Native amounts are shown alongside.
- Generic loans (balance, principal, rate, EMI, term, optional linked asset). Linked loans enable per-asset equity.
- Stocks are entered as positions inside brokerage accounts (ticker, shares, avg cost). A position opens a drawer with a Yahoo Finance link.
- Stocks page (layout A): one Positions card that toggles between **By sector** (collapsible, with column header) and **All positions**.
- Real estate: distribution by property type and by location.
- Assets page: class filter tiles, group by Class / Country / None, collapsible groups, search.
- Growth: country scope (All / US / India). Chart modes Simple / By asset class / By country, with Nominal / Today's dollars. Per-country growth and inflation assumptions. Crypto, metals and vehicles share one common rate. Waterfall attribution separates FX.
- Goals with projected dates.
- Light/dark theme.
- Responsive: phone (bottom tab bar, bottom-sheet modal, compact charts), tablet (top tabs), desktop (sidebar).

**Known gaps (not in prototype):** live quotes, live FX, persistence, auth.

---

<!-- Next version template:
## v2 · YYYY-MM-DD
Snapshot: `versions/v2 - YYYY-MM-DD/`
**Changed since v1:**
- …
**Code impact (for Claude Code):**
- …
-->
