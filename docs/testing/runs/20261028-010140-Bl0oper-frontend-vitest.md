---
date: 2026-10-28T01:01:40+08:00
runner: Bl0oper
scope: frontend/vitest
environment: local
run_type: automated
test_case_version: "271026"
database: mocked
commit: a728b57
---

SCRUM-67 / E09-S05 gate 5: the whole frontend component suite, `npx vitest
run --no-file-parallelism` (Windows), on branch
`feature/SCRUM-67-withdraw-registration` at `a728b57`. Stubbed API
(mocked). The withdrawal tests are in
`frontend/src/features/attendee/EventRegistration.test.tsx`. Run by Claude
for Aaron, from 01:01:40 to 01:04:16.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E09S05_03 | after the deadline the contact replaces the button; a waitlisted entry gets no button here | PASS | "Withdrawal has closed" with a mail link to the contact and no Withdraw button; a waitlisted entry shows no button (that is E09-S04's) |
| MULTIPLE | Withdrawal screens: deadline, confirm panel and "not registered" afterwards; Pending wording; a refusal shown in the panel and Cancel; StrictMode and a late reply after leaving; a deadline after the event start not promised | PASS | 5 tests without a single TC ID |
| MULTIPLE | Rest of the frontend suite | PASS | 626/626 tests in 63 files passed |
