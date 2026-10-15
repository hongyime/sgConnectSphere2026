---
date: 2026-10-14T04:48:32+08:00
runner: lexinphun2024-debug
scope: backend/unit
environment: local
run_type: regression
test_case_version: "131026"
database: mocked
commit: 3c17536
pr: 247
---

SCRUM-176 / E03-S11. Re-run after merging `main` (Week 9 docs #253 to #255
and venue holds #245) into the branch. `npm test` in `backend/`: 360/360
passed, 0 failed, 0 skipped.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | organiser can fill in registration setup before approval, but not after | PASS | Accepted before approval and audited as `Record updated` / `registrationSetup`; refused with 409 after approval. |
| MULTIPLE | organiser post-approval unrestricted edits are audited | PASS | Unchanged behaviour after the merge. |
| MULTIPLE | full backend unit suite | PASS | 360/360; no regressions from the merged `main` changes. |
