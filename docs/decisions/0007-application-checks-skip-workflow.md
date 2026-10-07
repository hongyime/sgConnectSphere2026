# 0007 — Companion skip workflow for required-status-check path-filter gap

## Status

Accepted — landed with PR #118, which introduces
`.github/workflows/application-checks-skip.yml`.

## Context

`application-checks.yml` runs the backend integration tests, Playwright
end-to-end suite, and related application checks. It carries a `paths:` filter
so it only triggers when files under `api/`, `backend/`, `frontend/`, `tests/`,
or the root config files change. Branch protection on `main` requires the
`application-checks` status check to be present before a PR can merge.

GitHub's behaviour when a workflow has a `paths:` filter and a PR does not
touch any of those paths is to never report a status at all — not a pass, not a
fail, simply no status. Branch protection treats "no status" as unsatisfied for
a required check. The result is that any docs-only PR (or any PR touching only
files outside the filter list) is permanently blocked from merging with no
manual override available to non-administrators.

This gap was discovered when a documentation PR could not be merged despite
having no application-relevant changes. The `AGENTS.md` rule "no deployment
secrets without a recorded team decision" does not apply here (the companion
workflow carries no secrets), but the workflow does alter the effective
required-status-check contract for every PR, which is a structural CI decision
that warrants a record.

## Decision

Add a companion workflow, `.github/workflows/application-checks-skip.yml`,
that triggers on the exact complement of `application-checks.yml`'s `paths:`
list (expressed as `paths-ignore:`). The companion reports a job named
`application-checks` that succeeds immediately with a log message explaining
that no application-relevant files changed.

Together the two workflows cover every PR exactly once for the common case of a
PR that is either entirely within or entirely outside the application-paths
list. The job name is identical so GitHub's required-status-check rule is
satisfied by whichever workflow actually runs.

The `paths-ignore:` list in the companion must be kept identical to the `paths:`
list in `application-checks.yml`. If either list changes, both files must be
updated in the same PR. This is documented in a comment at the top of the
companion file.

Known caveat (inherent to the GitHub-documented pattern, not a defect here): a
PR that mixes an application path and a non-application path in the same diff
triggers both workflows for the same commit. Both will report a passing
`application-checks` status. This is harmless and does not occur in practice
when PRs are scoped to one logical change, which is already the repository
convention.

## Alternatives considered

- **Remove the `paths:` filter from `application-checks.yml`** so it runs on
  every PR regardless of what changed. Rejected: the integration and E2E suite
  takes several minutes; running it on every docs or tooling PR wastes CI
  minutes and slows the feedback loop for non-application changes.
- **Use a `workflow_run` trigger** to chain the companion off the primary
  workflow. Rejected: `workflow_run` fires after the triggering workflow
  completes, which means the status arrives late and does not satisfy the
  required-check gate in time for the merge button to become active.
- **Mark the check as non-required for docs-only PRs** via a branch-protection
  bypass rule. Rejected: GitHub's bypass rules operate on actors (users or
  teams), not on PR content. There is no content-aware bypass that would apply
  only to docs PRs.
- **Do nothing and ask an administrator to merge docs PRs manually.** Rejected:
  it creates a bottleneck on a single administrator account and defeats the
  purpose of the branch-protection automation.

## Consequences

- Docs-only PRs, tooling-only PRs, and any PR touching only files outside the
  application-paths list can now merge without administrator intervention.
- The required-status-check contract is now satisfied by two workflows acting
  as a complementary pair. Any future change to the `paths:` filter in
  `application-checks.yml` must be mirrored in the companion's `paths-ignore:`
  list in the same PR; failing to do so will either re-open the blocking gap or
  cause both workflows to run on every PR.
- No secrets are introduced. The companion workflow requires only
  `permissions: contents: read`.

## Reversibility

Deleting `.github/workflows/application-checks-skip.yml` re-opens the
blocking gap for docs-only PRs. The primary `application-checks.yml` is
unaffected. No other files need to change.

## References

- `.github/workflows/application-checks-skip.yml` — the companion workflow.
- `.github/workflows/application-checks.yml` — the primary workflow whose
  `paths:` list the companion mirrors.
- GitHub documentation: "Skipping workflow runs" — the documented pattern this
  implements.
- PR #118 — the PR that introduced the companion workflow.
