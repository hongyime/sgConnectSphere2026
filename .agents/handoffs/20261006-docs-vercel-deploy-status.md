# docs/vercel-deploy-status

Update the deployment guide to describe the current Actions-only Vercel deployment flow and how contributors find and diagnose its logs, following the pending documentation follow-up in the Sprint 2 retrospective handoff.

## Done so far

- Confirmed `.github/workflows/vercel-deploy.yml` is the only deployment path and posts preview URLs through GitHub Actions.
- Confirmed `vercel-deploy` is not a required merge check; `application-checks` is a separate application verification workflow.
- Rewrote `docs/deploying-and-debugging.md` to match the current Actions-only deployment flow, path filters, draft behavior, preview comments, and separate application checks.
- Removed outdated claims about private deploy logs and the retired `Vercel` status check.
- After setup installed clone-local tooling, `python scripts/check.py` passed on `1c1be82` with 77 tooling tests and repository hygiene. A T-65 execution record is included under `docs/testing/runs/`.
- Reviewed and committed the guide, handoff, and T-65 record as one focused change.
- Opened draft PR #220; initial required checks passed on head `2abb504`.
- Added a CI-scoped T-65 record for the passing repository-checks run on that head.

## Not done / next step

- Verify checks on the latest PR head; update the PR verification checklist and mark the PR ready when required checks pass.
- Await teammate review and approval before any merge.

## Source

- `.agents/handoffs/20261003-ci-sprint-2-retro-pr-evidence.md`
- `docs/decisions/0010-single-vercel-deploy-path.md`

## Learnings

- The Actions deployment run includes the Vercel CLI pull, build, and deploy logs; contributors can inspect these without a dashboard seat.
