# Deploying and debugging with Vercel Git integration

Vercel Git integration is the only automatic deployment path. The Vercel
dashboard controls which Git branches deploy; the repository has no GitHub
Actions deployment workflow. Repository access is sufficient for application
checks, while Vercel dashboard access is needed to inspect deployment logs or
change deployment settings. See decision 0010.

## When deployments run

Vercel evaluates Git pushes using the repository's version-controlled
`ignoreCommand` defined in `vercel.json`:

```json
"ignoreCommand": "git rev-parse HEAD^ >/dev/null 2>&1 && git diff --quiet HEAD^ HEAD -- api backend frontend package.json package-lock.json vercel.json"
```

This command replaces the former workflow `paths-ignore` filter:

- Non-deployable changes (commits touching only `docs/**`, `.agents/**`, `scripts/**`,
  `tooling/**`, `.github/**`, or Markdown documentation) exit with code 0 and are
  canceled by Vercel ("Canceled by Ignored Build Step") to conserve Vercel Hobby
  quota (100 deployments per rolling 24 hours).
- Deployable changes (commits modifying `api/`, `backend/`, `frontend/`, `package.json`,
  `package-lock.json`, or `vercel.json`) exit with code 1 and proceed to build.
- Pushes to `main` produce production deployments.
- Pull request branches with deployable changes produce preview deployments.
  Previews are no longer posted as pull request comments by GitHub Actions; preview
  URLs and deployment statuses appear directly on the pull request's Vercel status check.

A deployment or preview status shown on the pull request is the source for that
commit's deployment result. The status is advisory and does not block merging.

## Debug a failed deployment

1. Open the matching Vercel deployment from the pull-request status or Vercel
   dashboard and inspect its build log. Use the commit SHA shown there to
   confirm it matches the PR head.
2. Check **application-checks** separately. It runs the application typecheck,
   database and unit suites, build, runtime checks, and browser checks when
   application files change. If that check fails, follow its failing step. If
   it passes while Vercel fails, use the Vercel build log to diagnose a
   deployment configuration, environment, function, or upload problem.
3. For an application failure, reproduce the command from the failed
   `application-checks` step locally. Start with:

   ```pwsh
   npm ci
   npm run typecheck
   npm run build
   ```

   These commands reproduce the typecheck and build locally, but not the full
   application suite, Vercel's environment, or deployment. The Vercel build
   log is the evidence for Vercel-specific build and upload failures.

If the log points to missing credentials or a Vercel project setting, ask a
maintainer with the required access to inspect it. Do not paste credential
values into an issue, pull request, or log.

## Repository-specific checks

- `scripts/check_api_routes.py` enforces the one-file-per-URL rule and the
  11-file headroom limit (ADR-014 and BDR T-56). It catches duplicate Vercel
  routes that may otherwise build but serve the wrong handler.
- The required `application-checks` result and Vercel's advisory deployment
  status have different purposes. A successful repository check is not an
  application deployment result.

See [decision 0010](decisions/0010-single-vercel-deploy-path.md) and the
Vercel dashboard for the deployment configuration.
