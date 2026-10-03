---
date: 2026-10-02T16:27:01+08:00
runner: jininggg
scope: full-regression
environment: local
run_type: regression
test_case_version: 011026
commit: f0c4264
---

Publication refresh for SCRUM-45 / E06-S01. HEAD is current main; results include
the uncommitted venue UI changes. Main's #182 font change and both agent-history
entries are preserved. Earlier broader-suite results remain in their immutable
20261002-161552 and 20261002-161841 session records, not claimed as rerun here.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Frontend production build and backend typecheck | PASS | `npm run build`; existing bundle-size warning remains. |
| TC_E06S01_01 | Matching and combined filters | PASS | `npx playwright test tests/e2e/venue-search.spec.ts --workers=1`: 8 passed, desktop/mobile, mocked API. |
| TC_E06S01_02 | Near-match failures | PASS | Same browser run, current-main refresh. |
| TC_E06S01_03 | Undersized/layout capacity display | PASS | Same browser run. |
| TC_E06S01_04 | Unavailable venue display | PASS | Same browser run. |
| MULTIPLE | Repository hygiene and tooling | PASS | `python scripts/check.py`: passed; 76 tooling tests. |

Postplan HTML structure passed after adding the required SVG accessibility IDs;
render inspected locally. Upload was declined, so no hosted postplan is claimed.
No live database, Jira or provider changes. PR should remain draft pending hosted
review artifact and remote checks.
