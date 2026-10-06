# Deploying and debugging without Vercel dashboard access

GitHub Actions is the only deployment path. The `.github/workflows/vercel-deploy.yml`
workflow uses the Vercel CLI to build and deploy from Actions; `vercel.json`
disables Vercel's own Git deployment integration (decision 0010). Anyone with
repository access can inspect the build and deploy logs in the Actions run.
Vercel dashboard access is needed only for account-level settings or credentials.

## When deployments run

The **Vercel Deploy** workflow runs:

- On pushes to `main` that include deployable files. These create production
  deployments.
- On opened, reopened, synchronized, or review-ready pull requests that include
  deployable files. These create preview deployments. Draft PRs do not deploy;
  the first preview runs when the PR is marked ready for review.

Changes limited to `docs/**`, `.agents/**`, `scripts/**`, `tooling/**`, or
Markdown files are filtered out. A PR that also changes deployable files still
runs the workflow.

A successful PR deployment posts or updates a **Vercel preview** comment with
the URL. The Actions run summary also contains the URL. For a failed or missing
deployment, check the run for the PR's current commit under **Checks**, or open
**Actions / Vercel Deploy** and select the matching run for that commit. The job
is named `vercel-deploy`. This check is not required for merging, so a failure
does not itself block the PR.

## Debug a failed deployment

1. Open the matching **Vercel Deploy** run and inspect the first failed step.
   The `Pull Vercel environment`, `Build with Vercel`, and `Deploy prebuilt
   artifact to Vercel` logs include the error output. Use the commit SHA shown
   in the run to confirm it matches the PR head.
2. Check **application-checks** separately. It runs the application typecheck,
   database and unit suites, build, runtime checks, and browser checks when
   application files change. If that check fails, follow its failing step. If
   it passes while `vercel-deploy` fails, use the Vercel CLI log to diagnose a
   deployment configuration, environment, function, or upload problem.
3. For an application failure, reproduce the command from the failed
   `application-checks` step locally. Start with:

   ```pwsh
   npm ci
   npm run typecheck
   npm run build
   ```

   These commands reproduce the typecheck and build locally, but not the full
   application suite, Vercel's environment, or deployment. The `vercel-deploy` run is
   the evidence for Vercel-specific build and upload failures.

If the log points to missing credentials or a Vercel project setting, ask a
maintainer with the required access to inspect it. Do not paste credential
values into an issue, pull request, or log.

## Repository-specific checks

- `scripts/check_api_routes.py` enforces the one-file-per-URL rule and the
  11-file headroom limit (ADR-014 and BDR T-56). It catches duplicate Vercel
  routes that may otherwise build but serve the wrong handler.
- The required `application-checks` result and the non-required
  `vercel-deploy` result have different purposes. A successful repository
  check is not an application build or deployment result.
- If every changed path is filtered above, no deployment is created.
  Preview URLs from an earlier commit may therefore be stale for that PR.

See [decision 0010](decisions/0010-single-vercel-deploy-path.md) and the
[deployment workflow](../.github/workflows/vercel-deploy.yml) for the
source-of-truth configuration.
