# 0017 - Guard pull-request scope and reference artifacts

## Status

Accepted. The CI workflow and ruleset payload in this change are the
implementation. The live ruleset is applied only after this workflow is merged
to `main` and its required checks are green there.

## Decision

Professor-provided Word, Excel, and PowerPoint files are context inputs, not
working files. Existing files under `docs/` with `.docx`, `.xlsx`, or `.pptx`
extensions are immutable in pull requests. A new input may be added under a
unique filename; an existing input must never be edited, deleted, or renamed.
Team decisions and derived working content belong in the canonical Markdown
files.

New pull requests are limited to 40 changed files, 1,500 additions, and 1,000
deletions. The repository allows at most 10 open pull requests and at most 6
open pull requests per author. Pull requests opened before 27 October 2026 are
grandfathered for the size and open-count limits so the existing backlog can be
closed or split deliberately. The immutable-binary check applies to every PR.

## Rationale

Binary files cannot be three-way merged meaningfully. Protecting existing
reference inputs prevents an agent from accidentally regenerating or editing a
professor artifact while still allowing the team to add a later source snapshot.
Scope and concurrency limits make review ownership visible and stop a single
agent workflow from accumulating an unreviewable queue of branches.

The merge queue remains responsible for testing approved PRs against the latest
`main`; it does not replace these authoring limits or resolve binary conflicts.

## Enforcement

`.github/workflows/pr-guardrails.yml` runs `scripts/check_pr_guardrails.py` on
pull requests and merge groups. `.github/settings/main-ruleset.json` adds the
`pr-guardrails` status to the required checks. An administrator must run
`python scripts/configure_github.py --apply` after this workflow is on `main`,
following `docs/github-owner-setup.md`.
