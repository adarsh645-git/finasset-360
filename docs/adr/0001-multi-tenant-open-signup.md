# Multi-tenant with open Google sign-up, no invite gating

Originally scoped as a single-user personal tracker gated by basic auth. Reopened mid-design: every Google account that signs in gets its own isolated account and Portfolio, with no allowlist restricting who can sign up. Isolation is enforced by Postgres Row-Level Security (Supabase), scoped to `auth.uid()`, not by restricting who can create an account. Chosen because the destination shifted from "just for me" to a small multi-user product without wanting to build invite/admin machinery for a v1 with no active abuse problem.

## Status

accepted
