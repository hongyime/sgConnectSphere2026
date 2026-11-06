# docs/release-1-test-cases-cleanup

Goal: leave one consolidated test-case workbook in the working tree for the
Release 1 submission. Deletes the 29 superseded dated
`PROJECT TEST CASES CAA <DDMMYY>.xlsx` exports and two PR-specific review
notes whose PRs merged. History stays in Git (docs/source-of-truth.md:
"Historical versions are tracked and preserved in Git commit history rather
than retaining multiple dated duplicate binary files in the working tree").

Also adds Aaron's "4. TEST CASES" deliverable to `submission/4. TEST CASES/`
(the folder #444 created, owned by Aaron per `submission/README.md`): a copy
of the local submission folder as of 6 Nov 2026, nothing else under
`submission/` touched.

## Done

- Kept `PROJECT TEST CASES CAA 051126.xlsx` (named in docs/source-of-truth.md)
  and the undated `PROJECT TEST CASES.xlsx` (input of tc_coverage_audit.py).
- Run records keep their `test_case_version` values; each named workbook is
  recoverable from Git history.
- Copied the workbook, README, Playwright HTML reports (local and Vercel),
  per-TC screenshots and the Stryker report into `submission/4. TEST CASES/`.
  Hook fixers may add final newlines to the generated HTML and Markdown; the
  content is otherwise byte-identical to the local copy.

## Not done

- The companion PR from `docs/release-1-test-cases-submission` regenerates the
  current export; once it merges, docs/source-of-truth.md should name the new
  export and CAA 051126 can go too (not this branch's paths).
- The submission workbook and README still call the defects "Jira Bugs";
  SCRUM-256 to 259 became Stories on 6 Nov. If the workbook is rebuilt, copy
  it into `submission/4. TEST CASES/` again.
