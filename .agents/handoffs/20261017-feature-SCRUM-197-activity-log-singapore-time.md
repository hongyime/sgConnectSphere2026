# feature/SCRUM-197-activity-log-singapore-time

Goal: E14-S03 Read edited Activity log dates and times in Singapore time
(Jira SCRUM-197, owner Le Xin, Sprint 3). Edited startAt, endAt and
registrationDates values in the Organiser's and the assigned Coordinator's
existing Activity logs show Singapore time instead of raw UTC. Scope:
`docs/backlog/release-1/E14-audit-history.md` (5 scenarios), cases
TC_E14S03_01 to _06 in `docs/testing/cases/E14.md`.

## Decisions

- Product Owner (Bryan), 17 Oct: finish E14-S03 in Sprint 3 ("Complete them
  still got time"); Le Xin created the Jira ticket.
- Field-aware, as the story requires: only `startAt`, `endAt` and
  `registrationDates` are converted. A title that looks like a timestamp
  stays as written. Stored values are untouched.

## Done

- `ActivityLog.tsx`: `formatEditedValue(field, value)` using shared
  `formatDate(value, true)`; registrationDates splits on " to ". Used by
  `describeChange` (Coordinator) and `ClientEvents.tsx` (Organiser).
- `ActivityLog.singaporeTime.test.tsx`: TC_E14S03_01 to _06, both views.
- Vitest 416/416, `ActivityLog.tsx` 100%, typecheck clean, `tc-coverage.md`
  regenerated. T-65 record:
  `docs/testing/runs/20261017-114437-lexinphun2024-debug-frontend-vitest.md`.

## Still to do

- Manual run by Le Xin with hand-taken screenshots (T-93): edit an event's
  start time and registration dates as the Organiser, then read both
  Activity logs (Organiser and assigned Coordinator). TC_06 also needs a
  read-only look at the stored audit row (still UTC) and an unrelated
  Organiser being refused.
- PR, human review of code and test cases.
