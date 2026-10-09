# test/week7-playwright-scaffolds

Goal: Add traceable Playwright `test.fixme` scaffolds for the 58 acceptance test cases added by the Week 7 backlog changes in PR #205, and regenerate the coverage inventory without asserting that unimplemented behavior passes.

## Done so far

- Audited the added TC_IDs in the merged PR #205 case-catalogue changes; found 58 unique cases across E01, E03, E05, E06, E08, E09 and E10.
- Found four active email-verification tests in `tests/e2e/verify.spec.ts` carrying the new E01-S12 identifiers even though those IDs now describe Event Coordinator scope. Preserve those tests and remove the incorrect TC_ID labels so the new coordinator cases can be scaffolded honestly.
- Added test.fixme declarations for the Week 7 case IDs in their matching Epic spec files and updated their case-count/source headers.
- Regenerated the coverage inventory; all 58 Week 7 IDs now report as scaffolds. The full catalogue reports 118 active tests, 193 scaffolds and 3 older cases with no test reference.
- Ran the coverage audit and repository check successfully, then pushed the implementation as `490f880` (`test(e2e): scaffold Week 7 acceptance cases`). The branch is based on `main` at `1c1be82`.
- Opened draft PR #217 and published its required PostPlan review at `https://kvwc99kdmfsx.postplan.dev`.
- The implementation passed application and repository checks on `6ebef66`; T-65 records capture those test runs. Current branch head `79cb7df` is based on `main` at `1c1be82`, and all current PR checks pass.
- PR #217 is ready for review. Its PostPlan is `https://kvwc99kdmfsx.postplan.dev`; Vercel also passed after the PR became ready.

## Not done / next

- Await human review and approval, resolve any requested changes, and merge only through the protected PR workflow.
- Do not report scaffold placeholders as application behavior tests.

## Decisions without team sign-off

- Kept the four email-verification browser tests active and unchanged in behavior while removing only their invalid E01-S12 case identifiers; the canonical case catalogue has no matching email-verification cases under those new IDs.
- Used the canonical case titles and Markdown files as the source for test names and implementation references; no acceptance-test behavior was invented in the placeholder bodies.

## Verification

- `python scripts/tc_coverage_audit.py` — passed; all 58 Week 7 IDs are scaffolded in `docs/testing/tc-coverage.md`.
- `python scripts/check.py` — passed with 77 repository-tooling tests and repository hygiene checks; session run records capture the observed runs.
- CI `application-checks` — passed on `6ebef66`; all configured steps succeeded, including the Playwright scaffold command. The new `test.fixme` declarations remain skipped placeholders and do not prove behavior. A T-65 session record captures the run.
- PR #217 required checks passed on implementation commit `6ebef66`; all latest check statuses also pass on `79cb7df`.
- The browser scaffold suite was not run locally.
