# Next.js + Supabase + Vercel as the full stack

A single combined Next.js app (frontend, API routes, and server logic together — no separate backend service) deployed to Vercel, backed by Supabase for Postgres storage and Google-based auth (including Row-Level Security enforcement, see ADR 0001). Chosen over a split frontend/backend architecture or an alternative BaaS (Firebase) because Next.js + Vercel + Supabase is a well-trodden combination with generous free tiers, and a relational schema (Holdings/Liabilities/Valuations with foreign keys) fits Postgres more naturally than a document store. This is a lock-in choice: swapping the auth provider or database later would touch most of the app.

## Status

accepted
