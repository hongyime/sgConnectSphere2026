# 4. TEST CASES — ConnectSphere Release 1

Test cases and their execution evidence, built from the repository's Markdown
test cases (`docs/testing/cases/`) and the 6 November 2026 evidence runs.

| Item | What it is |
| --- | --- |
| `ConnectSphere Release 1 Test Cases.xlsx` | The workbook. **Summary**: totals, runs by environment and suite, coverage, pass rate by story and environment. **Test Cases**: the IS212 Week 4 template fields (Test Case ID, Test Scenario, Pre-conditions, Test Steps, Test Data, Expected Result, Created By, Date of Creation) with Story ID, AC reference, technique, and the latest Actual Result, status (Pass / Fail / Not Executed / Blocked), Executed By, Date of Execution and evidence. **Execution Log**: one row per test per run per environment with timestamps (SGT), commit, browser and screenshot link, plus every earlier team run record. **Traceability**: each Release 1 acceptance criterion to its test cases and latest result. **Defects**: failures caused by the application, with their Jira Bugs. **Mutation Summary**: Stryker results. |
| `html-report-local/` | Playwright HTML reports of the local runs: `local-e2e` (browser suite, API stubbed), `local-auth-e2e` (authenticated real stack), `local-cancellation`, `local-completion`. Open each `index.html`. |
| `html-report-vercel/` | Playwright HTML reports against https://sgconnectsphere.vercel.app: `vercel-e2e` (browser suite) and `vercel-signin` (read-only sign-ins with the demo accounts). |
| `screenshots/<TC_ID>/` | A screenshot of every Playwright test, named by run, browser project and test; tests without a TC ID are under `_no-TC-id/`. |
| `mutation-report/` | Stryker mutation-testing report (`index.html`). |

Runs: commit `1ca12c5` (all suites), with the database suites rerun at
`f778c77` after a test-only fix; deployed site serving `1e286f7`. Unit and
integration suites ran with Node 22; database suites on PostgreSQL 17 in a
local container (never the production database); browsers are Chromium
desktop and Pixel 7 emulation. No video was recorded.
