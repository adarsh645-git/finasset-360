#!/usr/bin/env bash
# One command for local dev: start Supabase, start (or restart) the Next
# dev server, seed sample data, and print the one URL to open. No /login
# screen — that final print is a real sign-in link, not localhost:3000
# itself (see src/app/auth/dev-signin/page.tsx for why a plain visit to
# "/" can't skip it on a browser with no session yet).
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

PORT=3000
LOG_FILE="/tmp/finasset-360-dev.log"

echo "==> Starting local Supabase (no-op if already running)"
npx supabase start

echo "==> Restarting the Next dev server on :$PORT"
lsof -ti:"$PORT" -sTCP:LISTEN | xargs -r kill
# Give the killed process a moment to actually release the port before a
# fresh `next dev` tries to bind it.
for _ in $(seq 1 20); do
  lsof -ti:"$PORT" -sTCP:LISTEN >/dev/null 2>&1 || break
  sleep 0.5
done

nohup npm run dev > "$LOG_FILE" 2>&1 &
echo "    logging to $LOG_FILE"

echo "==> Waiting for it to serve"
for _ in $(seq 1 60); do
  curl -sf -o /dev/null "http://127.0.0.1:$PORT" && break
  # A 3xx (the unauthenticated redirect to /login) also means it's up.
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$PORT" || true)
  [[ "$code" == 3* ]] && break
  sleep 0.5
done

echo "==> Seeding sample data"
npm run seed
