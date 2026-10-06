# E07-S02 equipment requests

Complete SCRUM-52 / E07-S02 frontend, backend, acceptance validation and reviewer documentation, following design.md and the shared skeleton.

## Delivered

Event-scoped requests, above-stock warning, independent event data, protected amendment/removal, atomic Technical Support notices/outbox and Coordinator/Support screens. Acceptance records and manual before/action/after walkthrough are linked in docs/plans/scrum-52-equipment-requests.md. Coverage regenerated. Local backend, PostgreSQL, component, mocked and real authenticated browser suites passed; typecheck/build passed.

## Next step

PR #216 is open: https://github.com/hongyime/sgConnectSphere2026/pull/216. SCRUM-52 is In Review; Amareet and Aaron are requested reviewers. Dependency #214 merged on 6 October with required checks green. A teammate approved the implementation at 157995d; renewed approval may be needed after the documentation push. Do not mark Jira Done before reviewed merge. No production delivery or live email verification claimed.

## Reviewer decision

Request notices go to active Technical Support accounts as shared department intake; this is an implementation interpretation for review, not a newly accepted customer routing decision. E07-S04 reservation writers must respect the documented event/request/equipment locking protocol.

## Learnings

Requests are distinct from reservations and period availability. Keep reservation history protected and use real-database acceptance evidence. Do not update STATE.md or JOURNAL.md in this PR.

CI initially found one missing retry-test title in generated tc-coverage.md; regenerated the inventory. No application change was needed. Hosted visual review: https://8kx96ceo2oc3.postplan.dev/v/1.

## Manual validation documentation — 6 October 2026

The user manually exercised E07-S02 and confirmed remaining checks and active
Technical Support intake recipients. See docs/plans/scrum-52-manual-validation.md
and its linked immutable manual session record. Screenshot observations are
separated from user-reported outcomes; the stale save-banner/empty-list
screenshot remains explicitly unresolved. No live email delivery claimed.

The focused authenticated browser rerun failed in setup because TEST_DATABASE_URL
was unset; its separate execution record preserves that failure. Local frontend
and backend were started with the ignored environment configuration for user
testing. No application code changed in this documentation task.
