# SCRUM-73 / E10-S04 cancellation implementation

Sprint 4, 5 points; runner/owner login xiangyingg. Canonical scope remains E10-S04 in the release
backlog and cases/E10.md. No acceptance criteria, estimates or Done states changed.

## Acceptance traceability

| Scenario | Implementation | Automated evidence | Human gate |
| --- | --- | --- | --- |
| 1 release all Sessions | cancellation.ts locks Event/Venue/Equipment, releases every active booking/reservation and clears primary; status/reason/time and audit/outbox commit together | eventCancellation.integration.test.ts two Sessions, free quantity/calendar reader, rollback and cancellation race; authenticated browser | manual TC_E10S04_01 pending |
| 2 notify all attendees | shared pre-release recipient matrix; registered and waitlisted; public/generic names, assigned staff | exact recipient/outbox assertions and privacy test with/without publication | manual TC_E10S04_03 and actual mailbox receipt not claimed |
| 3 read-only reason/date | cancellation endpoint and existing Coordinator/Organiser/attendee views; edit/comment refusals, comment/event lock | component tests, real API/database reads/refusals and authenticated desktop/393px browser | manual TC_E10S04_04 pending |
| 4 Organiser request only | existing change_requests with requested_changes.action=cancel, Pending status and transactional Coordinator notice | request/replay tests; browser verifies event remains Planning | manual TC_E10S04_05 pending |
| 5 Pending becomes Obsolete | all Pending request rows updated with reviewer/time and one transition audit each; cancellation page displays owner-visible history | two ordinary requests plus cancellation request become Obsolete; non-Pending states unchanged | manual TC_E10S04_06 pending |

## Verification

- Full backend units: 417 passed.
- Full frontend component suite: 443 passed; EventCancellation component 100%
  statements/branches/functions/lines.
- Unit plus affected real-PostgreSQL regressions: 18 passed, zero skips; cancellation
  service 100% combined statements/branches/functions/lines.
- **Coverage exception:** cancellation SQL orchestration is not claimed as 100%
  unit-only coverage. Real PostgreSQL tests establish locks, status predicates,
  multi-Session releases, transactions and rollback; database stubs cannot prove
  these behaviours. Shared projection/guard changes are also exercised there.
- Authenticated real-stack browser: one journey, desktop and 393px, passed.
  Automated screenshots inspected; not substituted for hand-taken T-93 evidence.
- Pinned #298 integration: actual unchanged decisions.ts at 7d674fe temporarily
  overlaid, two bookings approved then cancelled, actor/record/time release audit
  and primary clearing verified (1 passed). Reproducible method is in the manual
  integration note. No #298 code committed; no claim to pass its whole latest suite.
- Runtime smoke suite passed on committed implementation 790dd5c.
- Both typechecks and build passed; existing Vite chunk-size advisory.
- A later browser rerun initially used the API process from before the history
  endpoint addition; it failed the visible-history assertion. That FAIL is
  preserved in its own record. Restarting the isolated API and rerunning passed.
- Broader regression initially exposed an intentional attendee allowlist addition
  and an old E01-S02 schema fixture missing migrated fields; expected metadata
  and actual migration setup were corrected, then affected tests passed.
- Initial full backend runner launch hit sandbox IPC permission; rerun with the
  required permission passed. No code/hook bypass.

### Immutable automated session records

- [20261019-214213-xiangyingg-tooling.md](../testing/runs/20261019-214213-xiangyingg-tooling.md)
- [20261019-215733-xiangyingg-backend-unit.md](../testing/runs/20261019-215733-xiangyingg-backend-unit.md)
- [20261019-215737-xiangyingg-backend-db.md](../testing/runs/20261019-215737-xiangyingg-backend-db.md)
- [20261019-215739-xiangyingg-frontend-vitest.md](../testing/runs/20261019-215739-xiangyingg-frontend-vitest.md)
- [20261019-215830-xiangyingg-backend-db.md](../testing/runs/20261019-215830-xiangyingg-backend-db.md)
- [20261019-215918-xiangyingg-frontend-e2e.md](../testing/runs/20261019-215918-xiangyingg-frontend-e2e.md)
- [20261019-220151-xiangyingg-frontend-e2e.md](../testing/runs/20261019-220151-xiangyingg-frontend-e2e.md)
- [20261019-220227-xiangyingg-tooling.md](../testing/runs/20261019-220227-xiangyingg-tooling.md)
- [20261019-220511-xiangyingg-frontend-e2e.md](../testing/runs/20261019-220511-xiangyingg-frontend-e2e.md)
- [20261019-220744-xiangyingg-tooling.md](../testing/runs/20261019-220744-xiangyingg-tooling.md)

- [20261019-220825-xiangyingg-runtime.md](../testing/runs/20261019-220825-xiangyingg-runtime.md)

## Release and remaining work

1. Separate migration-only 0022 PR, normal review/checks/merge.
2. Authorized production deploy owner reviews ledger/order, applies the exact
   file in an approved release window, verifies type/ledger, commits sanitized
   run record. Local schema application is not production verification.
3. Reconcile main into the application branch, rerun combined verification and
   latest-head review. The application PR remains draft pending human acceptance.
4. Human follows docs/testing/manual/E10-S04-click-through.md, supplies originals
   and actual outcomes for a new T-65 manual record. No manual PASS is prefilled.
5. Independent review of code/tests and normal merge queue. Story not Done yet.

Broader change-request management is E10-S01; cancellation owns its request
creation, Obsolete transition and terminal history. Registration/waitlist workflow
creation is E09; cancellation consumes existing canonical registration rows.
#298 remains held by its own full integration/manual/conflict gates. SMTP/mailbox
receipt and production roster correctness are not proved by local outbox tests.

## Review artifacts

Automated desktop and phone screenshots are under artifacts/e10-cancellation-automated-*.png and displayed on the hosted PostPlan. They are browser-generated implementation review evidence, not hand-taken manual acceptance. Migration prerequisite: #319.
