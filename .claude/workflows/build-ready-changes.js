export const meta = {
  name: 'build-ready-changes',
  description: 'Build every skills-driven OpenSpec change whose Depends on changes are merged, one PR per change',
  whenToUse: 'After merging a change PR: builds the changes that merge made ready. args: { only?: ["<change>"], base?: "main" }',
  phases: [
    { title: 'Find ready changes', detail: 'read Depends on lines and merge state' },
    { title: 'Build', detail: 'each ticket starts once its blockers merge, red-first in its own worktree' },
    { title: 'Review and verify', detail: 'code-review, CI suites, spec:coverage, opsx verify' },
    { title: 'Open PRs', detail: 'one PR per change; you test and merge' },
    { title: 'Clean up', detail: 'remove worktrees and ticket branches that landed' },
  ],
}

// The same flow /implement-spec runs, driven by code instead of a session:
// docs/agents/issue-tracker.md defines "ready", the ticket frontier and "done".
// It stops at the PR. You test, merge, push the database and archive; then run it again.

const IMPLEMENTER = 'claude-sonnet-5-5'
const BASE = (args && args.base) || 'main'
const ONLY = (args && args.only) || null

const CHANGES_SCHEMA = {
  type: 'object',
  properties: {
    changes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          schema: { type: 'string' },
          dependsOn: { type: 'array', items: { type: 'string' } },
          mustBeArchived: { type: 'array', items: { type: 'string' } },
          archived: { type: 'boolean' },
          allTicked: { type: 'boolean' },
          openPr: { type: 'boolean' },
        },
        required: ['name', 'schema', 'dependsOn', 'mustBeArchived', 'archived', 'allTicked', 'openPr'],
      },
    },
  },
  required: ['changes'],
}

const TICKETS_SCHEMA = {
  type: 'object',
  properties: {
    tickets: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          n: { type: 'integer' },
          title: { type: 'string' },
          blockedBy: { type: 'array', items: { type: 'integer' } },
          done: { type: 'boolean' },
        },
        required: ['n', 'title', 'blockedBy', 'done'],
      },
    },
  },
  required: ['tickets'],
}

const RESULT_SCHEMA = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    summary: { type: 'string' },
  },
  required: ['ok', 'summary'],
}

const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    issues: { type: 'array', items: { type: 'string' } },
  },
  required: ['issues'],
}

const PR_SCHEMA = {
  type: 'object',
  properties: {
    url: { type: 'string' },
    youMustDo: { type: 'array', items: { type: 'string' } },
  },
  required: ['url', 'youMustDo'],
}

phase('Find ready changes')
const { changes } = await agent(
  `Run \`git fetch origin\`. Report every change folder in origin/${BASE}:openspec/changes/ and openspec/changes/archive/ (read with \`git show origin/${BASE}:<path>\` / \`git ls-tree\`, not the working tree).
For each change (archived folders are named <date>-<name>; report the bare <name>):
- schema: from its .openspec.yaml
- dependsOn: the change names on the "Depends on:" line under "# Proposal" in proposal.md ([] for "none")
- mustBeArchived: the dependsOn changes whose requirements this change's delta specs MODIFY, REMOVE or RENAME (see "Changes that depend on other changes" in docs/agents/issue-tracker.md)
- archived: true if it is under openspec/changes/archive/
- allTicked: true if every "- [ ]"/"- [x]" box in its tasks.md is ticked
- openPr: true if \`gh pr list --state open --head build/<name>\` returns a PR`,
  { label: 'read change graph', schema: CHANGES_SCHEMA, model: IMPLEMENTER, effort: 'low' },
)

const byName = new Map(changes.map((c) => [c.name, c]))
const isMerged = (name) => {
  const c = byName.get(name)
  return Boolean(c && (c.archived || c.allTicked))
}
const isArchived = (name) => Boolean(byName.get(name)?.archived)
const isReady = (c) =>
  c.schema === 'skills-driven' &&
  !isMerged(c.name) &&
  !c.openPr &&
  c.dependsOn.every(isMerged) &&
  c.mustBeArchived.every(isArchived)

const ready = changes.filter(isReady).filter((c) => !ONLY || ONLY.includes(c.name))
const waiting = changes.filter((c) => !isMerged(c.name) && !isReady(c))
for (const c of waiting) {
  const missing = [
    ...c.dependsOn.filter((d) => !isMerged(d)).map((d) => `${d} not merged`),
    ...c.mustBeArchived.filter((d) => !isArchived(d)).map((d) => `${d} not archived`),
  ]
  log(`Waiting: ${c.name}${c.openPr ? ' (PR open)' : ''}${missing.length ? ` (${missing.join(', ')})` : ''}`)
}
if (ready.length === 0) {
  log('Nothing is ready to build.')
  return { built: [], waiting: waiting.map((c) => c.name) }
}
log(`Ready: ${ready.map((c) => c.name).join(', ')}`)

