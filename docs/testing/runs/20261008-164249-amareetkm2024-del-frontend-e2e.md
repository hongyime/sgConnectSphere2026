---
date: 2026-10-08T16:42:49+08:00
runner: amareetkm2024-del
scope: frontend/e2e
environment: local
run_type: automated
test_case_version: 031026
database: mocked
commit: 3ccf2c3
pr: 237
---

`npx playwright test tests/e2e/technicalSupport.spec.ts` on Windows: 20/20
passed (10 tests × desktop Chrome and Pixel 7), against a stateful fake of
`/api/events` and `/api/venues?task=support|staffing` shaped like the real
handlers. Run by Claude for Amareet.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E07S06_01 | A request with a description and times is recorded and Technical Support Staff are notified | PASS | "2 Technical Support Staff members have been notified."; the card lists the request "Awaiting a technician"; the POST carried the event's times |
| TC_E07S06_02 | A request is accepted on an approved event before any venue is confirmed | PASS | Form says "You don't need a confirmed venue first."; "Technical support requested" |
| TC_E07S06_03 | Marking no technical support needed records it, notifies nobody and leaves nothing to staff | PASS | "Marked as needing no technical support. Nobody has been notified."; the button is gone; one `none` POST |
| TC_E07S07_01 | A colleague with no clash is assigned and the request is staffed | PASS | "Tech C is assigned and has been notified. It's on their schedule."; "Staffed" |
| TC_E07S07_02 | The assignment shows on the technician's schedule | PASS | My schedule lists "EVT-TC Tech Conference 2026", "12 Nov 2026, 9:00 am – 12:00 pm · 1 AV technician" |
| TC_E07S07_03 | A colleague with an overlapping assignment is refused, naming the clashing event | PASS | "Busy: EVT-CR Charity Run, 12 Nov 2026…"; "Tech B is already assigned to EVT-CR Charity Run at an overlapping time."; nothing assigned |
| TC_E07S07_04 | Removing an assignment frees the colleague and reopens the request | PASS | "Tech C is no longer assigned and has been notified. Their time is free again."; "Nobody is assigned yet."; "Needs a technician" |
| TC_E07S07_05 | A replacement goes through the same clash check | PASS | After the removal, Tech B is still refused; Tech A is assigned |
| TC_E07S07_06 | The colleague is notified when assigned and again when removed | PASS | Tech C's notices: "Technical support assignment", then "Technical support assignment removed" |
| MULTIPLE | Request form refuses blank, too-long and reversed input | PASS | The three server sentences shown; no POST sent |
