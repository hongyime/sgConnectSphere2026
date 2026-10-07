# 0014 - Pull requests do not edit STATE.md or JOURNAL.md

## Status

Accepted. Landed with the PR that adds the `pr-conventions` protected-files
check, `scripts/agent_handoffs.py`, and the AGENTS.md rule. Supersedes points
2 and 3 of decision 0013 (one entry per PR; union on conflict). Points 1 and 4
of 0013 (per-task handoff files; the owner consolidates) stand and carry the
whole load now.

## Context

Decision 0013 (2 October) moved detailed notes into per-task handoff files and
cut each PR's footprint on `.agents/STATE.md` and `.agents/JOURNAL.md` to one
short entry, prepended newest-first. It also set a rule for resolving the
resulting conflicts: keep both sides.

One day later the cost was measured. On 3 October nine pull requests merged.
Because every branch prepends to the same first line of the same file, each
merge made every other open PR `CONFLICTING` in `STATE.md` (and usually
`JOURNAL.md`), regardless of what else it touched. Each resolution is a push;
the live ruleset has `dismiss_stale_reviews_on_push` and
`require_last_push_approval`, so each push dismissed the approval the PR had or
was about to get. Counting only the PRs the owner resolved himself that day:

- #194, #195, #196, #204 and #205 each had their entries moved into one PR so
  the other four shared no files, before any of them could be approved.
- #185, #187, #192 and #206 were each resolved twice in the same afternoon,
  once after the Week 7 batch merged and once after #207 merged, each time
  only in these two files.

The merge queue (decision 0012) removes the "update branch" cost but not this
one: a `CONFLICTING` PR cannot enter the queue. `merge=union` in
`.gitattributes` would resolve these files cleanly for a local merge but GitHub
does not apply user `.gitattributes` merge drivers when computing the conflict
banner or in the web editor (GitHub Support, quoted in community discussion
9288, unchanged since 2017), so the PR still shows as conflicting.

The two files also serve different readers than they did. Since 0013 the
handoff file is where an agent actually resumes from; the STATE entry was a
pointer to it. A pointer that costs a conflict and a re-approval per PR is not
worth keeping in the PR.

## Decision

1. **A pull request may not change `.agents/STATE.md` or `.agents/JOURNAL.md`.**
   `pr-conventions` lists the PR's changed files (`git diff --name-only HEAD^1
   HEAD` on the merge commit) and fails when either path appears. The check is
   in `scripts/check_metadata.py` (`check_changed_files`) and is unit-tested.
2. **The exception is the owner's consolidation PR**, recognised by a title
   starting with `chore(agents):`. The repository owner opens one such PR at
   sprint close, or sooner when `STATE.md` no longer describes the current
   state. It rewrites `STATE.md` from the merged handoff files and appends
   their Learnings to `JOURNAL.md`. One person, one PR at a time, so the files
   have nothing to conflict with.
3. **The handoff file carries everything a PR used to put in the two files.**
   Its first paragraph is the goal, so `scripts/agent_handoffs.py` can list
   in-flight and recent work newest-first; a `Learnings` heading holds what
   would have gone to `JOURNAL.md`. AGENTS.md tells every agent to run the
   script at the start of a task.
4. **`.gitattributes` marks both files `merge=union`** for the one case where
   it helps: a local merge in the consolidation branch. It is documented as
   not affecting GitHub.
5. **Branches opened before this decision** that still carry an entry revert
   the two files to `main` and move the entry's text into their handoff file.

## Alternatives considered

- **Keep 0013 and accept the conflicts.** Rejected by the day's evidence:
  eight re-resolutions and five preventive moves in one afternoon, each
  costing a re-approval.
- **`merge=union` alone.** Rejected: GitHub ignores it, so the PR stays
  `CONFLICTING` and cannot enter the queue; it only speeds up the local fix.
- **Per-PR fragment files that a script stitches into STATE.md.** This is the
  handoff directory already; stitching adds a generated file that would itself
  need committing (and conflicting) or a build step nobody reads. The listing
  script gives the same view without a generated artefact.
- **Append at the end instead of prepending.** Still conflicts: two PRs adding
  at the same end of the same file conflict exactly like two adding at the
  start.
- **Turn off `dismiss_stale_reviews_on_push`.** Rejected: that protection is
  what makes an approval mean something; the fix belongs on the files that
  cause the pushes, not on the review rule.
- **A pre-commit hook instead of CI.** Local hooks are bypassable and not
  every harness installs them; the CI check is the enforcement, a hook could be
  added later for faster feedback.

## Consequences

- `STATE.md` will lag `main` between consolidations. That is accepted:
  `scripts/agent_handoffs.py` plus the handoff files are the current view;
  `STATE.md` is the owner's curated summary. AGENTS.md says to read both.
- `pr-conventions` now needs `fetch-depth: 2` on its checkout to diff the
  merge commit against the base tip. Dependabot PRs touch neither file, so the
  existing bot exemption is unaffected.
- The `chore(agents):` prefix is load-bearing. A PR that needs to edit the two
  files for any other reason must use it and say why in the body.
- The nine handoff files already on `main` have no `Learnings` heading; the
  first consolidation reads them whole.

## Reversibility

Remove `check_changed_files` and its CI step; remove the two `.gitattributes`
lines; restore the 0013 wording in AGENTS.md and the handoffs README. No data
moves.

## References

- Decision 0013 (per-task handoff files), points 1 and 4
- Decision 0012 (merge queue), which this complements
- `scripts/check_metadata.py`, `scripts/agent_handoffs.py`
- `.github/workflows/ci.yml`, `pr-conventions` job
- GitHub community discussion 9288, "Pull request conflicts: Support
  merge=union in .gitattributes"
