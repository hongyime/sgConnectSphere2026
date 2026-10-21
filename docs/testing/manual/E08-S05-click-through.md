# E08-S05 human manual acceptance — SCRUM-62

Human execution is pending. Automated screenshots are not T-93 human evidence.
Use a disposable seeded local database with migration 0022 from #319 applied.
Do not reset shared/production data, change the computer clock, or expose an
internal scheduler credential in a browser screenshot.

## Preparation

Run `npx tsx scripts/prepare_completion_manual.ts` with TEST_DATABASE_URL set to
the explicitly selected loopback test database. It inserts four fresh synthetic
events without deleting existing data and prints their codes. This fixture
preparation is separate from human observations. Record the actual application
HEAD, setup time, and codes used; fixture event times are relative to creation.

The site must serve this story's application branch. Log in as
`coord_a@connectsphere.com` using the public synthetic password in
`tests/seed/SEED_DATA.md`. The second Coordinator is `coord_b@connectsphere.com`.
Open `/coordinator/events/<printed-code>/complete`. Normal event details also
link to **Event completion** for Confirmed/Completed events.

## Screenshot sequence

1. **TC_E08S05_03**: open PREMATURE. Capture its event code, start/end dates,
   Confirmed status, disabled **Mark complete…** and before-start explanation.
   Save `TC_E08S05_03-1.png`.
2. **TC_E08S05_02**: open MANUAL. Capture Confirmed and its already-started date.
   Click **Mark complete…**, then **Go back**; verify Confirmed remains. Reopen
   and click **Mark complete**. Capture Completed and success text as
   `TC_E08S05_02-1.png`; reload and capture persistence as `TC_E08S05_02-2.png`.
3. **TC_E08S05_05**: as the Coordinator assigned to MANUAL, open the event
   Activity log and capture its Confirmed → Completed row, Coordinator A and
   timestamp as `TC_E08S05_05-1.png`. This checks the event-log reader permitted
   by E14-S02; no separate administrator Activity Log screen is in scope.
4. **TC_E08S05_01**: open AUTO and capture Confirmed and its passed end time as
   `TC_E08S05_01-1.png`. An authorized local tester triggers the existing internal
   maintenance endpoint `/api/cron/outbox-relay?task=completion` with the configured
   CRON_SECRET in a header outside the screenshot, or waits for the normal daily
   hold-expiry maintenance. It uses real server time; no HTTP test clock exists.
   Refresh the page; capture Completed and log row with **System** and time as
   `TC_E08S05_01-2.png` and `TC_E08S05_05-2.png`.
5. **TC_E08S05_04**: capture CANCELLED with its passed original end time before
   evaluation as `TC_E08S05_04-1.png`. After that same evaluation, refresh and
   capture Cancelled unchanged as `TC_E08S05_04-2.png`. Prepare this before step
   4's evaluation if before/after proof is needed.
6. **TC_E08S05_06**: exact-end (one millisecond before vs equality) is covered by
   injected-clock unit/real-DB tests. Do not mark a human boundary PASS from the
   automatic images. A separate controlled human boundary run must log its
   actual clock/evaluation method; otherwise record SKIP and cite automated
   evidence separately.
7. Supplemental: retry a completed MANUAL event by refreshing; no second action
   appears and the log stays singular. Sign out, log in as Coordinator B, open
   MANUAL and capture refusal as `MULTIPLE-unassigned-coordinator-denied.png`.
   At narrow phone width capture legible status/actions/log as
   `MULTIPLE-mobile-completion.png`.

T-88 Pending → Obsolete persistence is covered in real PostgreSQL tests. The
current Activity log screen lists event-status entries, not all change-request
history; do not infer those database rows solely from a completion success toast.

## Recording

Create a new T-65 session in `docs/testing/runs/` with actual time, runner,
`scope: frontend/e2e`, `run_type: manual`, `database: real` and tested commit.
Describe observed outcomes, fixture/role substitutions and any missing checks.
Store hand-taken images under `evidence/<session-stem>/`, named by TC_ID and
below 1000 KB each. Do not prefill PASS or replace images in merged records.
Manual acceptance, migration verification, independent human review and merge
remain required before SCRUM-62 is Done.
