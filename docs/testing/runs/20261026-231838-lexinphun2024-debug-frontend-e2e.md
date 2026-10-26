---
date: 2026-10-26T23:18:38+08:00
runner: lexinphun2024-debug
scope: frontend/e2e
environment: local
run_type: automated
test_case_version: "241026"
database: mocked
commit: 52ce829
pr: 349
---

SCRUM-152 / E05-S06 Playwright specs on #349's tree after merging #348's
review fixes (`f316573`). `npx playwright test tests/e2e/e05.spec.ts
tests/e2e/venue.spec.ts --reporter=line`, desktop and mobile projects, API
mocked with `page.route`. The live E05-S06 cases TC_E05S06_01–08 are
included; the skipped tests are `test.fixme` scaffolds for other stories.
The `date` is when the command started.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | e05 and venue specs, including TC_E05S06_01–08 | PASS | 46 passed, 0 failed, 44 skipped |
