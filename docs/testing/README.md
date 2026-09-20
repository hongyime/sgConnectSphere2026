# Testing References

E01-S01 has a [live login and recovery suite](login-recovery.md), including
isolated PostgreSQL, API/provider tests, and desktop/mobile browser workflows.

This folder holds testing plans and imported scaffolds that are useful for
planning. The active runnable Playwright scaffold now lives in `tests/e2e/`,
with this folder keeping the source reference copy.

Do not implement story assertions in the reference copy under
`frontend-verification-scaffold-v5/`. Update canonical `docs/testing/cases/`
first, then update/promote the matching runnable tests. Regenerate dated XLSX
exports with `scripts/export_testcases_xlsx.py`. The coverage auditor still reads
the legacy undated workbook; catalogue changes must reconcile that input too.

Original scaffold snapshot (historical, not current execution results):

- 11 Playwright spec files.
- 227 `test.fixme()` case stubs from `PROJECT TEST CASES.xlsx`.
- 454 skipped Playwright cases when run across desktop and mobile projects.
- `github-workflow.example.yml` is an example only, not an active GitHub Actions
  workflow.

At the Sprint 1 cutoff, `tc-coverage.md` inventories 230 IDs: 55 referenced by
active test titles, 172 scaffold-only, and 3 without a test reference. This is
23.9% title-linked automation, not an acceptance pass rate. Mocked E03/E09
screens and conditional database tests can contribute IDs without completing
their business stories. Deactivation and activity-log tests also contain real
assertions without TC_ID titles. See the
[delivery ledger](../backlog/sprint-1-delivery.md) for execution evidence and gaps.

## Traceability Standard

For every implemented automated test, keep a short traceability block near the
test. It must name:

- the user story or Jira issue;
- the acceptance criterion being verified;
- the automated test script;
- the implementation evidence, such as the PR, branch, or commit.

This preserves the chain from requirement to test to code, shows which tests must
change when an acceptance criterion changes, and lets the team prove that each
criterion has at least one test as stories are completed. The generated
`test.fixme()` cases already include story IDs, acceptance criteria, test data,
expected results, and steps; when a team member implements one, they should keep
that traceability data instead of replacing it with an unlabelled test.
