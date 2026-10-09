# Handoff - docs/SCRUM-47-venue-bookings-contract

Goal: Draft and publish a shared venue_bookings schema/API/state contract for SCRUM-47 / E06-S03, coordinating E06-S05 migration 0013 enum additions with the follow-on migration 0014 constraints and exclusion rule.

## Done so far

- Read the required repository workflow, source-of-truth, Definition of Done, and instructor guidance.
- Read Ji Ning's comment 6077412411 on PR #231, the current E06-S03/S05 backlog, the base table migration, and PR #231's migration at its head.
- Confirmed PR #231's 0011 adds venue buffer columns and occupied_window(); it does not yet alter venue_bookings or its exclusion constraint.
- Preserved the pre-existing uncommitted .agents/STATE.md and .agents/JOURNAL.md changes in the original worktree. This branch is based on current origin/main in a separate worktree.
- Drafted docs/contracts/venue-bookings.md. Migration ownership, idempotency, and primary-release handling are explicit proposals for reviewer agreement.
- Updated the migration sequence after PR #246 added `tentative` and `expired` in migration 0013: the contract now keeps any constraint or index predicate using those values in migration 0014, after 0013 commits.
- Updated docs/api-changes-week7.md and docs/db_schema.md to match the shared contract, and added the contract to docs/source-of-truth.md.
- Updated the contract and schema sequence after PR #246 landed migration 0013; the remaining shared schema work is now proposed as migration 0014.
- Created the required PostPlan; its structural check passed and desktop/mobile Chromium screenshots were visually inspected.
- Opened draft PR #244 and posted the top-level PostPlan review comment. On commit 7feae31, repository-checks, pr-conventions, lfs-guard, trufflehog, dependency-review, and application-checks (skip) all passed.

## Next

Collect human review on the proposed migration owner/order, retry key, and primary-release behavior. Keep the PR in draft until the team agrees on the proposals; then update the contract and mark the PR ready. Do not merge without the protected review workflow.

## Commands and outcomes

- python scripts/agent_handoffs.py - listed existing in-flight task handoffs.
- gh api repos/hongyime/sgConnectSphere2026/issues/231/comments --jq '.[] | select(.id == 6077412411) | .body' - read Ji Ning's shared-contract request.
- gh pr view 231 and the GitHub contents API - read PR #231 metadata and its proposed 0011 migration.
- git fetch origin main; git worktree add -b docs/SCRUM-47-venue-bookings-contract ... origin/main - based the branch on current origin/main.
- python scripts/setup.py - installed local pinned tooling and hooks after the initial check reported missing tooling.
- python scripts/check_postplan_html.py artifacts/scrum-47-venue-bookings-contract.html - passed with one inline SVG.
- Playwright Chromium - visually inspected screenshots at 1365x900 and 390x844; three sections and one SVG rendered.
- python scripts/check.py - passed at HEAD 1086940: 87 tooling tests and repository hygiene. The tooling session record is in docs/testing/runs/.
- python scripts/check.py - passed at HEAD c88e5f2: 165 test-run records validated and 87 repository-tooling tests passed. The T-65 record is in docs/testing/runs; application checks were not run.
- git commit - created 7feae31 with the shared contract, synchronized API/schema views, handoff, and test evidence.
- git push - pushed docs/SCRUM-47-venue-bookings-contract.
- gh pr create and gh pr comment - opened draft PR #244 and posted the PostPlan URL.
- gh pr checks 244 - all six checks passed on commit 7feae31.
- Application tests, migrations, and database checks were not run; this is a documentation-only contract draft.

## Decisions for review

- Proposed owner for shared 0014_venue_bookings_contract.sql: E06-S05; migration 0013 from PR #246 adds the enum values and hold expiry column before any later constraint uses them. E06-S03 consumes the schema and owns the shared submission service/API, avoiding parallel migrations.
- Proposed Idempotency-Key for direct requests; hold conversion is idempotent by hold row id.
- O-30 does not specify a primary replacement after release; the draft requires explicit Coordinator reselection before safety confirmation.
