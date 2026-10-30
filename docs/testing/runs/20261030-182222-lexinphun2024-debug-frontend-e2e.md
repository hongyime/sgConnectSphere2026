---
date: 2026-10-30T18:22:22+08:00
runner: lexinphun2024-debug
scope: frontend/e2e
environment: local
run_type: automated
test_case_version: 281026
database: mocked
commit: 770d24c
---

Command: `npx playwright test` (desktop Chrome and Pixel 7, API replies faked with
`page.route`) with a clean working tree at the commit. 422 passed, 264 skipped
(`test.fixme` scaffolds, the same set as before), 0 failed. E10-S02 / SCRUM-71,
fixes for the PR #380 review. The fake Coordinator backend now issues a revision with
each preview and refuses a save whose `reviewed` differs, as the server does; the
database behaviour is `20261030-182155-lexinphun2024-debug-backend-db.md`.

Before this run, ignoring the stale-review refusal in the form failed the new browser
test on desktop and mobile; the code was restored first.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E10S02_02 | Editing only the event description should flag nothing | PASS | Desktop and mobile; the save now also carries the preview revision |
| TC_E10S02_03 | Saving a change that affects confirmed arrangements shows them before it takes effect | PASS | Desktop and mobile; the confirmed save carries the shown revision |
| TC_E10S02_04 | Capacity below the registration count warns without removing anyone | PASS | Desktop and mobile |
| TC_E10S02_06 | Technical Support Staff are notified as well as Venue Staff | PASS | Desktop and mobile |
| MULTIPLE | The arrangements change during the review (#380 review point 2) | PASS | Desktop and mobile: the refused save shows the warning and Garden Hall, nothing saved; confirming the fresh list saves 3 arrangements, with revisions rev-1 then rev-2 |
| MULTIPLE | Full Playwright suite | PASS | 422 passed, 264 fixme skipped, 0 failed |
