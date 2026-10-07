---
date: 2026-10-01T22:26:19+08:00
runner: Bl0oper
scope: backend/api
environment: local
run_type: regression
test_case_version: 300926
commit: 42b635d
pr: 163
---

Real HTTP calls to the local API (`tsx src/dev.ts`, port 3033), signed in as
coord_a, coord_b, organiser_a, organiser_b and organiser_c, against a freshly
reset and seeded `connectsphere_dev_stack` database (Docker `postgres:17`),
with the database checked after each step. 20/20 checks passed. Run by Claude
for Aaron.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E03S02_01 | EVT-2003 moves to Awaiting Clarification; status change audited as coord_b; coord_b gets no notice | PASS | 201 |
| TC_E03S02_02 | Complete answer returns EVT-2003 to Under Review, answers linked, questions resolved; coord_b gets one "Clarification answered" notice with an email-outbox row | PASS | 200. Also organiser_b answering the seeded EVT-3002 question: 200 |
| TC_E03S02_03 | organiser_c's and coord_b's detail reads list both outstanding questions with dates, no author email | PASS | |
| TC_E03S02_04 | coord_b's Awaiting Clarification filter returns only matching events | PASS | Returned EVT-3002 of 3 assigned events |
| TC_E03S02_05 | coord_a refused on EVT-2003; nothing changes; denial audited; organiser_c's activity log doesn't show it | PASS | 403 "Only the assigned Coordinator can request clarification on this request." |
| TC_E03S02_06 | Request on EVT-3001 (Approved) refused; nothing changes | PASS | 409 "Clarification can only be requested while the request is Under Review." |
| TC_E03S02_07 | No questions, and a blank question, rejected; nothing changes | PASS | 400 "Add at least one question." |
| TC_E03S02_08 | 2001-character question rejected; nothing changes | PASS | 400 "Each question must be 2000 characters or fewer." The 2000-character case is in the database run |
| TC_E03S02_09 | Partial answer refused; both questions stay outstanding | PASS | 400 "Answer every outstanding question before resubmitting." |
| TC_E03S02_10 | organiser_a refused on organiser_b's EVT-3002; nothing changes; organiser_b's activity log doesn't show it | PASS | 403 "Only the Organiser who submitted this request can answer its questions." |
| TC_E03S02_11 | Answer on EVT-2003 while Under Review refused | PASS | 409 "This request is not awaiting clarification." |
| TC_E03S02_12 | organiser_c gets one "Clarification requested" notice listing both questions, numbered, with an email-outbox row; no questions outstanding after the answer | PASS | |
