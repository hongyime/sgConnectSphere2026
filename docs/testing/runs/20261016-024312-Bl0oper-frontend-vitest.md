---
date: 2026-10-16T02:43:12+08:00
runner: Bl0oper
scope: frontend/vitest
environment: local
run_type: automated
test_case_version: "161026"
database: mocked
commit: b68a0a5
---

SCRUM-60 / E08-S03 gate F1: the whole frontend component suite
(`npx vitest run --no-file-parallelism` in `frontend/`), including the new
`EventReadiness.test.tsx` and `ConfirmedArrangements.test.tsx` and the
Safety Review label test in `shared.test.tsx`. A stubbed API shaped like the
live endpoints; no database. 423/423 passed. Run by Claude for Aaron.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E08S03_09 | Outstanding venue, equipment and support are listed before submitting, each by name | PASS | Warning alert lists each server sentence |
| TC_E08S03_03 | A blocked submission shows the server sentence and the refreshed outstanding items | PASS | Also TC_E08S03_04; nothing changes; focus returns to the button on Cancel |
| TC_E08S03_08 | Submitting a ready event moves it to Safety Review and says who was notified | PASS | Rendered in StrictMode; pill reads "Safety Review" |
| TC_E08S03_10 | None required and no support needed read as words | PASS | — |
| TC_E08S03_05 | Once confirmed, the Organiser sees every confirmed venue with its purpose and period, and the arrangements | PASS | Also the empty and free-text cases |
| MULTIPLE | Safety Review and Approved offer nothing to submit; refusals; late answers; old confirm link; event page link and fix (b); fix (a) | PASS | — |
| MULTIPLE | The rest of the frontend suite | PASS | 423/423 in total |
