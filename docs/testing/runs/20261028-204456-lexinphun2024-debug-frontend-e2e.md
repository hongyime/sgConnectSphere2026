---
date: 2026-10-28T20:44:56+08:00
runner: lexinphun2024-debug
scope: frontend/e2e
environment: local
run_type: automated
test_case_version: "281026"
database: real
commit: 0b1a28c
pr: 335
---

Pre-manual check of TC_E06S04_07 on #335's head `0b1a28c`, before the story
owner's T-93 run. Native loopback PostgreSQL 17 (`connectsphere_dev_stack`)
reset and seeded with `src/database/cli.ts reset`; API started with only
`DATABASE_URL` (no pooler URL) and the Vite frontend, both from a detached
worktree at `0b1a28c`. A temporary, uncommitted Playwright script in headless
Chromium followed the E06-S04 click-through guide: step 3, then steps 19–21.
Agent screenshots are not manual evidence (T-93).

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E06S04_07 | A released booking is recorded with the actor, action, affected records and time | PASS | Step 3 as `venue_a`: "Approved. The booking is confirmed. Coordinator A has been notified." Step 19 as `coord_a`: the event page's **Cancel event** link opens the cancel page; **Cancel event…**, a reason, then **Cancel event** showed "Event cancelled. Session arrangements have been released and notifications queued." Step 20: one Activity log row, **Booking released**, "Orchid Hall: Released", "Booking reference: 6e35da57-4f14-58c6-8cc4-ec4d58047068", by Coordinator A, 28 Oct 2026, 8:44 pm. Step 21 (read-only SQL, booking id added): `Booking Released` by Coordinator A, Orchid Hall, EVT-3003, booking `6e35da57-4f14-58c6-8cc4-ec4d58047068`, 20:44:56 SGT, matching the screen; the approval row (Venue Staff A, 20:44:54) has the same booking id. |

Two earlier attempts on the same setup stopped at step 19 because the script
looked for a button rather than the **Cancel event** link; that was a script
error, not an application fault. The database was reset before each attempt.

`date` is when the browser script finished (20:44:56 Singapore time); the
read-only database check ran straight after it.
