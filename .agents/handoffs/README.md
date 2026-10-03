# Per-task handoff files

One file per task or pull request. This is where the detailed, in-progress
notes live: what was tried, what is half-done, which commands were run, which
reviewer asked for what. `.agents/STATE.md` and `.agents/JOURNAL.md` get one
short entry per merged piece of work and nothing else; see
[decision 0013](../../docs/decisions/0013-per-task-handoff-files.md).

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

- **Goal** and the PR or Jira key it serves.
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
3. In the **final commit before requesting review**, add one short entry
   (roughly five to ten lines) to `.agents/STATE.md` and, if there is
   something a future reader should learn from, to `.agents/JOURNAL.md`.
   That is the only commit on the branch that touches those two files.
4. After the PR merges the handoff file stays in the repository as history.
   Do not delete it; do not edit it again.

## Resolving a conflict in STATE.md or JOURNAL.md

Keep both sides. Every entry is an independent dated bullet, so the right
resolution is always the union: your entry on top, then everything from
`main`. Never drop a line from `main`. Verify with
`git show origin/main:.agents/STATE.md | diff - .agents/STATE.md` showing
only additions.
