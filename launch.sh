#!/usr/bin/env bash
# One command for local dev: start Supabase, seed sample data, print the
# one URL to open, then run the dev server in the foreground so its logs
# stream to this terminal (Ctrl+C to stop). No /login screen — that final
# printed link is a real sign-in link, not localhost:3000 itself (see
# src/app/auth/dev-signin/page.tsx for why a plain visit to "/" can't skip
# it on a browser with no session yet).
#
# The dev server doesn't need to be running for seeding — scripts/seed-
# local.mjs talks to Supabase directly — so seeding happens first and the
# link is visible above the server's live log output, not buried in it.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

PORT=3000

echo "==> Starting local Supabase (no-op if already running)"
npx supabase start

echo "==> Seeding sample data"
npm run seed

echo
echo "==> Starting the dev server on :$PORT (Ctrl+C to stop)"
# `|| true`: nothing listening is the common case, and lsof's non-zero exit
# then would otherwise trip `set -e`/`pipefail` and kill this whole script
# silently, right here, before ever reaching `exec npm run dev` below.
lsof -ti:"$PORT" -sTCP:LISTEN 2>/dev/null | xargs -r kill || true
# Give a killed process a moment to actually release the port before a
# fresh `next dev` tries to bind it.
for _ in $(seq 1 20); do
  lsof -ti:"$PORT" -sTCP:LISTEN >/dev/null 2>&1 || break
  sleep 0.5
done

exec npm run dev
