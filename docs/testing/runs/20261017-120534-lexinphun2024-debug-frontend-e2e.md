---
date: 2026-10-17T12:05:34+08:00
runner: lexinphun2024-debug
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: "161026"
database: real
commit: 532b6c0
---

SCRUM-196 / E03-S12 manual click-through by Le Xin in Chrome on
`feature/SCRUM-196-organiser-save-alert` at 532b6c0 (code unchanged since
cdc6160), signed in as `organiser_a@clienta.com`. Set-up:

- a freshly reset and seeded local PostgreSQL 17 database (local container,
  127.0.0.1 only)
- the local API (`backend/src/dev.ts`) started with only `DATABASE_URL`
  (`DATABASE_POOLER_URL` unset), so nothing reached the shared database
- the Vite frontend on http://127.0.0.1:5173

Audit rows were checked read-only in the local database after TC_02, TC_04 and
TC_05. Start time is the first screenshot.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E03S12_01 | Organiser sees the shared success Alert after an allowed edit | PASS | EVT-101 (Submitted): renamed to "Product launch (updated)" and saved. Green success box with a tick: "Saved your changes to the event name. The activity log has been updated." |
| TC_E03S12_02 | Saved edit persists and its audit entry is not duplicated by feedback | PASS | After reload the heading kept "Product launch (updated)" and the box was gone. Activity log showed one entry: "Record updated · title — 17 October 2026 by Organiser A (Product launch (updated))". Database: exactly one audit row for the edit. |
| TC_E03S12_03 | Invalid input retains validation feedback without success | PASS | Cleared Event name and saved: red "Fix the highlighted fields, then save again." and "Event name can't be left empty." under the field. No green box; heading unchanged. |
| TC_E03S12_04 | Failed request after a prior success cannot leave a false confirmation | PASS | Saved "First change" (green box), then edited to "Failed second change" with DevTools set to Offline and saved: red "Unable to save your changes. Check your connection and try again.", no green box, heading still "First change". Database: no audit row for "Failed second change". |
| TC_E03S12_05 | Cancellation and post-approval restrictions remain unchanged | PASS | EVT-3001 (Approved): Starts, Ends and Expected attendance locked, each with "This field is restricted after approval. Request a change." Changed the name, clicked Cancel: form closed, no green box, name unchanged. Database: no audit row for EVT-3001. |

Side note, outside this story: on the edit form the lock icon sits on its own
line under each restricted field's label instead of beside it.

## Screenshots

- [TC_E03S12_01](evidence/20261017-120534-lexinphun2024-debug-frontend-e2e/TC_E03S12_01.png): green success box after saving the event name
- [TC_E03S12_02](evidence/20261017-120534-lexinphun2024-debug-frontend-e2e/TC_E03S12_02.png): after reload, new name kept and one Activity log entry
- [TC_E03S12_03](evidence/20261017-120534-lexinphun2024-debug-frontend-e2e/TC_E03S12_03.png): empty name, red validation, no success box
- [TC_E03S12_04](evidence/20261017-120534-lexinphun2024-debug-frontend-e2e/TC_E03S12_04.png): offline save error after "First change", no success box
- [TC_E03S12_05-1](evidence/20261017-120534-lexinphun2024-debug-frontend-e2e/TC_E03S12_05-1.png): Approved event, start/end/attendance locked with "Request a change"
- [TC_E03S12_05-2](evidence/20261017-120534-lexinphun2024-debug-frontend-e2e/TC_E03S12_05-2.png): after Cancel, form closed, name unchanged, no success box
