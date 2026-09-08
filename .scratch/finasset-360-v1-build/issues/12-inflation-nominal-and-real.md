Type: build
Status: ready-for-agent

# 12: Inflation — nominal and real, both charted

**What to build:** The User sets an expected inflation rate, and future figures start meaning something. Both lines are charted — the number they'd see on a future statement, and what it would actually buy — forking at today.

Every input stays **nominal**: growth, escalation and loan rates, exactly as those rates are quoted in the world. Deflation is one divide applied last, at display time only:

```
real(y) = nominal(y) / (1 + inflation)^y
```

**Why not a real growth rate instead** — the tempting simplification where the User just types "3% real" and there is no inflation field: the liability side cannot be converted. A mortgage rate is contractual; the bank charges a nominal rate on a nominal balance and takes a fixed nominal payment regardless of inflation. Running it anyway lands 63,017 above the correct year-20 figure, and "fixing" it by deflating the liability too lands 72,189 off — because the payments were made in nominal dollars at many different points in time, and one final deflation cannot unwind that.

Recorded history stays nominal as recorded. Deflating the past needs real historical CPI the app doesn't store, and deflating it by the *assumed* rate would restate real history through a made-up number. The deflator is 1 at today, so one historical line forks into two exactly where the guessing starts.

Spec: [`docs/SPEC.md`](../../../docs/SPEC.md) — user stories 80–84.

**Blocked by:** 10.

- [ ] `inflation_rate` on `projection`, defaulting to 0.03, so a meaningful answer exists before the User has thought about it
- [ ] Deflation applied last, at display time; every stored and entered rate stays nominal
- [ ] Both lines charted, forking at the Today seam
- [ ] Recorded history stays nominal — it is not deflated
- [ ] **The real line is primary**: headline figures read from it, with nominal drawn as a fainter reference. No user toggle
- [ ] Test: the two lines coincide at today (deflator = 1) and diverge thereafter
- [ ] Test: history is unchanged by the inflation assumption
