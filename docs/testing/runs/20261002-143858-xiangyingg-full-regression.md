---
date: 2026-10-02T14:38:58+08:00
runner: xiangyingg
scope: full-regression
environment: local
run_type: regression
test_case_version: "011026"
commit: 284ac4c
pr: 175
---

Focused revalidation with the CodeQL presence-check fix uncommitted on this HEAD.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | EventEditForm Vitest suite | PASS | 16 passed, 0 failed; `cd frontend && npx vitest run src/features/events/EventEditForm.test.tsx --no-file-parallelism`. |
| MULTIPLE | Root typecheck | PASS | `npm run typecheck`: frontend and backend passed. |
| MULTIPLE | Repository hygiene and tooling | PASS | `python3 scripts/check.py`: 76 tests passed, 0 failed, no hook skips. |
