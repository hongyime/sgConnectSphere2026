# chore/agents-consolidate-sprint-2-close

Goal: consolidate `.agents/STATE.md` at Sprint 2 close (decision 0013 point 4,
decision 0014 point 2). STATE.md had grown to 499 lines of a chronological
log; this PR rewrites it as a current-state summary at Sprint 2 close /
Sprint 3 open. The nine Sprint 2 handoff files already on `main` do not carry
a `Learnings` heading, so `JOURNAL.md` is deliberately untouched in this PR
(carried from the task brief): a later `chore(agents):` PR, or the owner, can
append Learnings into `JOURNAL.md` once the handoff files are backfilled with
`Learnings` sections.

PR type: owner consolidation. Title starts `chore(agents): consolidate ...` so
`check_changed_files()` in `scripts/check_metadata.py` permits touching
`.agents/STATE.md`. No Jira key: process change under decisions 0013/0014.

## Done

- `.agents/STATE.md` rewritten end-to-end as a current-state summary:
  - Where things stand at Sprint 2 close / Sprint 3 open (merged PRs, open
    PRs, `main` SHA).
  - Sprint 3 scope and ticket distribution (In Progress, To Do, Done), with
    the goal set 2026-10-05 for sprint 36 quoted verbatim.
  - Live infrastructure: merge queue parameters, per-task handoff files rule,
    Vercel preview path, Jira nightly sweep, Jira-sync caveat observed on
    #190 -> SCRUM-86.
  - Role split under ADR-017.
  - Known env facts (test DB, Vitest Windows flag, API CORS for E05-S03,
    `scripts/reconcile_jira.py` env).
  - Carried-over Sprint 2 work: SCRUM-75 (Ji Ning), SCRUM-86 (Le Xin).
  - Open follow-ups: Jira keys for new Week 7 stories, Playwright
    `test.fixme` scaffolds, pending migration 0011, pre-commit mirror of
    `check_changed_files`, `docs/deploying-and-debugging.md` cleanup, the
    DRY follow-up from #115.
  - Pointer section to `handoffs/`, `JOURNAL.md`, decisions, source-of-truth,
    backlog/test workbooks, branch protection.
- `.agents/JOURNAL.md` deliberately untouched (per the task brief).

## Decisions without team sign-off

- Chose to leave `JOURNAL.md` untouched this round because the pre-decision-
  0013 handoff files do not carry a `Learnings` heading yet. Decision 0014
  point 2 says the consolidation PR "appends their Learnings to
  `JOURNAL.md`"; here the Learnings headings do not yet exist in those files
  to append. A later PR can backfill `Learnings` headings into the Sprint 2
  handoff files and then append them to `JOURNAL.md`.
- Treated the Sprint 2 history on STATE.md as "already recorded elsewhere":
  the merged PR bodies, the handoff files on `main`, decisions 0012/0013/
  0014/0010 amendment, `docs/testing/runs/`, and the backlog/test
  compatibility workbooks all carry the detail. Reviewer please confirm I
  did not drop anything that only STATE.md remembered.
- Kept the "Open follow-ups" section terse. Several Sprint 1 and early
  Sprint 2 open-items (e.g., "no success message after submitting a
  request", "forms hide the server's error reason") were dropped from
  STATE.md because they belong on the Sprint 3 backlog / story AC, not on
  this file.

## Not done / next

- Backfill `Learnings` headings into the nine pre-0013 handoff files and
  then append them to `JOURNAL.md` in a follow-up `chore(agents):` PR.
- Create Jira stories for the new Week 7 backlog entries (E05-S05, E05-S06,
  E10-S05, E03-S08/S09/S10, E01-S12/S13, E08-S06).

## Commands

- `python scripts/check.py` -- run before committing.
- `python3 scripts/agent_handoffs.py` -- confirmed the fifteen Sprint 2
  handoff files on `main` plus this one.

## Verification

- Repo state verified: `git rev-parse --short origin/main` = `b770d7f`;
  branch `chore/agents-consolidate-sprint-2-close` off `main`.
- Merge queue checked by inspecting ruleset parameters in decision 0012 (no
  live admin API call made here; the previous consolidation handoff
  (`20261003-docs-merge-queue-live.md`) recorded the live read-back).
- Sprint 36 scope read via Jira `/rest/api/3/search/jql` to confirm the goal
  text and ticket distribution the file quotes.

Nothing in this PR touches application code, migrations, backlog or test
cases. STATE.md only.
