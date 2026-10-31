---
date: 2026-10-30T16:22:51+08:00
runner: jininggg
scope: full-regression
environment: local
run_type: regression
test_case_version: 281026
database: real
commit: e9ef5a9
---

E10-S01 / SCRUM-70 continuation after merged #375 and #376. Source was main
e9ef5a9 plus this branch's working implementation and browser-test diff, not
clean-base execution. The prior implementation record
`20261030-013715-jininggg-full-regression.md` remains unchanged.

Fresh native loopback PostgreSQL; tests own migrated schemas through
`loginDatabase()`. Browser tests use real sign-in sessions, local frontend/API,
and durable SQL assertions, without response interception. Fixture SQL creates
confirmed arrangements and an older Approved request as stated preconditions;
it does not stand in for browser approval or venue-booking workflows.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S01_01 TC_E10S01_02 TC_E10S01_03 | Real request submission, comparison and both refused-edit entry paths | PASS | Retained #375 cases: readonly/current-value link and actual concurrent-approval PATCH refusal preserve proposed values until explicit submission; durable Pending request and Coordinator notice. Both entry paths are explained in a code comment. |
| TC_E10S01_04 | Real arrangement preview, cancellation, stale preview and application | PASS | Preview lists the affected venue with no Event/request/flag/notice changes. Cancel restores focus. A capacity change after preview causes 409 on confirmation; fresh preview applies attendance, synchronizes sole Session, flags venue only, and creates one Organiser decision and one responsible Venue Staff notice. |
| TC_E10S01_04 | Real date application and recipient/outbox boundaries | PASS | Date preview shows venue and equipment, application flags both, published start follows the Event, and Organiser, Venue Staff and assigned Technical Support each have one durable notification/delivery. No live provider delivery or mailbox receipt claimed. |
| TC_E10S01_04 | Older Approved request and late-close consent | PASS | SQL precondition creates an older Approved request. Browser review/apply without consent returns 428 and leaves Approved; checking explicit late-close consent applies the registration window. |
| TC_E10S01_04 TC_E10S01_05 | Safe approval and decline | PASS | Retained real-stack safe-field/publication and decline results with distinct durable notices; independent of the arrangement cases above. |
| TC_E10S01_06 TC_E10S01_07 | Actual terminal actions and Obsolete rendering/history | PASS | Retained real authenticated completion/cancellation API actions, durable Obsolete history, both roles' browser rendering and disabled decisions. These actions are automated API calls, not human UI click-through evidence. |
| MULTIPLE | Unsupported mixed request remains entirely unapplied | PASS | Real browser submits registrationEnabled plus title; shared-field preview names Registration as waiting. Approval remains Approved; explicit apply refuses 409; title, registration and publication name stay unchanged. This dependency regression has no acceptance TC ID in its test title and does not prove unsupported-field completion. |
| MULTIPLE | Backend combined regression | PASS | 63 passed, zero failed/skipped across request unit/integration, arrangement impact, notification, registration, completion and cancellation suites. Mixed mocked units and real PostgreSQL integration; no production or Supabase use. |
| MULTIPLE | Both application typechecks | PASS | `npm.cmd run typecheck` passed frontend and backend after restoring the implementation onto main. |

## Commands

- `node --env-file=<temporary local test env> node_modules/@playwright/test/cli.js test --config=playwright.auth.config.ts tests/auth-e2e/changeRequests.spec.ts`: **18 passed**, zero failed/skipped; nine cases on desktop and mobile, approximately 1.7 minutes. Existing NO_COLOR/FORCE_COLOR warnings were non-failing.
- `node --env-file=<temporary local test env> --import tsx --test backend/tests/changeRequests.test.ts backend/tests/changeRequests.integration.test.ts backend/tests/arrangementImpact.integration.test.ts backend/tests/eventNotifications.integration.test.ts backend/tests/registrationPeriod.integration.test.ts backend/tests/eventCompletion.integration.test.ts backend/tests/eventCancellation.integration.test.ts`: **63 passed**, zero failed/skipped.
- `npm.cmd run typecheck`: passed both workspaces.
- `.venv-tools/Scripts/python.exe scripts/tc_coverage_audit.py`: regenerated combined inventory, 282 active/379. Manual guide conflict retained both owners' current content; inventory conflict resolved by generation.

No application source changed during this continuation. Earlier full frontend
(680), backend units (611 plus one existing skip), build and coverage evidence
remain in the prior immutable record; those broad suites were not rerun or
relabeled as new results here. Git index staging was initially blocked by sandbox
permissions; the scoped retry succeeded before tests, with no unresolved paths.

## Remaining gates

Shared support for layout/accessibility IDs, registration enablement, nullable
registration boundaries and Session changes remains open. Independent human
code/test review and coverage-gap review, actual manual acceptance screenshots,
and PO/delegate acceptance remain required. No Jira status change, CI run,
external provider send, human manual PASS or whole-story Done is claimed.
