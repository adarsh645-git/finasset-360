Type: build
Status: ready-for-agent

# 01: Sign in, get a Portfolio

**What to build:** A visitor lands on the app, signs in with Google without an invite or approval step, and gets their own Portfolio — created automatically, with no setup wizard standing between them and the app. They pick a home/display currency, and they can sign out.

This is the first tracer bullet, so it also establishes the two test seams the rest of the effort depends on: a local Supabase running with Row-Level Security **enabled**, and fixtures for two distinct authenticated Users. Every later ticket's RLS assertions are written against this harness, so it is worth getting right here rather than retrofitting.

Per [ADR 0001](../../../docs/adr/0001-multi-tenant-open-signup.md), isolation is RLS scoped to `auth.uid()` — there is no application-layer tenancy filter, so nothing later can forget to apply one.

Spec: [`docs/SPEC.md`](../../../docs/SPEC.md) — user stories 1–5.

**Blocked by:** None (can start immediately).

- [ ] Google sign-in works end to end; open sign-up, no allowlist or invite gating
- [ ] First sign-in creates exactly one `portfolio` row; signing in again creates no second row
- [ ] `portfolio` is `user_id uuid primary key references auth.users(id)` plus `home_currency char(3) not null` — no separate `users` or `profiles` table
- [ ] The User can set and change their home currency
- [ ] RLS is enabled on `portfolio` with `USING (user_id = auth.uid())` for all operations
- [ ] Sign-out works
- [ ] Test harness: local Supabase with RLS enabled, and a fixture giving two distinct authenticated Users
- [ ] Test: User A cannot read or update User B's `portfolio` row — asserted by attempting it through the route boundary, not by inspecting policy definitions
- [ ] Test: the suite fails if RLS is dropped (verify this once by hand; a suite that passes without policies is worse than none)
