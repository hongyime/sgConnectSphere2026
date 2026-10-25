---
date: 2026-10-23T01:22:14+08:00
runner: xiangyingg
scope: full-regression
environment: local
run_type: automated
test_case_version: 171026
database: real
commit: 240d7bc
---

Application base 240d7bc plus staged E09-S06 implementation on feature/e09-s06-attendance. Mixed test doubles: unit/component/browser-contract checks are mocked/stubbed; PostgreSQL acceptance/API and live-browser smoke use an isolated local real database. No production data or human screenshot PASS claimed. Development failures were corrected before the final commands below.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E09S06_01 | Attendance after completion preserves registrations | PASS | Real PostgreSQL integration verifies persisted writes, correction, idempotent retries and byte-equivalent registration metadata; live cookie-session API writes/readback. |
| TC_E09S06_02 | Registered but not attended | PASS | Real DB default false, one unmarked out of five, component and browser labels. |
| TC_E09S06_03 | Recording before completion blocked | PASS | All non-Completed enum states reject writes; current DB authority rechecked. Real API returns 409 and browser controls disabled. |
| TC_E09S06_04 | Registration and attendance counts together | PASS | Real DB 5 registered / 4 attended; stubbed desktop/mobile browser summary verified. |
| MULTIPLE | Targeted backend attendance acceptance and coverage | PASS | TEST_DATABASE_URL set to isolated loopback DB; npx c8 --include=backend/src/modules/eventAttendance/service.ts --reporter=text npx tsx --test backend/tests/eventAttendance.test.ts backend/tests/eventAttendance.integration.test.ts backend/tests/eventAttendanceRoutes.integration.test.ts: 6 passed. Service 100% statements/branches/functions/lines including real DB SQL paths. Pure unit tests cover validation/auth; real DB tests intentionally cover SQL instead of duplicating it with mocks. |
| MULTIPLE | Backend unit regression | PASS | npm test --workspace backend: 422 passed. Initial sandbox IPC denial rerun with approved execution. |
| MULTIPLE | Frontend regression and attendance coverage | PASS | npm test --workspace frontend: 462 passed. Targeted npm test --workspace frontend -- --run src/features/coordinator/EventAttendance.test.tsx --coverage --coverage.include=src/features/coordinator/EventAttendance.tsx: 9 passed; 100% statements/branches/functions/lines. |
| MULTIPLE | Desktop and mobile browser contracts | PASS | BASE_URL set to running attendance frontend; npx playwright test tests/e2e/event-attendance.spec.ts --workers=1 --reporter=list: 4 passed. Stubbed API; not real registration or human acceptance. |
| MULTIPLE | Build and typechecks | PASS | npm run build and npm run typecheck passed. Vite emitted existing chunk-size advisory. |
| MULTIPLE | Automated live browser smoke | PASS | Real local API/login/DB: five registered, mark four attended, reload retains four; mobile has no horizontal page overflow; Confirmed controls disabled. Programmatic Playwright, screenshots used only for visual QA, not human evidence. |
| MULTIPLE | Full human registration to completion to attendance | SKIP | Upstream #324 and #326/#327 not integrated. Await human T-93 screenshots and independent code/test review. |
