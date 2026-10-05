# E07-S02 equipment requests

Complete SCRUM-52 / E07-S02 frontend, backend, acceptance validation and reviewer documentation, following design.md and the shared skeleton.

## Delivered

Event-scoped requests, above-stock warning, independent event data, protected amendment/removal, atomic Technical Support notices/outbox and Coordinator/Support screens. Acceptance records and manual before/action/after walkthrough are linked in docs/plans/scrum-52-equipment-requests.md. Coverage regenerated. Local backend, PostgreSQL, component, mocked and real authenticated browser suites passed; typecheck/build passed.

## Next step

Open the main-target PR and obtain teammate review; merge catalogue dependency #214 first. Do not mark Jira Done before reviewed merge. No production delivery or live email verification claimed.

## Reviewer decision

Request notices go to active Technical Support accounts as shared department intake; this is an implementation interpretation for review, not a newly accepted customer routing decision. E07-S04 reservation writers must respect the documented event/request/equipment locking protocol.

## Learnings

Requests are distinct from reservations and period availability. Keep reservation history protected and use real-database acceptance evidence. Do not update STATE.md or JOURNAL.md in this PR.
