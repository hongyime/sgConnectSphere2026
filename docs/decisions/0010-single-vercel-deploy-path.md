# 0010 - Actions is the single Vercel deploy path

## Status

Accepted - landed with the PR that adds `git.deploymentEnabled: false` to
`vercel.json`. Closes SCRUM-111.

## Context

The project deploys to a Vercel Hobby (free) plan, which allows 100
deployments per rolling 24-hour window. The team hit that ceiling repeatedly
during Sprint 2 and lost a full day each time:

```
Resource is limited - try again in 24 hours
(more than 100, code: "api-deployments-free-per-day").
```

Two independent systems were deploying the same commits:

1. **Vercel's own git integration.** Connected when the project was created.
   It deploys every push to every branch, including pull-request branches.
2. **`.github/workflows/vercel-deploy.yml`.** Added later to mirror the same
   build and deploy inside GitHub Actions, where the whole team can read the
   deploy log without a paid Vercel dashboard seat. The header comment on that
   workflow said, from the day it landed, that it "runs twice per event on
   purpose during the trial period" and that the git integration should be
   disabled "once this workflow proves reliable".

A 24-hour sample taken from the Vercel REST API on 2026-09-30 confirms the
duplication and shows which side is the larger consumer:

| Deploy source | Deployments in 24h |
| --- | --- |
| `git` (Vercel git integration) | 12 |
| `cli` (`vercel deploy` from Actions) | 7 |
| **Total** | **19** |

The git integration produced more deployments than the Actions workflow
because the Actions workflow carries a `concurrency` group with
`cancel-in-progress: true`, while the git integration does not, and because
`update-pr-branches.yml` merges `main` into every open PR branch on a schedule,
producing a push - and therefore a git-integration deployment - on each one.

Two facts make the Actions workflow the better survivor:

- It posts its own preview-URL comment on the pull request, so nothing is lost
  from the reviewer's point of view.
- It surfaces deploy-time failures (missing environment variables,
  function-count limits, output-directory mismatches) in the Actions log,
  which is readable by every collaborator. The Vercel dashboard is not.

## Decision

Make GitHub Actions the only system that creates deployments.

1. Set `"git": { "deploymentEnabled": false }` in `vercel.json`. This is the
   documented, repository-versioned way to stop Vercel's git integration from
   deploying while keeping the integration connected, which preserves
   repository metadata and commit status linkage.
2. Add a `paths-ignore` list to both triggers in `vercel-deploy.yml` covering
   `docs/**`, `.agents/**`, `scripts/**`, `tooling/**` and `**/*.md`. Nothing
   under those paths is served by a deployment, so a documentation or
   repository-tooling commit no longer spends a deployment.

`vercel-deploy` is deliberately **not** in the required status checks for
`main` (the required set is `repository-checks`, `pr-conventions`, `lfs-guard`
and `application-checks`). A `paths-ignore` filter on a *required* check
produces the "no status reported" merge block described in
`docs/decisions/0007-application-checks-skip-workflow.md`, which is why that
workflow needed a companion skip job. This one does not, and must not be added
to the required set without also adding a companion.

Expected effect, using the measured 24-hour sample as the baseline: 19
deployments become approximately 5. The git-integration half is removed
entirely, and the remaining Actions half is skipped for documentation-only and
tooling-only changes, which are a large share of this repository's pull
requests.

## Alternatives considered

- **Disable the git integration from the Vercel dashboard only.** Rejected as
  the primary mechanism: the setting lives outside the repository, is invisible
  in review, and is silently lost if the project is re-linked. Doing it in
  `vercel.json` keeps the decision in version control. Flipping the dashboard
  toggle as well is harmless and remains available as belt-and-braces.
- **Set the project's "Ignored Build Step" command instead.** Rejected: a
  skipped build still creates a deployment record, so it saves build minutes
  but does not reliably reduce the count the quota measures.
- **Delete the `vercel-deploy.yml` workflow and keep only the git
  integration.** Rejected: it would halve deployments equally, but the team
  would lose the readable Actions deploy log, which is the reason the workflow
  was written.
- **Unlink the GitHub repository from the Vercel project.** Rejected: it stops
  git deployments but also discards pull-request metadata and commit status
  linkage, and is a heavier, less reversible change than a config key.
- **Deploy only on push to `main` and drop preview deployments entirely.**
  Not chosen now. It is the next lever if the quota is still tight, and is
  recorded as the follow-up on SCRUM-112. Evidence so far is that reviewers
  verify against a local API and a seeded database rather than the preview URL,
  so the cost of dropping previews may be low - but the measured reduction
  above is expected to be sufficient without it.
- **Upgrade to Vercel Pro.** Rejected: `AGENTS.md` forbids adding paid
  services without a recorded team decision, and the free-tier ceiling is
  reachable with configuration alone.

## Consequences

- Each push now produces exactly one deployment. The duplicate-deploy trial
  described in `vercel-deploy.yml` is over, and its header comment is updated
  to say so.
- Documentation-only and tooling-only pull requests no longer produce a Vercel
  deployment and will show `vercel-deploy` as skipped. This does not block a
  merge, because the check is not required.
- `vercel.json` must contain the `git` key for the setting to apply. The key
  takes effect for a branch once that branch contains it, so open pull-request
  branches stop producing git-integration deployments after they next take
  `main`, which `update-pr-branches.yml` does automatically.
- If `vercel-deploy` is ever promoted to a required check, a companion skip
  workflow must be added in the same pull request, mirroring the
  `paths-ignore` list.

## Reversibility

Remove the `git` key from `vercel.json` to restore Vercel's git-integration
deployments; remove the two `paths-ignore` blocks from `vercel-deploy.yml` to
restore deployments on documentation commits. Both are single-file edits with
no data migration and no effect on existing deployments or domains.

## References

- `vercel.json` - carries `git.deploymentEnabled`.
- `.github/workflows/vercel-deploy.yml` - the surviving deploy path.
- `docs/decisions/0007-application-checks-skip-workflow.md` - why a
  `paths-ignore` filter on a required check needs a companion job.
- Vercel documentation: "Git Configuration" - `git.deploymentEnabled`.
- SCRUM-111 - decommission Vercel's own git integration once the
  Actions-based deploy is stable.
- SCRUM-112 - preview deploy cleanup, the follow-up lever.
