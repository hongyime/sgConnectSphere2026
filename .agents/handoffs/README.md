# Per-task handoff files

One file per task or pull request. This is where all the notes live: the goal,
what was tried, what is half-done, which commands were run, which reviewer
asked for what. Pull requests do not edit `.agents/STATE.md` or
`.agents/JOURNAL.md`; the repository owner consolidates merged handoffs into
them. See [decision 0013](../../docs/decisions/0013-per-task-handoff-files.md)
and [decision 0014](../../docs/decisions/0014-pull-requests-do-not-edit-state-or-journal.md).
`python scripts/agent_handoffs.py` lists these files newest first with their
goal line.

## Filename

```text
.agents/handoffs/YYYYMMDD-<branch-slug>.md
```

`YYYYMMDD` is the date the task started. `<branch-slug>` is the branch name
with `/` replaced by `-`, for example `20261002-ci-merge-queue.md` for
`ci/merge-queue`. Two people working on two branches can never produce the
same filename, so these files never conflict on merge. If a task spans more
than one branch, one file per branch.

## Contents

Plain Markdown, no required schema. A useful file answers, for someone picking
the task up cold:

- **Goal** and the PR or Jira key it serves, as the first paragraph under the
  title (the listing script prints it).
- **Done so far**, with commit SHAs where that helps.
- **Not done / next step**, as the first thing to do on resume.
- **Decisions taken without team sign-off** that the reviewer should check.
- **Commands run and their outcome** (test runs used as evidence still go in
  `docs/testing/runs/` per T-65; this file may cite them).
- **Blockers** and who or what unblocks them.

Rewrite it freely while the task is open; it is a working document, not a
ledger. Keep secrets, tokens, personal data and machine-specific paths out of
it, as with every committed file.

## Lifecycle

1. Create it in the first commit of the branch.
2. Update it as the work moves; every commit may touch it.
3. Do not touch `.agents/STATE.md` or `.agents/JOURNAL.md`; `pr-conventions`
   fails the PR if you do. Anything a future reader should learn from goes in
   this file under a **Learnings** heading, where the owner's consolidation
   picks it up for `JOURNAL.md`.
4. After the PR merges the handoff file stays in the repository as history.
   Do not delete it; do not edit it again.

## Consolidation (repository owner)

At sprint close, or when `STATE.md` no longer describes the current state,
the owner opens one `chore(agents): consolidate ...` PR that rewrites
`STATE.md` from the merged handoffs (what is current, what is in flight, what
is parked) and appends the Learnings to `JOURNAL.md`. That title prefix is
what lets the PR touch the two files. One person, one PR at a time, so there
is nothing to conflict with; if two such PRs ever overlap, `.gitattributes`
marks both files `merge=union` for the local merge (GitHub does not honour
it).
