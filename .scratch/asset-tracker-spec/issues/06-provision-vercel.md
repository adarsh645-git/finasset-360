Type: task
Status: resolved

## Question

Provision the Vercel account/project this app will deploy to (free tier), so the eventual build has a real deploy target.

Checklist for the human (only they can do this — external account setup):
1. Create a Vercel account (or confirm an existing one) on the free/hobby tier.
2. Confirm it's ready to connect to a future git repo for this project (Vercel deploys from a connected repo — the repo itself doesn't need to exist yet, just confirm the account is ready).

Resolve this ticket once the Vercel account exists and is ready to receive a project.

## Answer

Vercel account already exists (free/hobby tier), confirmed by the user. No git repo needs to be connected yet — this app's repo ([`finasset-360-git`](../../../../)) now exists locally with a GitHub remote, so a future build ticket can connect it to Vercel for deploy whenever it's ready to ship.
