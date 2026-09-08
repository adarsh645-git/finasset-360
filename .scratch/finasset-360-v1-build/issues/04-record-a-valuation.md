Type: build
Status: ready-for-agent

# 04: Record a Valuation, see Net Worth

**What to build:** The app's core loop. A User clicks a Holding's value, types a number, presses Enter, and a Valuation is recorded dated today — one interaction, not a form. They can backdate when entering a figure they looked up last week. Re-recording on a day they already recorded corrects that day's figure rather than creating a second one. The Net Worth headline appears, and stays readable in the top strip after they navigate away.

The FX decision matters here and is easy to get subtly wrong: the rate to the home currency is captured **at the moment of recording** and stored on the row, so a historical total is computed with the rate that was true then, not with today's.

Spec: [`docs/SPEC.md`](../../../docs/SPEC.md) — user stories 22–26, 48–51.

**Blocked by:** 03.

- [ ] Click-to-edit a value, type, Enter or blur records a Valuation dated today
- [ ] A backdating affordance sets a different `recorded_at`
- [ ] `unique (holding_id, recorded_at)` — a same-day re-record is an `UPDATE` of that row, not a second row
- [ ] `holding_valuation` carries `amount` in the Holding's own currency, `fx_rate_to_home`, `home_currency_at_recording`, `recorded_at date`, and a denormalized `user_id` so RLS stays a flat one-column check with no join
- [ ] `recorded_at` is a `date`, not a `timestamptz`
- [ ] Home-currency value is computed on read as `amount * fx_rate_to_home`, never stored
- [ ] Net Worth headline with its component breakdown and an as-of date
- [ ] Persistent Net Worth readout in the top strip (Miller columns scroll column 1 out of view)
- [ ] Test: recording twice on the same date updates rather than inserts
- [ ] Test: `fx_rate_to_home` and `home_currency_at_recording` are captured at record time, and **changing `portfolio.home_currency` afterwards does not retroactively alter historical totals**
- [ ] Test: User A cannot read or write User B's Valuations
- [ ] Test: deleting a Holding cascades its Valuations
