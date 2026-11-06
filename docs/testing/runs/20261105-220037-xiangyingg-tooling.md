---
date: 2026-11-05T22:00:37+08:00
runner: xiangyingg
scope: tooling
environment: local
run_type: automated
test_case_version: "051126"
database: none
commit: 62e8208
---

Evidence-only working diff on main `62e8208`. These checks validate records and
repository tooling, not application behavior.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Repository hygiene and tooling | PASS | `python scripts/check.py`: 197 tooling tests passed, 942 run records validated, hooks passed. Existing secondary-worktree warnings. Initial invocation lacked the tooling environment; rerun passed after linking existing tooling. |
| MULTIPLE | Review HTML structure | PASS | `python scripts/check_postplan_html.py artifacts/scrum-180-tc05-retake.html`: passed, one inline SVG. Local browser render visually inspected; readable and no clipping. |
| MULTIPLE | Original screenshot integrity | PASS | Four copied originals matched SHA-256 bytes and were each below 1000 KB. Images inspected in the human submissions; no credentials or real personal data displayed. |

Initial `python scripts/doc_guard.py` reported the generic handoff-to-test-catalogue
mapping. The evidence changes no test definitions; the commit will use the
supported `Docs-Impact: none` trailer. Final guard outcome is reported separately
in the PR after that commit, not assumed here. No application suite rerun.
