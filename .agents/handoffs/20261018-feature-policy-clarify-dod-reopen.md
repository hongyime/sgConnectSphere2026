# Prospective Definition of Done and source-of-truth clarification

Prepare a short, prospective policy proposal from the decisions settled on 18 October, with a separate exact-quote audit, for team review without changing historical Sprint 3 records.

## Done so far

- Created branch `feature/policy-clarify-dod-reopen` from `docs/po-review-corrections-20261016`.
- Draft wording captures the decisions on manual acceptance timing, T-65 session records, Jira links, 100% coverage review, acceptance reconciliation, carryover, and Done-story history.
- Supporting audit preserves the earlier exact wording inventory and conflict analysis.
- Added prospective PR-checklist guidance: identify an owner for open story-level evidence, distinguish that evidence from merge gates, and preserve closed PR checklists as history.
- `python scripts/check.py` passed: repository hygiene, 158 tooling tests, 378 test-run records, and installed pre-commit hooks. Evidence is in `docs/testing/runs/20261018-095125-bryanseah234-tooling.md`.

## Not done / next step

- Draft PR [#312](https://github.com/hongyime/sgConnectSphere2026/pull/312) is open against `docs/po-review-corrections-20261016`; it is mergeable and CI is queued. Leave it unmerged and in draft until team/PO review.
- Do not merge or change any existing DoD, T-65/T-74 record, Sprint 3 story, or Jira status/sprint/estimate/criteria.

## Decisions for review

- The future T-65 scope is one immutable record per test session, including exploratory and CI sessions; commands and outcomes from that session share the record.
- A genuine Done story is never reopened. A mistaken Done status for work that never met DoD is corrected to not-Done while preserving the Jira history.
- No single story owns this cross-cutting policy task; do not force it under a venue story in Jira.

## Commands and checks

- `python scripts/setup.py` installed repository-pinned local tooling because `.venv-tools` was initially missing.
- `python scripts/check.py` passed as recorded above. No application suite or database commands were run; this is a policy documentation change.
