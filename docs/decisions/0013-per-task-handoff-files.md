# 0013 - Per-task handoff files; STATE and JOURNAL are append-only summaries

## Status

Points 2 and 3 of the Decision below are superseded by
[decision 0014](0014-pull-requests-do-not-edit-state-or-journal.md) on
3 October 2026: pull requests no longer edit `STATE.md` or `JOURNAL.md` at all.
Points 1 and 4 stand.

Accepted. Landed with the PR that adds `.agents/handoffs/README.md` and the
AGENTS.md rule. No tooling change.

## Context

`.agents/STATE.md` and `.agents/JOURNAL.md` were introduced so any agent or
teammate could resume work in this repository without ambiguity. In Sprint 2
every branch appended detailed progress to both files in most of its commits,
and six or more branches were open at once. Between 20 September and
2 October the two files were changed by 24 commits, and three of the four PRs
open on 2 October (#185, #187, #192) were DIRTY against `main` solely because
of them; #194 conflicted the same way within a minute of being pushed. Each
conflict cost a merge commit, which under the up-to-date rule also cost a
re-approval.

The Sprint 2 retrospective feedback asked the team to "store detailed handoff
notes in separate files per task, with one person consolidating the shared
summary" and to "reduce simultaneous edits to shared handoff files by keeping
separate task records". The `.agents/STATE.md` auto-state block written by the
MOLT hook already says "then the latest file in `.agents/handoffs/` if
present"; the directory never existed.

## Decision

1. **Detailed notes go in `.agents/handoffs/YYYYMMDD-<branch-slug>.md`**, one
   file per task or branch. The filename is unique by construction, so these
   files cannot conflict. They are working documents while the task is open
   and history once it merges. Contents and lifecycle are in
   `.agents/handoffs/README.md`.
2. **`STATE.md` and `JOURNAL.md` are append-only summaries.** One entry of
   roughly five to ten lines per piece of merged work, added in the final
   commit before the author requests review, and in no other commit on the
   branch. Entries are dated bullets; newest first.
3. **Conflicts in those two files are resolved as the union.** Keep both
   sides, never drop a line from `main`.
4. **The repository owner consolidates.** At each sprint close, Bryan moves
   entries whose work is merged and recorded elsewhere (test runs, decisions,
   the retrospective) out of `STATE.md`, so it stays a current-state document
   rather than a log. `JOURNAL.md` is not trimmed.

## Alternatives considered

- **Keep appending to the shared files but merge `main` more often.**
  Rejected: this is the loop the merge queue (decision 0012) exists to end.
- **Stop committing continuity files; keep them local.** Rejected: the whole
  point is that a teammate on another machine or harness can resume.
- **One handoff file per person.** Rejected: a person runs several branches at
  once (Codex worktrees on this machine have six), and per-person files
  conflict the moment two of them are open.
- **A tooling check that fails `check.py` when a non-final commit touches
  `STATE.md`.** Not now; the rule is simple enough to follow by hand and a
  check cannot know which commit is final. Revisit if the files keep
  conflicting.

## Consequences

- Agents must create the handoff file in their first commit and touch
  `STATE.md`/`JOURNAL.md` only once per branch. AGENTS.md says so.
- Sprint 2's existing long entries stay as they are; consolidation starts at
  the Sprint 2 close.
- The three DIRTY PRs today still need one more conflict resolution each; from
  then on the files should only conflict when two PRs reach review at the same
  moment, and the union rule resolves that in seconds.

## References

- `.agents/handoffs/README.md`
- `AGENTS.md`, continuity paragraph
- Decision 0012 (merge queue), which removes the other half of the cost
- Sprint 2 retrospective feedback (instructor), 2 October 2026
