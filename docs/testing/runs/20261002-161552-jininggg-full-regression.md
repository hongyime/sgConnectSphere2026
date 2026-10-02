---
date: 2026-10-02T16:15:52+08:00
runner: jininggg
scope: full-regression
environment: local
run_type: regression
test_case_version: 011026
commit: 1780b3c
---

E06-S01 / SCRUM-45 shared-skeleton reformat and E11-S01 / SCRUM-75 current
integration review. HEAD is the base commit; these checks include the uncommitted
working-tree changes on fix/SCRUM-45-venue-search-design. No new PR exists.
This is a new execution session, not a rewrite/backfill of earlier run records.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Venue-search route response isolation | PASS | `npm test --workspace frontend -- --run --no-file-parallelism src/features/venue/VenueSearch.navigation.test.tsx`: 4 passed, including late successes/failures on event changes. |
| MULTIPLE | Backend unit suite | PASS | `npm test --workspace backend`: exit 0; current suite includes venue search, notifications, clarification and decisions. |
| MULTIPLE | Frontend component suite | PASS | `npm test --workspace frontend -- --run --no-file-parallelism`: 26 files, 201 tests passed. |
| MULTIPLE | Venue and notification-producer PostgreSQL suites | PASS | 51 passed, 0 failed/skipped; exact command below. Includes search ranges, recipient privacy, deduplication, rollback, current clarification/decision producers and maintenance blocks. |
| MULTIPLE | Durable outbox/provider suite | PASS | `npm run test:notifications`: 26 passed; real local PostgreSQL, provider calls intercepted. |
| MULTIPLE | Redis transport | PASS | `npm run test:redis`: 2 passed on disposable loopback Redis. |
| MULTIPLE | Compiled runtime checks | PASS | `npm run test:runtime`: 15 passed. |
| TC_E06S01_01 | Matching venues and combined filters | PASS | `npx playwright test tests/e2e/venue-search.spec.ts --workers=1`: 8 passed across desktop/mobile; checks name, location, attendance, capacity, layout, accessibility, facilities and exact timestamps. API mocked. |
| TC_E06S01_02 | Near matches identify failing criteria | PASS | Same browser command and real PostgreSQL suite; explicit unsuitable label and mismatch retained. |
| TC_E06S01_03 | Undersized/layout capacity visible | PASS | Same browser and PostgreSQL suites; layout facts and effective capacity preserved. |
| TC_E06S01_04 | Unavailable venues not shown as suitable | PASS | Same suites; PostgreSQL tests Pending/Confirmed/block overlaps and adjacency. |
| MULTIPLE | Search validation, empty state and responsive shell | PASS | Same browser command; field-associated errors, suitable/empty results, safe access denial, one main heading and no horizontal overflow at 320px. |
| TC_E11S01_01 | Existing status notification reaches the inbox | PASS | `npx playwright test --config playwright.auth.config.ts`: 10 passed across desktop/mobile, real local API/PostgreSQL. |
| TC_E11S01_06 | Own inbox newest first and unread state | PASS | Same real browser suite plus notificationInbox.integration.test.ts. |
| TC_E11S01_07 | Read state persists and other-user/security notices are inaccessible | PASS | Same suites, including eventless verification-token exclusion from GET and mark-read. |
| MULTIPLE | Auth and password-reset regression | PASS | Included in the 10 auth browser checks; synthetic accounts and locally prepared reset emails only. |
| MULTIPLE | TypeScript checks | PASS | `npm run typecheck`: frontend and backend passed. |
| MULTIPLE | Production build | PASS | `npm run build`: passed; existing Vite bundle-size warning remains (chunk exceeds 500 kB). |
| MULTIPLE | Repository hygiene/tooling | PASS | `python scripts/check.py`: passed, 76 tooling tests. |
| MULTIPLE | Desktop/mobile visual comparison | PASS | Inspected venue search screenshots against shared Form/List templates at 1280px and 393px; shared page, controls, cards and feedback styles align. Local screenshots are ignored artifacts. |

Database command (TEST_DATABASE_URL points only to disposable loopback PostgreSQL 17):

```text
node --import tsx --test --test-concurrency=1 --test-reporter=spec backend/tests/venueSearch.integration.test.ts backend/tests/eventNotifications.integration.test.ts backend/tests/notificationInbox.integration.test.ts backend/tests/coordinatorNotifications.integration.test.ts backend/tests/clarification.integration.test.ts backend/tests/decision.integration.test.ts backend/tests/venueBlocks.integration.test.ts
```

No production email was sent. Supabase inspection was read-only. Tests used
isolated local schemas, not public application data. A transient test-server
proxy timeout was logged between auth fixtures; all ten browser tests completed
successfully. Docker was initially stopped and was started before database runs.

Not claimed: all unfinished workflow acceptance criteria, deployed mailbox receipt,
or the entire legacy backend database suite. Venue Staff assignments and owning
booking/equipment/registration/change workflows remain outside this increment.
Coverage inventory regenerated with `scripts/tc_coverage_audit.py`; inventory is
not evidence that unimplemented cases passed.
