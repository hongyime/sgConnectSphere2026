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
deletions. The repository allows at most 10 open pull requests and at most 2
open pull requests per author. Pull requests opened before 27 October 2026 are
grandfathered and do not consume the new WIP budget. For a new PR, only active-
policy PRs opened no later than that PR are counted, so later PRs cannot make an
earlier check fail. The team-wide cap is intentionally a queue cap rather than
six times the per-author allowance. The immutable-binary check applies to every
PR.

## Rationale

Binary files cannot be three-way merged meaningfully. Protecting existing
reference inputs prevents an agent from accidentally regenerating or editing a
professor artifact while still allowing the team to add a later source snapshot.
Scope and concurrency limits make review ownership visible and stop a single
agent workflow from accumulating an unreviewable queue of branches.

The merge queue remains responsible for testing approved PRs against the latest
`main`; it does not replace these authoring limits or resolve binary conflicts.

The PR author owns conflict resolution and the reviewer owns approval of the
final commit. If a reviewer resolves a conflict, a different teammate must
approve that new commit. A weekly read-only workflow reports drafts unchanged
for more than seven days and open PRs without an assigned owner; it does not
auto-close work or assign people without a team decision.

## Enforcement

`.github/workflows/pr-guardrails.yml` runs `scripts/check_pr_guardrails.py` on
pull requests, merge groups and manual backfills. `.github/settings/main-ruleset.json` adds the
`pr-guardrails` status to the required checks. An administrator must run
`python scripts/configure_github.py --apply` after this workflow is on `main`,
following `docs/github-owner-setup.md`.

Before activation, existing open PRs can be backfilled through the workflow's
manual dispatch using their base and head SHAs. This avoids pushing an empty
commit merely to create the new checks and therefore avoids dismissing a valid
approval. The alternative is to activate the ruleset only after the current
in-flight PRs have merged or closed.

`.github/workflows/weekly-pr-cleanup.yml` produces the weekly cleanup report;
the PR author is the default owner when no explicit GitHub assignee is set.

The `test-evidence` check and the local `test-run-evidence` pre-commit hook
enforce T-65/T-93 for new manual records: every PASS/FAIL row needs a linked,
existing PNG/JPG under its record folder, and the record plus those images must
be added together. Automated runs, SKIP/N/A rows, and old merged records are
not forced to acquire screenshots retroactively.
