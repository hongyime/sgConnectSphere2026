---
date: 2026-10-26T22:56:46+08:00
runner: lexinphun2024-debug
scope: frontend/e2e
environment: local
run_type: automated
test_case_version: "241026"
database: mocked
commit: 84a8130
pr: 348
---

SCRUM-152 / E05-S06 Playwright specs that open the venue calendar or the
venue pages, after bringing #349's calendar handling of the 'conflicting'
state into #348. `npx playwright test tests/e2e/e05.spec.ts
tests/e2e/e06.spec.ts tests/e2e/e08.spec.ts tests/e2e/e10.spec.ts
tests/e2e/venue.spec.ts --reporter=line`, desktop and mobile projects, API
mocked with `page.route`, on the working tree committed unchanged as
`84a8130`. The skipped tests are `test.fixme` scaffolds, including the
E05-S06 screen cases that #349 makes live. The `date` is when the command
started.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | e05, e06, e08, e10 and venue specs | PASS | 30 passed, 0 failed, 178 skipped |
