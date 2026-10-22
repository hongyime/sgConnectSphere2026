# E09-S06 Record attendance — SCRUM-68

Human acceptance is pending. Automated browser results do not count as T-93 human screenshots.

## Local setup

Use a disposable seeded loopback PostgreSQL database named `connectsphere_notification_test` or a suffixed variant. Apply merged migrations through 0024. Do not reset shared or production data. Run `scripts/prepare_attendance_manual.ts` with TEST_DATABASE_URL set to that database; record the fresh COMPLETED and CONFIRMED codes it prints. Fixtures contain five registered Attendees and Session selections; setup does not simulate a user registering or completing an event.

Start backend with DATABASE_URL set to this database, PORT=3005, APP_URL=http://localhost:5177. Start frontend with API_PROXY_TARGET=http://127.0.0.1:3005 and `npm run dev --workspace frontend -- --port 5177 --strictPort`. Sign in at http://localhost:5177/login as the public synthetic Coordinator A from `tests/seed/SEED_DATA.md`. The assigned account is `coord_a@connectsphere.com`; the unassigned Coordinator is `coord_b@connectsphere.com`.

## Human screenshots

1. Open `/coordinator/events/<COMPLETED code>/attendance`. Capture code, Completed status and Registered 5 / Attended 0 before changes: `TC_E09S06_01-1.png`.
2. Click **Mark attended** for Attendee A. Capture the success message, Attended label, Registered 5 / Attended 1: `TC_E09S06_01-2.png`. Reload and capture persistence: `TC_E09S06_01-3.png`.
3. Leave Attendee B unchanged. Capture code and B shown as **Registered but not attended**: `TC_E09S06_02-1.png`. Use overlapping screenshots if needed for event context.
4. Mark the three synthetic Attendance guests attended. Capture Registered 5 / Attended 4 together: `TC_E09S06_04-1.png`. Attendee B stays not attended. Do not replace registration counts with expected attendance or selected-Session counts.
5. Open `/coordinator/events/<CONFIRMED code>/attendance`. Capture code, Confirmed, the completion requirement and disabled controls: `TC_E09S06_03-1.png`. Do not mark it Completed to manufacture this result.
6. Optional correction: change one attended Attendee to not attended, reload, verify only attendance count changes; capture `MULTIPLE-attendance-correction.png`.
7. Sign out and sign in as Coordinator B. Open the same COMPLETED URL and capture Access refused: `MULTIPLE-unassigned-coordinator-denied.png`.

Keep screenshots under 1000 KB each, no passwords, tokens or terminal prompts. Append a new immutable T-65/T-93 manual session with actual application commit, tester, time and observations. Never prefill PASS.

## Full integration gate

After #326 registration backend, #327 frontend and #324 completion are integrated, register through the real Attendee UI, complete through the actual completion flow, then record attendance as the assigned Coordinator. Verify unchanged registration counts and Session selections. This local preloaded-fixture run alone does not close that cross-story gate. Registration-owner contract review, independent review of code/tests and required CI remain outstanding. No Jira Done claim.

Automated combined integration now passes: [session](../runs/20261023-015630-xiangyingg-frontend-e2e.md). The human full-flow acceptance above remains pending; do not substitute the automated run for human screenshots.

To prepare a fresh Confirmed publication with two Sessions but no registrations for the full human flow, run `npx tsx scripts/verify_attendance_integration.ts --prepare-only` with TEST_DATABASE_URL and BASE_URL set to the combined loopback test targets. This prints registration/completion/attendance paths and performs no UI actions. Sign in separately as each synthetic Attendee, choose Sessions and confirm registration. Then sign in as Coordinator A, check recording is blocked, complete through the printed completion path, and record attendance. Capture your own before/after images. The default command without --prepare-only performs automated verification and is never human evidence.
