---
date: 2026-10-31T19:02:21+08:00
runner: jininggg
scope: full-regression
environment: local
run_type: regression
test_case_version: 301026
database: real
commit: 428100f
pr: 391
---

Post-review helper-signature refactor on 428100f plus this working diff. This is
separate from the clean exact-428100f rerun in 20261031-185939-jininggg-backend-db.md;
no record is retroactively labelled with a later commit.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E11S01_02 TC_E11S01_03 TC_E11S01_09 TC_E11S01_10 TC_E11S01_11 TC_E11S01_14 | Refactored published-name helper and real registration flows | PASS | 27 focused unit/real-PostgreSQL checks passed. Existing all-action published/missing-publication and rollback cases validate unchanged routing while the formatter now requires an explicit non-null name. |
| MULTIPLE | Backend unit coverage | PASS | 646 passed; one existing database-only skip; zero failed. c8 organiser.ts remains 100% statements, branches, functions and lines. |
| MULTIPLE | Types/repository/doc guard | PASS | Both workspace typechecks passed. check.py hygiene/186 tooling tests passed. Doc guard zero errors/156 existing front-matter warnings. Inventory regenerated with no diff; staged whitespace passed. |

Commands: Node with disposable local test environment, `--import tsx --test
backend/tests/attendeeCapacity.test.ts backend/tests/e11CurrentFlows.integration.test.ts
backend/tests/attendeeCapacity.integration.test.ts`; `npm.cmd test --workspace backend`;
`npm.cmd run typecheck`; `python scripts/check.py`; `python scripts/doc_guard.py`;
virtual-environment Python running `scripts/tc_coverage_audit.py`;
`git diff --cached --check`. No new build or frontend/browser run is claimed for
this internal signature/comment/spacing refactor.

No production roster or live-provider operation, mailbox receipt, human manual
PASS or whole-story acceptance is claimed. The Organiser's lack of a separate
missing-publication notice warning is documented as an existing UX limitation;
notice suppression and registration/audit behaviour are unchanged.
