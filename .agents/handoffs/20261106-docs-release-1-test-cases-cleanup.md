# docs/release-1-test-cases-cleanup

Goal: leave one consolidated test-case workbook in the working tree for the
Release 1 submission. Deletes the 29 superseded dated
`PROJECT TEST CASES CAA <DDMMYY>.xlsx` exports and two PR-specific review
notes whose PRs merged. History stays in Git (docs/source-of-truth.md:
"Historical versions are tracked and preserved in Git commit history rather
than retaining multiple dated duplicate binary files in the working tree").

## Done

- Kept `PROJECT TEST CASES CAA 051126.xlsx` (named in docs/source-of-truth.md)
  and the undated `PROJECT TEST CASES.xlsx` (input of tc_coverage_audit.py).
- Run records keep their `test_case_version` values; each named workbook is
  recoverable from Git history.

## Not done

- The companion PR from `docs/release-1-test-cases-submission` regenerates the
  current export; once it merges, docs/source-of-truth.md should name the new
  export and CAA 051126 can go too (not this branch's paths).
