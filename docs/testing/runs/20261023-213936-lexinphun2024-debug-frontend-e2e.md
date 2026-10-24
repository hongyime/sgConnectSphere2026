---
date: 2026-10-23T21:39:36+08:00
runner: lexinphun2024-debug
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: "171026"
database: real
commit: 25629b0
pr: 298
---

Manual run of TC_E06S04_07, the last E06-S04 case (story SCRUM-48), on
#298's head `25629b0`. TC_07 was recorded N/A on 16 October
(`20261016-185304-lexinphun2024-debug-frontend-e2e.md`) because releasing a
confirmed booking needs E10-S04 event cancellation; the Product Owner kept the
case in E06-S04 (17 October), and E10-S04 is now merged into this branch
(#320, #321). Le Xin ran it by hand in a real browser, using a normal window
for Venue Staff (`venue_a`) and a private window for `coord_a`, signing in
through the login page. Every screenshot below was taken by Le Xin by hand
(T-93).

The stack was:

- the frontend (Vite, 127.0.0.1:5173)
- the local API (`backend/src/dev.ts`, 3001) started with only `DATABASE_URL`
  (no `DATABASE_POOLER_URL`), so nothing reached the shared database
- a native PostgreSQL 17.11 server on this machine (127.0.0.1:5432; no Docker
  Desktop, per AGENTS.md), with `connectsphere_dev_stack` created for this
  run, then reset and seeded with `npx tsx src/database/cli.ts reset`

Claude created and seeded the database, started the API and the frontend,
saved each screenshot as it arrived and ran the read-only database check at
the end; the database facts below come from that check.

Timing: the frontmatter `date` and the filename are when the first screenshot
(`TC_E06S04_07-1`) reached the session, 21:39:36; the third arrived at
21:47:44, Singapore time. Screenshot times are when each image was saved into
the session, not the moment it was taken.

Seeded names replace the placeholders in the test case until #230 merges:
"Venue Z" → the seeded Orchid Hall request for EVT-3003 Planning Phase Gala
(25 Oct 2026, 6:00–10:00 pm); "Annual Tech Summit" → EVT-3003; the authorised
Coordinator → `coord_a` (Coordinator A, assigned to EVT-3003). The
precondition (a confirmed Venue Z booking) was set up in the browser by
approving the pending Orchid Hall request as `venue_a`.

`test_case_version` is `171026`, the newest test-case export on this branch
(added by #283 on 17 October); the table in `docs/source-of-truth.md` still
names `161026`. TC_E06S04_07's wording is the same in both.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S04_07 | A released booking is recorded with the actor, action, affected records and time | PASS | Precondition: as venue_a, opened the Orchid Hall / EVT-3003 request and approved it: "Approved. The booking is confirmed. Coordinator A has been notified." and pill Confirmed (`TC_E06S04_07-1`). As coord_a, opened EVT-3003 (Planning), Cancel event, reason "doing TC_E06S04_07 manual run to test on the cancel event part": pill Cancelled, "Event cancelled. Session arrangements have been released and notifications queued.", "Cancelled on 23 Oct 2026, 9:45 pm" (`TC_E06S04_07-2`). EVT-3003's Activity log for coord_a: "Booking approved · Orchid Hall: Pending → Confirmed · Venue Staff A · 23 Oct 2026, 9:38 pm", then "Booking released · Orchid Hall: Released · Coordinator A · 23 Oct 2026, 9:45 pm", then "Status changed · Planning → Cancelled · Coordinator A · 9:45 pm" (`TC_E06S04_07-3`). Database (read-only): exactly one `Booking Released` row: actor coord_a@connectsphere.com (Coordinator A, event_coordinator, EVT-3003's assigned Coordinator), entity venue_booking 6e35da57-4f14-58c6-8cc4-ec4d58047068 (Orchid Hall, now released), event 323975af-b348-5320-8716-a1100a9e74c3 (EVT-3003, now cancelled), field status → released, 23 Oct 2026 21:45:42 SGT; matches the Activity log row. |

Observations outside this story, for follow-up (both from E10-S04, #320):

- The cancellation banner runs the reason into the next sentence:
  "…test on the cancel event part This event is read-only." There is no full
  stop or line break between the Coordinator's reason and "This event is
  read-only."
- The release audit row stores only the new status (`old_value` empty), so
  the Activity log reads "Orchid Hall: Released" rather than "Orchid Hall:
  Confirmed → Released". TC_E06S04_07 does not require the earlier status.

## Screenshots

- [TC_E06S04_07-1](evidence/20261023-213936-lexinphun2024-debug-frontend-e2e/TC_E06S04_07-1.png): precondition, venue_a's "Approved. The booking is confirmed. Coordinator A has been notified." and pill Confirmed for Orchid Hall / EVT-3003
- [TC_E06S04_07-2](evidence/20261023-213936-lexinphun2024-debug-frontend-e2e/TC_E06S04_07-2.png): coord_a's cancellation of EVT-3003, pill Cancelled and "Event cancelled. Session arrangements have been released and notifications queued."
- [TC_E06S04_07-3](evidence/20261023-213936-lexinphun2024-debug-frontend-e2e/TC_E06S04_07-3.png): EVT-3003's Activity log with "Booking released · Orchid Hall: Released · Coordinator A · 23 Oct 2026, 9:45 pm"
