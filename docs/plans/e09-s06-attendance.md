# E09-S06 / SCRUM-68 attendance implementation

Canonical scope: `docs/backlog/release-1/E09-attendee-registration.md`, C-45 and `docs/testing/cases/E09.md`. No canonical scope or test-case wording changed.

## Contract

- GET `/api/events?attendance=1&id=<event code or id>` returns `{ attendance: { eventCode, title, status, canRecord, registeredCount, attendedCount, attendees } }`. Each Attendee has registrationId, name, email, attended and recordedAt. Private/no-store response.
- POST same URL with `{ registrationId, attended: boolean }` returns `{ attendance: { registrationId, attended, changed } }`. Invalid body is 400, absent session 401, wrong/disabled Coordinator or unassigned event 403, non-Completed or nonregistered place 409.
- Assigned Coordinator only. Role/account availability and event assignment rechecked inside transaction; lock Event → Account → Registration. Account NOWAIT conflict yields retryable 409. All event states other than Completed reject writes; server canRecord drives controls.
- Only `registered` rows count. Pending, waitlisted, withdrawn and rejected are excluded. One registration with multiple Session selections counts once. Registration metadata and Session links are never updated by attendance.
- Existing event_attendance stores append-only corrections, actor and DB timestamp. Latest recorded_at/id row supplies state; absent history means false. Repeated identical value is a no-op. Attendance and immutable audit row commit/rollback together. No new migration. No automatic venue changes (C-45).

Frontend: live `/coordinator/events/:eventCode/attendance`, linked from assigned event details. Shows both counts, named registered roster, attended/not-attended controls, disabled controls before completion, loading/error/empty states and aborts late actions on navigation. Uses shared design blocks and responsive roster layout.

## Traceability

| Acceptance case | Automated implementation evidence |
| --- | --- |
| TC_E09S06_01 | backend/tests/eventAttendance.integration.test.ts: unchanged registration rows, persisted attendance, correction/replay; frontend/src/features/coordinator/EventAttendance.test.tsx; tests/e2e/event-attendance.spec.ts |
| TC_E09S06_02 | Real DB default false and not-attended roster; component/browser labels |
| TC_E09S06_03 | Real DB all non-Completed statuses reject writes; real cookie API 409; browser disabled controls |
| TC_E09S06_04 | Real DB 5 registered / 4 attended, component/browser summaries |

Additional real DB tests cover current authority, wrong event/registration, concurrent retries, account-lock failure and rollback when audit fails. API wiring is tested in `backend/tests/eventAttendanceRoutes.integration.test.ts` with real cookie sessions. Existing scaffold attendance stubs promoted to these tests; unrelated feedback test no longer carries an incorrect attendance TC_ID.

## Dependencies and acceptance gates

Main includes 0023–0024 schema (#322). No dependent feature branch merged into this branch. Registration owner contract posted on #326: https://github.com/hongyime/sgConnectSphere2026/pull/326#issuecomment-6346826737. Registration owner confirmed the registered-only Event-level count, multi-Session deduplication, manually_added registration semantics and compatible Event → Account → Registration lock order: https://github.com/hongyime/sgConnectSphere2026/pull/326#issuecomment-6356562188 . #324 completion and #326/#327 live registration are needed for the full human register → complete → attendance flow. Local synthetic fixture setup is not evidence of those upstream flows or production migration verification.

Manual guide: `docs/testing/manual/E09-S06-click-through.md`. Human screenshots not yet supplied. Draft/review status only; do not mark SCRUM-68 Done. Service SQL coverage is measured with real PostgreSQL rather than pretending mocked SQL proves persistence; targeted service and component coverage reports are recorded in the run session.

## Combined integration follow-up

Automated live registration → completion → attendance passed on isolated assembly e4a6860; [record](../testing/runs/20261023-015630-xiangyingg-frontend-e2e.md). Actual UI registrations selected three Sessions across two attendees, actual UI completion preceded attendance, and registered count stayed two while attended became one. This does not claim human T-93 acceptance, production migration verification, merged dependencies; owner confirmation was subsequently supplied separately. #343 source remains independent of those dependency branches. Reusable harness: `scripts/verify_attendance_integration.ts`.
