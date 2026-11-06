---
date: 2026-11-06T09:16:13+08:00
runner: xiangyingg
scope: full-regression
environment: local
run_type: automated
test_case_version: "051126"
database: none
commit: 1d6929a
pr: 437
---

# Documentation follow-up and submission packaging

Tested working diff is documentation-only on 1d6929a; application source remains
main 0773a721. The earlier clean-clone application results remain in
20261105-232435-xiangyingg-full-regression.md; they were not rerun here.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | Required tooling preparation | PASS | `python scripts/setup.py` completed in the documentation worktree. |
| MULTIPLE | Repository checks | PASS | `python scripts/check.py`: repository hygiene and 197 tooling tests passed. Secondary worktrees warned, retained intentionally. |
| MULTIPLE | Documentation guard | PASS | `python scripts/doc_guard.py`: zero errors, 174 existing metadata warnings. |
| MULTIPLE | Mermaid pack rendering | PASS | `python docs/design/render.py --output <submission-design-folder> --puppeteer-config <private-config>`: 13 SVG/PNG/PDF sets and 14 combined pages. Initial attempt refused a missing private Chromium config; created it from the installed browser path and reran successfully. No machine path committed. |
| MULTIPLE | Individual visual checks | PASS | All 13 PNGs and browser-rendered SVGs inspected; same diagram geometry is preserved in individual and combined PDFs. |
| MULTIPLE | Combined PDF checks | PASS | All 14 pages rasterized and visually inspected; extracted text bounds checked inside each page. |
| MULTIPLE | Main archive hygiene | PASS | `git archive --format=zip -o <submission-code-zip> origin/main`: 3,234 entries; no private .env, .git or node_modules. detect-secrets --no-verify scanned 3,043 files, zero findings; same two generated SBOM exclusions as repository hook. |

Read-only Jira refresh observed SCRUM-39/61/71 In Review, SCRUM-181 Done,
SCRUM-70/75 In Progress. This is not an acceptance test or a status transition.
Source review corrected a reset-required lockout claim against the actual
thirty-minute runtime expiry. Human story acceptance and instructor repository
access remain explicit confirmation items in the submission checklist.
