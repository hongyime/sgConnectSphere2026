# docs/demo-po-decisions-20261016

Record the Product Owner's explicit 16 October approvals in the canonical BDR,
document the bounded single-account demo procedure, and open a focused reviewed
documentation PR from current main. No production account or database write is
authorised or performed by this task.

## Scope

- Correct T-97 with the later PO confirmations and align the supporting BDR,
  account runbook and seed-profile documentation. No roster load or account write.
- Refresh the seed-profile list from `backend/src/database/cli.ts`; do not edit
  seed code, disclose the literal shared credential, or rewrite unrelated
  venue/event fixture sections.
- Regenerate only the dated BDR DOCX and record the cited repository check in
  one new T-65 session file. Do not edit stories, cases, ADR source, STATE/JOURNAL,
  application code or other workbook derivatives.

## Approved decisions to preserve

1. Existing accounts and the Safety Officer are DEMO ONLY. PO accepts the
   existing `seedCredential` public/shared credential risk, without selecting
   rotation or access restriction. This does not cover database/API/service/CI
    secrets. The seed already has Safety Officer and Coordinator Lead; only the
    one approved missing Safety Officer profile may be provisioned. No bulk
    seed/reset or other account creation.
2. E14-S03 and E03-S12 are selected Sprint 3 follow-ups, unestimated and not
    Done. T-97 records the confirmed edited-time display defect and E03-S12
    success-alert boundaries. E14-S02, E03-S07 and E03-S11 stay Done; T-74
    remains unchanged as historical context.
3. Bryan is accountable PO for the SCRUM-75 Venue Staff mapping follow-up.
   Deploy owner applies only an approved actual mapping with pre/post records;
   Ji Ning verifies delivery. PR #272 routing code is already merged and not
   blocked by future mapping. No assignments absent approval; T-89 no roster
    screen stands. SCRUM-195 tracks Bryan's accountable PO ownership; no
    roster assignment is approved by this decision.

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
- `python scripts/check.py` passed after correction: 146 repository-tooling
  tests, hygiene and secret checks passed, `.env.template` matched, and 358
  test-run records validated. It warned about existing secondary worktrees;
  none were removed. T-65 record: `docs/testing/runs/20261016-171252-bryanseah234-tooling.md`.
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

## Final scope reconciliation

- The parent verification corrected stale wording before publication: E14-S03
  will replace current raw UTC values; E03-S12 will replace a plain status
  paragraph while preserving its existing field-specific text and semantics.
- SCRUM-195 is the assigned roster follow-up; no volatile Jira status is
  embedded in the decision. The separate account operation is recorded in #295,
  and the new story definitions are reviewed in #296.
- Restored the archived scaffold seed document unchanged. The active
  `tests/seed/SEED_DATA.md` now documents both staff profiles already in code,
  using references rather than new credential literals. The local/CI seed
  inventory does not imply both accounts were provisioned in Supabase.
- The BDR export was regenerated after this reconciliation. Final publication
  uses normal commits and a fresh tooling record; no database write, seed,
  reset, password rotation or browser action is part of this documentation lane.
- Final candidate check: 146 tooling tests passed at HEAD `f4afe05` with these
  corrections present; 358 existing records validated. Evidence is
  `docs/testing/runs/20261016-174209-bryanseah234-tooling.md`. The archived seed
  reference is unchanged; only the active account reference is updated.

Do not self-approve or merge. Await teammate review on the final head; do not
reopen Done stories or load a roster without the separately approved mapping.
