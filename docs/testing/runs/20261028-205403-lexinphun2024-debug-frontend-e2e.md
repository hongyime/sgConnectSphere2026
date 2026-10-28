---
date: 2026-10-28T20:54:03+08:00
runner: lexinphun2024-debug
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: "281026"
database: real
commit: 0b1a28c
pr: 335
---

Story-owner rerun of TC_E06S04_07 (E06-S04, story SCRUM-48) on #335's head
`0b1a28c`, as requested after #335 added a booking reference to booking rows
in the Activity log so that same-venue releases can be told apart. The
previous manual run (`20261023-213936-lexinphun2024-debug-frontend-e2e.md`,
#298 head `25629b0`) predates that change. Le Xin ran it by hand in a real
browser, using a normal window for Venue Staff (`venue_a`) and a private
window for `coord_a`, signing in through the login page. Every screenshot
below was taken by Le Xin by hand (T-93).

The stack, all from a detached worktree at `0b1a28c`:

- the frontend (Vite, 127.0.0.1:5173)
- the local API (`backend/src/dev.ts`) started with only `DATABASE_URL`
  (no `DATABASE_POOLER_URL`), so nothing reached the shared database
- native PostgreSQL 17 on this machine (127.0.0.1:5432; no Docker Desktop,
  per AGENTS.md), `connectsphere_dev_stack` reset and seeded with
  `npx tsx src/database/cli.ts reset` immediately before the run

Claude reset and seeded the database, started the API and the frontend, and
saved each screenshot Le Xin pasted into the session under its TC_ID. Le Xin
ran the read-only database check in their own terminal (`TC_E06S04_07-4`).

Timing: the frontmatter `date` and the filename are when the run finished,
20:54:03 Singapore time, when the last screenshot (`TC_E06S04_07-4`, the
database check) reached the session. The database was reset at 20:46:49; the
approval was made at 8:48 pm and the cancellation at 8:51 pm, as shown in the
screenshots. Screenshot times are when each image was saved into the session,
not the moment it was taken.

Seeded names replace the placeholders in the test case: "Venue Z" → the
seeded Orchid Hall request for EVT-3003 Planning Phase Gala (25 Oct 2026,
6:00–10:00 pm); "Annual Tech Summit" → EVT-3003; the authorised Coordinator →
`coord_a` (Coordinator A, assigned to EVT-3003). The precondition (a
confirmed Venue Z booking) was set up in the browser by approving the pending
Orchid Hall request as `venue_a`.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S04_07 | A released booking is recorded with the actor, action, affected records and time | PASS | Precondition: as venue_a, opened the Orchid Hall / EVT-3003 request and approved it: "Approved. The booking is confirmed. Coordinator A has been notified." and pill Confirmed (`TC_E06S04_07-1`). As coord_a, opened EVT-3003 (Planning), Cancel event (opens the cancel page), Cancel event…, reason "Client withdrew the event", Cancel event: pill Cancelled, "Event cancelled. Session arrangements have been released and notifications queued.", "Cancelled on 28 Oct 2026, 8:51 pm" (`TC_E06S04_07-2`). EVT-3003's Activity log for coord_a: "Booking approved · Orchid Hall: Pending → Confirmed · Booking reference: 6e35da57-4f14-58c6-8cc4-ec4d58047068 · Venue Staff A · 28 Oct 2026, 8:48 pm", "Status changed · Planning → Cancelled · Coordinator A · 8:51 pm", and "Booking released · Orchid Hall: Released · Booking reference: 6e35da57-4f14-58c6-8cc4-ec4d58047068 · Coordinator A · 28 Oct 2026, 8:51 pm" (`TC_E06S04_07-3`). Database (read-only, `TC_E06S04_07-4`): `Booking Approved` by Venue Staff A at 20:48:02 and exactly one `Booking Released` by Coordinator A at 20:51:03, both for Orchid Hall, EVT-3003, booking 6e35da57-4f14-58c6-8cc4-ec4d58047068; the released row's booking id and time match the Activity log. |

Observations outside this story, unchanged since the 23 October run (both
from E10-S04, #320):

- The cancellation banner still runs the reason into the next sentence:
  "…Client withdrew the event This event is read-only."
- The release audit row stores only the new status (`old_value` empty), so
  the Activity log reads "Orchid Hall: Released" rather than "Orchid Hall:
  Confirmed → Released". TC_E06S04_07 does not require the earlier status.

## Screenshots

- [TC_E06S04_07-1](evidence/20261028-205403-lexinphun2024-debug-frontend-e2e/TC_E06S04_07-1.png): precondition, venue_a's "Approved. The booking is confirmed. Coordinator A has been notified." and pill Confirmed for Orchid Hall / EVT-3003
- [TC_E06S04_07-2](evidence/20261028-205403-lexinphun2024-debug-frontend-e2e/TC_E06S04_07-2.png): coord_a's cancellation of EVT-3003, pill Cancelled and "Event cancelled. Session arrangements have been released and notifications queued."
- [TC_E06S04_07-3](evidence/20261028-205403-lexinphun2024-debug-frontend-e2e/TC_E06S04_07-3.png): EVT-3003's Activity log with "Booking released · Orchid Hall: Released · Booking reference: 6e35da57-… · Coordinator A · 28 Oct 2026, 8:51 pm" and the matching approval row
- [TC_E06S04_07-4](evidence/20261028-205403-lexinphun2024-debug-frontend-e2e/TC_E06S04_07-4.png): read-only database check, the `Booking Released` row for the same booking id at 20:51:03
