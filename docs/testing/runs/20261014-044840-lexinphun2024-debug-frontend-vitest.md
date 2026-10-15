---
date: 2026-10-14T04:48:40+08:00
runner: lexinphun2024-debug
scope: frontend/vitest
environment: local
run_type: regression
test_case_version: "131026"
database: none
commit: 3c17536
pr: 247
---

SCRUM-176 / E03-S11. Re-run after merging `main` into the branch.
`npx vitest run` in `frontend/`: 39 files, 357/357 passed.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | the Organiser can fill in registration setup, shown with the dates under Registration | PASS | Unchanged after the merge. |
| MULTIPLE | registration date tests ("Registration opens" / "Registration closes") | PASS | Unchanged after the merge. |
| MULTIPLE | Activity log (E14-S02) describes edits with field labels | PASS | `ActivityLog.test.tsx` passes; the label map now includes `registrationSetup`. |
| MULTIPLE | full frontend suite | PASS | 357/357; no regressions from the merged `main` changes. |
