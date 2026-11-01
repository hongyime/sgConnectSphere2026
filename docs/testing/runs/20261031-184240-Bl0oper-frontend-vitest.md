---
date: 2026-10-31T18:42:40+08:00
runner: Bl0oper
scope: frontend/vitest
environment: local
run_type: automated
test_case_version: "311026"
database: mocked
commit: ab99f61
---

SCRUM-66 / E09-S04 gate 5: the whole frontend component suite, `npx vitest
run --no-file-parallelism` (Windows), on branch
`feature/SCRUM-66-waiting-list` at `ab99f61`. Stubbed API (mocked). The
waiting-list tests are #379's, in
`frontend/src/features/attendee/WaitingList.test.tsx`; this branch added
TC_E09S04_04 to one title in `EventRegistration.test.tsx`. Run by Claude for
Aaron, from about 18:42:40 to 18:47:20.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E09S04_01 | TC_E09S04_01 - join a full enabled Event and show position-free status and claim link | PASS | "You're on the waiting list", no position; "Claim a released place" link |
| TC_E09S04_02 | TC_E09S04_02 - join errors stay visible and a place race can be retried | PASS | The server's message stays on the page |
| TC_E09S04_03 | TC_E09S04_03 - claiming sends the chosen Session through the registration flow | PASS | The claim posts `claimWaitlist: true` with the chosen Session |
| TC_E09S04_04 | TC_E09S04_04 - full Events with the list disabled do not offer joining | PASS | Waiting-list page: "This event is full and the Organiser has disabled its waiting list.", no Join button |
| TC_E09S04_04 | TC_E09S04_04 - a full event with its waiting list off offers only a request for review, on the event page too | PASS | "You can still send a registration request. The organiser reviews requests over capacity."; no "Join the waiting list" link; "Register" shown |
| TC_E09S04_05 | TC_E09S04_05 - cancel leaving, then confirm leaving and offer rejoin | PASS | Confirm panel, "You've left the waiting list…", "Join again" |
| MULTIPLE | Rest of the frontend suite | PASS | 749/749 passed in 70 files, 0 failed |
