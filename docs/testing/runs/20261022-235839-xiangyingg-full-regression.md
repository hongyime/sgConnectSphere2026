---
date: 2026-10-22T23:58:39+08:00
runner: xiangyingg
scope: full-regression
environment: local
run_type: automated
test_case_version: 171026
database: mocked
commit: 4b37591
pr: 320
---

# Application CI timeout follow-up

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Complete scaffold desktop/mobile browser suite | PASS | CI=1 npx playwright test --config=<temporary-isolated-port-config>: 328 passed, 340 pre-existing skipped cases, zero failures, 1.4 minutes. Same tests/e2e, global setup, desktop/mobile projects, two workers and CI retry setting; temporary config only fixes server cwd, port 5183, output directory and list reporter. No existing test or skip state modified. Initial temporary-config attempt failed because the server cwd resolved outside the project; corrected and full rerun passed. Missing-port-3001 fixture warnings also appeared locally, while tests passed; they are not the CI deadline cause. |
| MULTIPLE | Workflow/browser installation and repository validation | PASS | npx playwright install --help and install --dry-run --only-shell chromium confirm support and only headless-shell/FFmpeg targets. python3 scripts/check.py passed with 163 tooling tests; git diff --check passed. Linux package installation and new GitHub run were not executed by this local validation; remote CI remains separate. |

Source HEAD plus staged workflow/doc changes. The cancelled run is separately
recorded in 20261022-223346-xiangyingg-full-regression.md. Its installation took
8m26s due Ubuntu package fetch delays, leaving insufficient room in the old
15-minute total budget. Workflow now budgets 25 minutes and omits the unused
full-Chromium download using --only-shell. All acceptance steps, assertions,
existing skips and auth/scaffold projects are retained. No manual screenshot
rerun, application behavior change or production operation is claimed.
