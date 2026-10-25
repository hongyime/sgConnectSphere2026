---
date: 2026-10-19T14:14:44+08:00
runner: Bl0oper
scope: backend/unit
environment: local
run_type: automated
test_case_version: "171026"
database: mocked
commit: e1d6f01
---

SCRUM-44 / E05-S05 gate 1: the whole backend unit suite, `npm test --workspace
backend`, with stubbed queries and no database. Includes the two new
TC_E05S05_07 tests in `tests/venueSearch.test.ts`. Run by Claude for Aaron,
from 14:14:44 to 14:14:57.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E05S05_07 | An unavailable venue names the buffered overlap in Singapore time | PASS | New. Overlap 04:30–04:45 UTC reads "Unavailable during the requested period: another booking needs the venue from 15 Jan 2027, 12:30 pm to 15 Jan 2027, 12:45 pm, including setup and turnaround." |
| TC_E05S05_07 | An unavailable venue with no clashing booking keeps the plain sentence | PASS | New. With `booking_overlap` null or missing: "Unavailable during the requested period." |
| MULTIPLE | Rest of the backend unit suite | PASS | 417/417 passed in total |
