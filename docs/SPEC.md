# FinAsset 360 — v1 build spec

> **This document is now a pointer.** The behaviour this file used to specify lives in `openspec/specs/` (requirements and scenarios). The vocabulary is in [CONTEXT.md](../CONTEXT.md) and the decisions are in [docs/adr/](adr/). Only the problem statement and the session-rhythm facts below are kept here.

## Problem Statement

Someone with a spread-out financial life — a house, a mortgage, equities across a couple of brokerages, some gold, cash in more than one currency, a card balance — has no single place that answers *what am I worth, and am I going to get where I want to be*. The information exists, but it lives in a dozen apps that each see one slice, none of which knows about the others, and none of which will net a mortgage against the house it financed.

A spreadsheet is the usual fallback, and it fails in specific ways. It goes stale silently, because nothing prompts the monthly pass and nothing shows which figures are old. It loses history: overwriting last month's cell erases the trend, so "how did my distribution shift over three years" becomes unanswerable. Multi-currency holdings get converted at whatever rate was current when the row was typed, and nothing records which rate that was, so historical totals quietly drift. Every live-priced holding — a stock, an ounce of gold — has to be looked up by hand. And the planning question, the one that actually motivates the exercise, needs formulas most people won't write correctly: a projection that grows assets and amortizes debts on separate rules, that knows a paid-off loan frees up cash, and that reports the answer in money that means something rather than in inflated future dollars.

The result is that people either don't track net worth at all, or track it in a way that's confidently wrong in ways they can't see.

## Solution

FinAsset 360 is a hosted, multi-tenant net-worth tracker and planner. A User signs in with Google, gets their own isolated Portfolio, and records what they own and owe as periodic Valuations — deliberate, dated snapshots that accumulate into a history rather than overwriting each other.

The app is built around a **monthly check-in**: a guided pass over Holdings that pre-fills the last recorded value so confirming an unchanged figure costs one keystroke, offers a one-key accept of the Live Estimate for anything with a market symbol, and ends by showing the Net Worth delta since the last pass. Between check-ins the User visits to look at their distribution against their Target Allocation. Both facts about the session rhythm come from the User directly: 10–30 Valuations updated in a monthly pass, plus several distribution-only visits a month.
