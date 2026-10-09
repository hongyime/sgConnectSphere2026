---
date: 2026-10-09T22:58:20+08:00
runner: lexinphun2024-debug
scope: frontend/vitest
environment: local
run_type: automated
test_case_version: "091026"
database: mocked
commit: e6f58ea
---

Follow-up to #175 / #132. `npx vitest run` in `frontend/`: 37 files,
345/345 passed. Same working tree as commit e6f58ea. Coverage of
`EventEditForm.tsx`: every changed line is covered. The one uncovered line
(109, the registration-date ISO conversion inside `buildPatch`) is older code
this change did not touch.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | the Organiser can fill in registration setup, shown with the dates under Registration | PASS | "Registration setup" textarea shows the saved value, is editable, and sits in the Registration group with "Registration opens". |
| MULTIPLE | registration setup is sent like the other text fields | PASS | Sent trimmed as `registrationSetup`. |
| MULTIPLE | registration date tests (labels now "Registration opens" / "Registration closes") | PASS | Values shown in local format, read-only when locked, invalid pair marked `aria-invalid` with the error as the description. |
| TC_E03S03_11 | an edit from a tab opened before the rejection is refused, with no change-request link | PASS | Fixture updated to the new editable list that includes `registrationSetup`. |
