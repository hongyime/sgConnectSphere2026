# PR #411 workflow check recovery

Fix the doc-sync and Vercel failures on Dependabot PR #411 without exposing deployment secrets or weakening application checks.

## Changes

- Vercel skips Dependabot PR previews because their runs have no Actions deployment secrets. Main pushes and ready human PR previews retain their existing behavior.
- Updated decision 0010 with the deployment restriction and setup-python 7.1.0 pin update; this satisfies the doc map's infrastructure rule.
- No new dependencies, secrets, privileged triggers or application changes.

## Verification and next step

Local repository checks, doc guard and five deployment-condition cases passed on `6896564` plus these working-tree changes. T-65 record: `docs/testing/runs/20261104-182414-xiangyingg-tooling.md`.
Push to the existing PR branch and inspect the new CI runs. Do not merge as part of this recovery.
