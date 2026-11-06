---
date: 2026-11-06T22:32:10+08:00
runner: xiangyingg
scope: tooling
environment: local
run_type: automated
test_case_version: "061126"
database: none
commit: d447004
pr: 455
---

# Submission assembler XML validation repair

Working diff on d447004. Replace native ElementTree with the already-pinned
defusedxml parser. No new dependency, parser suppression, application rule,
acceptance scenario or generated submission binary is introduced.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Assembler regression tests | PASS | `python -m unittest discover -s tooling/tests -p test_assemble_submission.py -v`: four tests passed. Valid SVG/Office XML remain accepted; entity declarations in either are rejected as EntitiesForbidden without exposing contents; existing output/archive boundaries remain covered. |
| MULTIPLE | Repository hygiene and tooling | PASS | `python scripts/setup.py` completed; `python scripts/check.py` passed hygiene and 211 tooling tests. Existing secondary-worktree warnings remain. |
| MULTIPLE | Diff whitespace | PASS | `git diff --check` returned zero. |

The initial hosted doc guard failure maps tooling tests to product acceptance
case documentation. This follow-up uses its supported reasoned Docs-Impact
trailer, because the new tests cover assembly tooling rather than product
acceptance. The waiver is evaluated from committed messages, so the guard must
be checked after commit; no pre-commit guard success is claimed here. Existing
front-matter warnings are not new failures. No application suite, hosted/DB
operation, full submission assembly, visual artefact approval or secret-content
scan was performed during this CI repair.