// Worktrees of the same repo can't check out one branch twice, so every agent
// that checks out a branch lets go of it before it finishes.
const RELEASE = 'Finish with `git checkout --detach` so the next agent can check the branch out.'

const changeDir = (change) => `openspec/changes/${change}`
const integration = (change) => `build/${change}`

async function readTickets(change) {
  const { tickets } = await agent(
    `Read \`git show ${integration(change)}:${changeDir(change)}/tasks.md\`. Report each "## N. <title>" section: n, title, blockedBy (the numbers on its "Blocked by:" line, [] for none), done (every checkbox in the section ticked).`,
    { label: `${change}: read tickets`, phase: 'Build', schema: TICKETS_SCHEMA, model: IMPLEMENTER, effort: 'low' },
  )
  return tickets
}

function implementTicket(change, ticket) {
  const branch = `ticket/${change}-${ticket.n}`
  return agent(
    `Implement ticket ${ticket.n} ("${ticket.title}") of the OpenSpec change ${change}.
Context pointers: the "## ${ticket.n}." section of ${changeDir(change)}/tasks.md, plus that folder's proposal.md, specs/ and design.md; docs/agents/issue-tracker.md for how scenario IDs, tests and ticking work.
1. \`git checkout -B ${branch} ${integration(change)}\` (your worktree starts elsewhere; build on the integration branch).
2. Call the Skill tool with \`tdd\`. Red first: the tests named with the ticket's scenario IDs must fail before you write the code.
3. Make every acceptance criterion in the section true. \`npm test\`, \`npm run typecheck\`, \`npm run lint\` and \`npm run spec:coverage\` must pass.
4. Tick that section's checkboxes in tasks.md, and only those. Commit.
5. \`git merge ${integration(change)}\` into your branch and fix any conflict, so the merge back is clean.
Return ok=false with the reason if a criterion cannot be met (for example it needs a person); do not tick its boxes then. ${RELEASE}`,
    { label: `${change}: ticket ${ticket.n}`, phase: 'Build', schema: RESULT_SCHEMA, model: IMPLEMENTER, isolation: 'worktree' },
  ).then((result) => ({ ticket, branch, result }))
}

function mergeTicket(change, branch) {
  return agent(
    `\`git checkout ${integration(change)}\`, then \`git merge --no-ff ${branch}\`. Resolve any conflict (the resolving-merge-conflicts skill), keeping both sides' ticked boxes in tasks.md. Run \`npm test\` and \`npm run spec:coverage\`; both must pass. Then \`git branch -D ${branch}\`. ${RELEASE}`,
    { label: `${change}: merge ${branch}`, phase: 'Build', schema: RESULT_SCHEMA, model: IMPLEMENTER, effort: 'low', isolation: 'worktree' },
  )
}

// As /implement-spec does: each ticket starts the moment its blockers are merged,
// and each finished ticket is merged as soon as it reports, one merge at a time.
// After a failure nothing new starts; tickets already running finish and land.
async function buildTickets(change) {
  const tickets = await readTickets(change)
  const done = new Set(tickets.filter((t) => t.done).map((t) => t.n))
  const running = new Map()
  let failure = null

  const startFrontier = () => {
    for (const t of tickets) {
      if (done.has(t.n) || running.has(t.n) || !t.blockedBy.every((n) => done.has(n))) continue
      running.set(t.n, implementTicket(change, t).catch(() => ({ ticket: t, result: null })))
    }
  }

  startFrontier()
  while (running.size > 0) {
    const { ticket, branch, result } = await Promise.race(running.values())
    running.delete(ticket.n)
    if (!result?.ok) {
      failure = failure || `ticket ${ticket.n}: ${result?.summary || 'agent stopped'}`
      continue
    }
    const merged = await mergeTicket(change, branch)
    if (!merged?.ok) {
      failure = failure || `merging ticket ${ticket.n}: ${merged?.summary || 'agent stopped'}`
      continue
    }
    done.add(ticket.n)
    if (!failure) startFrontier()
  }

  if (failure) return { ok: false, reason: failure }
  if (done.size < tickets.length) return { ok: false, reason: 'some tickets are blocked by tickets that never finished' }
  return { ok: true }
}

