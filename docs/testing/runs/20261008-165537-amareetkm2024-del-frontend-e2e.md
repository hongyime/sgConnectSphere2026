---
date: 2026-10-08T16:55:37+08:00
runner: amareetkm2024-del
scope: frontend/e2e
environment: local
run_type: regression
test_case_version: 031026
database: mocked
commit: cee0813
---

Full Playwright suite (`npx playwright test`, desktop Chrome and Pixel 7) on
Windows, with the `.field-control` alignment fix and its new layout test in
the working tree (on top of `main` at `cee0813`; `commit` names the last code
change before it). 176 passed, 138 skipped (existing `test.fixme`
placeholders), 0 failed.

Before this run, the new test was run with the CSS fix temporarily removed:
it failed on both viewports with a 11.9 px gap between the controls. With the
fix, it passed 10/10 (`--repeat-each=5`, both viewports). An earlier full run
failed the new test once on desktop (21 px), because it measured before the
dev server's CSS loaded. The test now waits for fonts and re-measures until
the layout settles. Run by Claude for Amareet.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Fields side by side keep their controls level when only one has a hint | PASS | /ui-kit at 1280px: the Expected attendance (hint) and Layout (no hint) controls start at the same y; also checked by hand on /support/availability, where Start and End are both at y = 460.6 |
| MULTIPLE | Full Playwright suite, desktop and mobile | PASS | 176 passed, 138 skipped, 0 failed |
