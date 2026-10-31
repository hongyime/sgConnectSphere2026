---
date: 2026-10-30T22:21:59+08:00
runner: lexinphun2024-debug
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: "281026"
database: real
commit: 73851ec
pr: 381
---

Story owner's partial manual re-run of E10-S02 (story SCRUM-71, run subtask
SCRUM-238) on #380's head `73851ec`, after both #380 review fixes changed the
Coordinator's save code (the stale-preview guard with the preview revision, then
the separate write state). Le Xin re-ran sections A and B of
`docs/testing/manual/E10-S02-click-through.md` by hand in a real browser,
because these three cases go through that save code. The other six cases rest
on the earlier full manual run (`20261030-154914-lexinphun2024-debug-frontend-e2e.md`,
9/9 at `8e2d7ee`, unchanged) and the automated real-stack re-run of all nine at
`0632086` (`20261030-221403-lexinphun2024-debug-frontend-e2e.md`). Every
screenshot below was taken by Le Xin by hand (T-93).

The stack, from the working tree at `73851ec`: Vite on 127.0.0.1:5173; the local
API (`backend/src/dev.ts`) with only `DATABASE_URL`; native PostgreSQL 17
`connectsphere_dev_stack` on 127.0.0.1:5432, reset, seeded and loaded with
`E10-S02-preconditions.sql` stage `setup` before the run. Claude reset the data,
saved each pasted screenshot under its TC_ID and ran a read-only check after the
last one: EVT-1021 runs 20 Nov 09:00 to 17:00 with the new description, and both
E10 Grand Hall and E10 Projector are flagged for reconfirmation.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S02_02 | Editing only the event description should flag nothing | PASS | organiser_a changed only EVT-1021's description: "Saved your changes to the description. The activity log has been updated.", no review step. As coord_a, E10 Grand Hall is still Confirmed (15 Nov 9:00 am – 5:00 pm) with no "Needs reconfirmation" note. |
| TC_E10S02_03 | Saving a change that affects confirmed arrangements should show them before it takes effect | PASS | As coord_a, changed EVT-1021 to 20 Nov 2026 09:00–17:00 and pressed Save changes. "Check what this change affects" listed E10 Grand Hall and E10 Projector, both "date or time changed", and said saving notifies the Venue Staff and Technical Support Staff; the event still showed 15 Nov. Cancel went back to the form with the new dates still filled in. |
| TC_E10S02_05 | Changing a date should flag its booking and equipment reservation | PASS | Saved again and pressed "Save and ask staff to reconfirm": "Saved your changes to the start and end. They're recorded in the event's activity log. 2 arrangements were flagged for reconfirmation and the Venue Staff and Technical Support Staff were notified." Event date now 20 Nov 2026, 9:00 am – 5:00 pm. E10 Grand Hall shows "Needs reconfirmation". |

Timing: `date` and the filename are when the last screenshot (`TC_E10S02_05-2`)
reached the session, 22:21:59 Singapore time.

## Screenshots

- [TC_E10S02_02-1](evidence/20261030-222159-lexinphun2024-debug-frontend-e2e/TC_E10S02_02-1.png): organiser_a's description saved, no review step
- [TC_E10S02_02-2](evidence/20261030-222159-lexinphun2024-debug-frontend-e2e/TC_E10S02_02-2.png): E10 Grand Hall Confirmed with no "Needs reconfirmation"
- [TC_E10S02_03-1](evidence/20261030-222159-lexinphun2024-debug-frontend-e2e/TC_E10S02_03-1.png): "Check what this change affects" listing E10 Grand Hall and E10 Projector
- [TC_E10S02_03-2](evidence/20261030-222159-lexinphun2024-debug-frontend-e2e/TC_E10S02_03-2.png): the form after Cancel, new dates still filled in
- [TC_E10S02_05-1](evidence/20261030-222159-lexinphun2024-debug-frontend-e2e/TC_E10S02_05-1.png): "2 arrangements were flagged for reconfirmation…", event on 20 Nov
- [TC_E10S02_05-2](evidence/20261030-222159-lexinphun2024-debug-frontend-e2e/TC_E10S02_05-2.png): E10 Grand Hall "Needs reconfirmation"