async function reviewAndVerify(change) {
  const review = await agent(
    `\`git checkout ${integration(change)}\`. Call the Skill tool with \`code-review\`, fixed point origin/${BASE}, spec = ${changeDir(change)}. Return every issue it raises, each with file and line. ${RELEASE}`,
    { label: `${change}: code-review`, phase: 'Review and verify', schema: REVIEW_SCHEMA, isolation: 'worktree' },
  )
  if (review?.issues?.length) {
    await agent(
      `\`git checkout ${integration(change)}\`. Fix every one of these code-review issues, keeping \`npm test\`, \`npm run typecheck\`, \`npm run lint\` and \`npm run spec:coverage\` green, and commit. ${RELEASE}\n- ${review.issues.join('\n- ')}`,
      { label: `${change}: fix review`, phase: 'Review and verify', schema: RESULT_SCHEMA, model: IMPLEMENTER, isolation: 'worktree' },
    )
  }
  for (let attempt = 1; attempt <= 2; attempt++) {
    const verify = await agent(
      `\`git checkout ${integration(change)}\`. Run \`npm test\`, \`npm run typecheck\`, \`npm run lint\`, \`npm run test:scripts\` and \`npm run spec:coverage\`, then call the Skill tool with \`openspec-verify-change\` for ${change} (what /opsx:verify runs). ok=true only if every command passes and verify reports no CRITICAL. In summary list each failure and each CRITICAL and WARNING. ${RELEASE}`,
      { label: `${change}: verify ${attempt}`, phase: 'Review and verify', schema: RESULT_SCHEMA, isolation: 'worktree' },
    )
    if (verify?.ok) return { ok: true, warnings: verify.summary }
    if (attempt === 2) return { ok: false, reason: verify?.summary || 'verify stopped' }
    await agent(
      `\`git checkout ${integration(change)}\`. Fix these failures and CRITICALs in the code (never by editing the specs), then commit. ${RELEASE}\n${verify?.summary}`,
      { label: `${change}: fix verify`, phase: 'Review and verify', schema: RESULT_SCHEMA, model: IMPLEMENTER, isolation: 'worktree' },
    )
  }
}

function openPr(change, warnings) {
  return agent(
    `Push ${integration(change)} and open a PR into ${BASE} with \`gh pr create\`, titled after the change's proposal. Write the body with the pr skill (Skill tool \`pr\`); add a "Verify warnings" section with:\n${warnings}
Also add a "Before you merge" checklist of every step a person must do for this change: tasks.md criteria that name the user, manual checks (layout at 2000/800/390px for UI changes), production steps such as \`supabase db push\` for new migrations under supabase/migrations/. Return the PR url and that checklist.`,
    { label: `${change}: open PR`, phase: 'Open PRs', schema: PR_SCHEMA, model: IMPLEMENTER, effort: 'low' },
  )
}

async function buildChange(c) {
  const created = await agent(
    `\`git fetch origin\`, then create the integration branch: \`git branch ${integration(c.name)} origin/${BASE}\` if it does not exist (if it exists, keep it: earlier tickets on it are already done). Do not check it out here.`,
    { label: `${c.name}: integration branch`, phase: 'Build', schema: RESULT_SCHEMA, model: IMPLEMENTER, effort: 'low' },
  )
  if (!created?.ok) return { change: c.name, ok: false, reason: created?.summary || 'could not create the integration branch' }

  const tickets = await buildTickets(c.name)
  if (!tickets.ok) return { change: c.name, ok: false, reason: tickets.reason }

  const verified = await reviewAndVerify(c.name)
  if (!verified.ok) return { change: c.name, ok: false, reason: verified.reason }

  const pr = await openPr(c.name, verified.warnings)
  return { change: c.name, ok: Boolean(pr?.url), pr: pr?.url, youMustDo: pr?.youMustDo || [] }
}

const results = (await parallel(ready.map((c) => () => buildChange(c)))).filter(Boolean)
for (const r of results) {
  log(r.ok ? `${r.change}: PR ${r.pr}` : `${r.change}: stopped, ${r.reason}`)
}

// /implement-spec's last step. Only work that already landed is removed; a failed
// ticket's worktree and branch stay so you can pick them up.
phase('Clean up')
const cleanup = await agent(
  `Clean up after this run, in the main checkout. For each worktree under .claude/worktrees/ in \`git worktree list\`: remove it with \`git worktree remove\` only if \`git status --porcelain\` there is empty and its HEAD is already contained in one of ${ready.map((c) => integration(c.name)).join(', ')}. Then delete each local ticket/<change>-<n> branch for these changes that is merged into its integration branch (\`git branch -d\`, never -D), and run \`git worktree prune\`. In summary, list what you removed and every worktree or branch you kept and why.`,
  { label: 'clean up worktrees', phase: 'Clean up', schema: RESULT_SCHEMA, model: IMPLEMENTER, effort: 'low' },
)
log(`Clean up: ${cleanup?.summary || 'did not run'}`)
log('Test each PR, do its "Before you merge" steps, merge, then run build-ready-changes again.')
return { built: results, waiting: waiting.map((c) => c.name) }
