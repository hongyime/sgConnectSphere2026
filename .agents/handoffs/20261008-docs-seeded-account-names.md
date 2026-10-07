# PR #230 seeded account names review fixes

Address PR #230 / E01-S12 (SCRUM-156) by matching the cross-coordinator refusal case to the seeded EVT-2003 fixture, regenerating the acceptance-test workbook, and completing the required PR description sections.

## Done so far

- Confirmed EVT-2003 is assigned to coordB and has status under_review in backend/src/database/cli.ts.
- Updated TC_E01S12_02 to identify EVT-2003 and its seeded Under Review status while coord_a is signed in.
- Regenerated the dated acceptance-test workbook from canonical Markdown; updated the source-of-truth index.

## Verification

- scripts/export_testcases_xlsx.py --date 081026: generated 314 cases across 12 epic files.
- scripts/check.py: passed hygiene checks and all 87 repository tooling tests.
- git diff --check: clean.

## Next steps

- Commit and push the focused documentation and generated workbook changes.
- Update PR #230's body with all four required headings and observed verification.
