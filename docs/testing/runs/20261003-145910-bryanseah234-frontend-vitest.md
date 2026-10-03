---
date: 2026-10-03T14:59:10+08:00
runner: bryanseah234
scope: frontend/vitest
environment: local
run_type: manual
test_case_version: 031026
database: mocked
commit: dbfb642
pr: 185
---

Review follow-up on PR #185 (Bl0oper and Amareet's design.md points: dates through formatDate, no leading "Please", busy state on Remove). The working tree at this commit plus the three uncommitted fixes was tested; the fixes are committed as the next commit on the branch. Command:

    npm test --workspace frontend -- --run --pool vmThreads --no-file-parallelism src/features/venue/VenueBlockout.test.tsx

7/7 passed, exit 0. Component tests against a mocked fetch; no database.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | VenueBlockout.test.tsx (7 tests, incl. the list showing 5 Jan 2027 / 10 Jan 2027 and remove via ConfirmPanel) | PASS | vitest run, 7 passed |
