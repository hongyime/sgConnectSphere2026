# docs/demo-po-decisions-20261016

Record the Product Owner's explicit 16 October approvals in the canonical BDR,
document the bounded single-account demo procedure, and open a focused reviewed
documentation PR from current main. No production account or database write is
authorised or performed by this task.

## Scope

- Add T-97 after confirming T-93 through T-96 are already allocated on
  `origin/main` at `8599ad2`; open PR #292's changes are kept separate.
- Update the current BDR overview/reference ranges and 16 October change log,
  add the Safety Officer-only runbook, regenerate the BDR DOCX, and update the
  BDR export pointer. Do not edit stories, test cases, ADR source, STATE/JOURNAL,
  application code, seed helpers or other workbook derivatives.
- Record T-65 evidence for the repository check only. Do not claim application
  testing, story delivery, database operation, security safety or real-data
  approval.

## Approved decisions to preserve

1. Existing accounts and the Safety Officer are DEMO ONLY. PO accepts the
   existing `seedCredential` public/shared credential risk, without selecting
   rotation or access restriction. This does not cover database/API/service/CI
   secrets. The seed already has Safety Officer and Coordinator Lead; only a
   single pre-existing Safety Officer profile may be provisioned if a reviewed
   read-only precheck proves it missing. No bulk seed/reset or extra accounts.
2. PO approves E14-S03 and E03-S12 for Sprint 3 follow-up. Existing E14-S02,
   E03-S07 and E03-S11 stay Done. T-97 supersedes T-74's historical reopening
   exception using current CONTRIBUTING and instructor guidance. Do not invent
   criteria, estimates, sprint dates, delivery or a confirmed E14 defect.
3. Bryan is accountable PO for the SCRUM-75 Venue Staff mapping follow-up.
   Deploy owner applies only an approved actual mapping with pre/post records;
   Ji Ning verifies delivery. PR #272 routing code is already merged and not
   blocked by future mapping. No assignments absent approval; T-89 no roster
   screen stands. Link the separately created Jira subtask only when its key is
   reported.

## Verification and next steps

- Branch `docs/demo-po-decisions-20261016` starts at current `origin/main`
  `8599ad2`. T-93 through T-96 were confirmed reserved on that main. Open PRs
  #283 and #292 were inspected; neither changes `B-team-decisions.md`.
- PR #272 is confirmed merged (2026-10-16). The main seed in
  `backend/src/database/cli.ts` already defines `safetyOfficer` and `coordLead`;
  no seed change or provisioning operation was made.
- Regenerated only `docs/BACKLOG DECISION REVIEW CAA 161026.docx` using the
  repository export module. Read-back with python-docx confirmed T-97 and the
  runbook reference in the generated BDR. ADR, backlog and testcase exports were
  not regenerated.
- `python scripts/check.py` passed: 146 repository-tooling tests, hygiene and
  secret checks passed, `.env.template` matched, and 357 test-run records
  validated after adding `docs/testing/runs/20261016-154423-bryanseah234-tooling.md`.
  The check warned about existing secondary worktrees; none were removed.
- No application test/build, production account/database operation, deployment,
  or PostPlan HTML/browser work was performed. Markdown LSP diagnostics are not
  available in this environment.

## Publication status

- Five focused conventional commits were pushed normally:
  `79f353a` handoff, `9822f95` runbook, `d5f31be` canonical BDR,
  `922be65` BDR export/pointer, and `f748c61` T-65 run record.
- PR #293: https://github.com/hongyime/sgConnectSphere2026/pull/293
  (`docs(bdr): record 16 October Product Owner approvals`), based on
  `origin/main` `8599ad2`.
- On head `f748c61`, GitHub checks `repository-checks`, `pr-conventions`,
  `application-checks` (skip, docs-only), `dependency-review`, `lfs-guard`,
  and `trufflehog` passed. Human review is requested from team collaborators;
  PR remains open and unmerged.
- No production account/database operation, application test/build, deployment,
  or PostPlan HTML/browser task was performed. The coordinating lane owns the
  later PostPlan upload. Existing secondary worktrees and the untracked local
  `.omo/` and `.playwright-mcp/` folders were left untouched.

Do not self-approve or merge. Wait for teammate review, then address findings
without changing the stated scope. Link the SCRUM-75 roster subtask only after
its separate lane supplies the actual Jira key.
