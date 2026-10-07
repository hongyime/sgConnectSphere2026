# SCRUM-52 / E07-S02 — Coverage review before approval

Follow-up to [PR #216](https://github.com/hongyime/sgConnectSphere2026/pull/216),
responding to the review request to integrate #222 and meet the updated
[Definition of Done](../../CONTRIBUTING.md#definition-of-done) and
[instructor guidance](instructor-guidance-2026-10-06.md).
Requirements and manual results remain in
[scrum-52-equipment-requests.md](scrum-52-equipment-requests.md) and
[scrum-52-manual-validation.md](scrum-52-manual-validation.md).

Review page: [approval follow-up](https://ctrexqa0ht6u.postplan.dev/v/1).

## Main integration

PR #222 / E07-S06 merged into main 3f8de45. This branch merges that main normally,
retaining equipmentRequests and supportRequests unit and database tests in both
backend package scripts. docs/testing/tc-coverage.md was regenerated with
`.venv-tools/bin/python scripts/tc_coverage_audit.py`, not manually resolved.
No application behavior was changed by this follow-up; new tests verify existing
boundary/error and workflow paths. No coverage threshold or new tool is added to CI.

## Measured changed-file coverage

Measurements are on the uncommitted resolved merge plus added test cases based
on HEAD 83754ab. Reports include exactly backend request*.ts or the two frontend
request files. Figures below are from c8 and Vitest/V8 text reports; unit-only
and combined database results are deliberately separate.

| File / scope | Statements | Branches | Functions | Lines |
| --- | --- | --- | --- | --- |
| requestHandler.ts, unit only | 100% | 100% | 100% | 100% |
| requests.ts, unit only | 49.88% | 87.27% | 83.33% | 49.88% |
| Both backend files, unit only | 56.96% | 91.13% | 85.71% | 56.96% |
| Both backend files, unit + real PostgreSQL | 100% | 100% | 100% | 100% |
| EquipmentRequests.tsx, component units | 98.01% | 98.46% | 100% | 100% |
| equipmentRequestApi.ts, component units | 100% | 100% | 100% | 100% |
| Both frontend files, component units | 98.19% | 98.48% | 100% | 100% |

## Explicit DoD justification for unit coverage gaps

**Backend:** requests.ts owns SQL reads, real transactions, row locks,
reservation history guards, concurrent duplicate exclusion and atomic notification
outbox writes. These cannot be meaningfully proven by a unit-only database stub:
a scripted row stream can increase coverage but cannot establish PostgreSQL lock
behavior, rollback or notification persistence. Those lines are deliberately
verified by equipmentRequests.integration.test.ts against an isolated real
PostgreSQL schema. The combined run reaches 100% statements and branches. This
is an explicit exception to 100% unit-only coverage, not a claim that integration
coverage is unit coverage.

**Frontend:** the only remaining uncovered source branches/statements are the
early-return defensive guards in confirmRemove (`!removing || busy`, line 120)
and submit (`busy`, line 371). Normal UI controls are disabled while busy, and
the removal callback exists only while a removal target is selected. Therefore
those returns cannot be reached through the supported user interaction without
artificially invoking a stale/private callback or dispatching a synthetic form
submission past disabled controls. We retain these defensive guards and explicitly
justify the small unit gap instead of exporting private implementation details
or introducing tests that bypass normal UI behavior. All frontend functions and
lines are covered. Busy-button disabling, cancellation, error/retry, unmount during
save and stale-response handling have behavioral tests.

Human review of the added code/test cases remains required. The coverage figures
are evidence for review, not approval or overall story completion.

## Added test coverage

- Malformed/empty request bodies, upper quantity limit, long notes, identifiers,
  unauthenticated save and invalid event identifiers refuse before transactions.
- Handler GET list/detail and malformed save/remove actions return correct
  status/results. Real handler create, no-op and removal dispatch also run on PostgreSQL.
- No-op saves below stock and legacy null notes do not emit changes; removal of
  a nonexistent request is refused; events without codes use their title in notices.
- Coordinator/Support event list links, empty states and retry.
- Missing/read-only edit, retired equipment and empty catalogue, standing
  maintenance and reserved history without editing controls.
- Cancel removal without mutation; changed vs unchanged acknowledgements;
  no active recipients; note editing; save errors without field errors.
- Late save completion after leaving the form does not navigate back.
- Existing integration assertions retain event isolation, over-stock warning,
  reserved and duplicate guards, atomic rollback and concurrent creation.

## Commands and immutable execution records

All commands run from the repository root; TEST_DATABASE_URL was set to the
dedicated disposable local PostgreSQL service for database commands. No shared
application database was reset or seeded. Reports under artifacts are ignored.

Backend unit coverage (5 passed):

```text
node_modules/.bin/c8 --reports-dir artifacts/scrum52-unit-coverage --temp-directory artifacts/scrum52-unit-coverage/tmp --include 'backend/src/modules/equipmentSupport/request*.ts' --reporter=json --reporter=text node --import tsx --test backend/tests/equipmentRequests.test.ts
```

[Unit coverage record](../testing/runs/20261007-105857-xiangyingg-backend-unit.md).

Backend unit + PostgreSQL coverage (6 passed):

```text
node_modules/.bin/c8 --reports-dir artifacts/scrum52-combined-coverage --temp-directory artifacts/scrum52-combined-coverage/tmp --include 'backend/src/modules/equipmentSupport/request*.ts' --reporter=json --reporter=text node --import tsx --test backend/tests/equipmentRequests.test.ts backend/tests/equipmentRequests.integration.test.ts
```

[Combined coverage record](../testing/runs/20261007-105845-xiangyingg-backend-db.md).

Frontend focused component coverage (23 passed):

```text
npm test --workspace frontend -- --coverage --coverage.include=src/features/support/EquipmentRequests.tsx --coverage.include=src/features/support/equipmentRequestApi.ts --coverage.reporter=json --coverage.reporter=text --coverage.reportsDirectory=../artifacts/scrum52-frontend-coverage src/features/support/EquipmentRequests.test.tsx
```

[Frontend coverage record](../testing/runs/20261007-105845-xiangyingg-frontend-vitest.md).

Full backend suite: 288 passed, including both equipment and technical-support tests.
[Backend regression record](../testing/runs/20261007-105945-xiangyingg-backend-unit.md).

Full frontend suite: 294 passed.
[Frontend regression record](../testing/runs/20261007-105929-xiangyingg-frontend-vitest.md).

Real login/API/PostgreSQL browser acceptance: 2 passed, desktop/mobile, all four
E07-S02 acceptance cases.
[Authenticated browser record](../testing/runs/20261007-105941-xiangyingg-frontend-e2e.md).

Typecheck passed. Final required CI and renewed peer review remain required.
