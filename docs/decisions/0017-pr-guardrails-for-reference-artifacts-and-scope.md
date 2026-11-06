# 0017 - Guard pull-request scope and reference artifacts

## Status

Accepted. The CI workflow and ruleset payload in this change are the
implementation. The live ruleset is applied only after this workflow is merged
to `main` and its required checks are green there.

## Decision

Professor-provided Word, PDF, Excel, and PowerPoint files under
`docs/bdr/customer-sources/` are context inputs, not working files. Existing
files there with `.docx`, `.pdf`, `.xlsx`, or `.pptx` extensions are immutable in
pull requests. A new input may be added under a unique filename; an existing
input must never be edited, deleted, or renamed. Generated exports elsewhere
under `docs/` remain writable through their generators. Team decisions and
derived working content belong in the canonical Markdown files.

New pull requests are limited to 40 changed files, 1,800 additions, and 1,500
deletions. The repository allows at most 15 open pull requests team-wide. There
is no per-author open-PR cap. Pull requests opened before 27 October 2026 are
grandfathered and do not consume the new WIP budget. For a new PR, only active-
policy PRs opened no later than that PR are counted, so later PRs cannot make an
earlier check fail. The team-wide cap is the queue cap. The immutable-binary
check applies to every PR.

### Revision 2026-11-06: per-author cap removed, team-wide cap raised to 15

The per-author open-PR cap (originally 2) was removed at the product owner's
request to accommodate the Release 1 submission push, during which a single
author legitimately needs several parallel branches in flight (submission
scaffolding, CI deploy control, backlog and release audits). In the same pass
and for the same reason, the team-wide cap was raised from 10 to 15, because the
team was already holding 11 open pull requests during the submission push and
the previous ceiling was blocking otherwise-green work. The team-wide cap of 15
open PRs remains the sole queue bound, so overall concurrency is still limited
even without a per-author cap. The per-author key is now optional in
`.github/settings/pr-guardrails.json`: when it is absent, the per-author check
is skipped. The grandfathering rule and the immutable-binary check are
unaffected.

## Rationale

Binary files cannot be three-way merged meaningfully. Protecting existing
reference inputs prevents an agent from accidentally regenerating or editing a
professor artifact while still allowing the team to add a later source snapshot.
Scope and concurrency limits make review ownership visible and stop a single
agent workflow from accumulating an unreviewable queue of branches. The
2026-11-06 revision above deliberately trades some of this protection for
throughput during the Release 1 submission push: the per-author cap is lifted
and the team-wide cap raised to 15. The per-author guard is retained in code as
an optional, config-driven switch so it can be reinstated after the push without
a code change (see "After Release 1" below), and the team-wide cap of 15 still
bounds the total queue so the "unreviewable queue" risk is reduced rather than
removed.

The merge queue remains responsible for testing approved PRs against the latest
`main`; it does not replace these authoring limits or resolve binary conflicts.

The PR author owns conflict resolution and the reviewer owns approval of the
final commit. If a reviewer resolves a conflict, a different teammate must
approve that new commit. A weekly read-only workflow reports drafts unchanged
for more than seven days and open PRs without an assigned owner; it does not
auto-close work or assign people without a team decision.

## Enforcement

`.github/workflows/pr-guardrails.yml` runs `scripts/check_pr_guardrails.py` on
pull requests, `main` pushes, merge groups and manual backfills. The manual
backfill publishes check runs explicitly on the requested PR head, while the
workflow job itself runs on the dispatch ref. `.github/settings/main-ruleset.json` adds the
`pr-guardrails` status to the required checks. An administrator must run
`python scripts/configure_github.py --apply` after this workflow is on `main`,
following `docs/github-owner-setup.md`.

Before activation, existing open PRs can be backfilled through the workflow's
manual dispatch using their base and head SHAs. Confirm the explicit check runs
appear on each PR head before applying the ruleset. This avoids pushing an
empty commit merely to create the new checks and therefore avoids dismissing a
valid approval. The alternative is to activate the ruleset only after the
current in-flight PRs have merged or closed.

`.github/workflows/weekly-pr-cleanup.yml` produces the weekly cleanup report;
the PR author is the default owner when no explicit GitHub assignee is set.

The `test-evidence` check and the local `test-run-evidence` pre-commit hook
enforce T-65/T-93 for new manual records: every PASS/FAIL row needs a linked,
existing PNG/JPG under its record folder, and the record plus those images must
be added together. Automated runs, SKIP/N/A rows, and old merged records are
not forced to acquire screenshots retroactively.

## After Release 1 (follow-ups)

The 2026-11-06 loosening was made for the submission push and is not meant to be
permanent. Two follow-ups are recorded here so they are not lost:

1. **Reinstate a per-author cap.** After Release 1 is submitted, re-add
   `max_open_prs_per_author` to `.github/settings/pr-guardrails.json` (the
   enforcement code still honours the key when present) and consider lowering
   `max_open_prs` back toward its previous value. No code change is required.

2. **Evaluate the policy against the base SHA.** On `pull_request`,
   `pr-guardrails.yml` checks out the merge commit, so the guard is read from the
   PR's own `pr-guardrails.json`. A PR can therefore loosen the very limits that
   gate it. This is a pre-existing gap, not introduced by the 2026-11-06 change,
   but it should be closed by reading the policy from the base SHA (or from
   `origin/main`) rather than from the PR head. Tracked as a separate change
   because it alters enforcement semantics for every PR.
