# Deploying and debugging without Vercel access

Only one teammate has Vercel dashboard access (paid-tier seats cost
per user, and the free tier limits collaborators). This document is
how everyone else can still see, reproduce, and debug a red Vercel
deploy status.

## What Vercel does after every push and PR

Vercel builds automatically on:

- Every push to `main` (production deployment).
- Every push to any branch that has an open PR (preview deployment).

The result surfaces in GitHub as a `Vercel` status check on the commit
and a bot comment on the PR with a preview URL. A red `Vercel` status
means the build or the deploy failed; a green status means the preview
URL is live.

Vercel logs are private to the Vercel dashboard. The build command
itself (`npm run build --workspace frontend`) is the same one the local
repo and GitHub Actions run, but Vercel adds its own environment (env
vars from the dashboard, function output validation, edge config).

## How teammates without Vercel access can debug

### Step 1: check the mirror workflow

`application-checks.yml` runs on every pull request and on every push to
`main`. It runs `npm ci`, `npm run typecheck`, `npm run build`, then all
runtime and Playwright test suites, in the same order and with the same
Node version Vercel uses (Node 22).

If the mirror workflow is **red**, the failure is reproducible outside
Vercel. Read the GitHub Actions log to find the failing command and
error text. This is where the fix belongs.

If the mirror workflow is **green** but `Vercel` is **red**, the failure
is Vercel-specific:

- **Missing or wrong environment variable in the Vercel project.**
- More than 12 serverless functions (Hobby-plan limit; a rewrite in
  `vercel.json` collapses functions).
- **Silent route collision between `api/foo.ts` and `api/foo/index.ts`**
  (both build, one silently wins; caught by
  `scripts/check_api_routes.py` per ADR-014 and BDR T-56).
- Output directory or framework preset mis-configured.
- Deploy-time function validation error.

### Step 2: paste the Vercel error into the PR or commit

When only Bryan can see the Vercel log, the fastest fix is for him to
copy the failing block from the Vercel dashboard and paste it into a
top-level comment on the PR (or the failing commit). Use a fenced code
block so the teammate reading it can grep for the message.

Template for the comment:

```md
**Vercel deploy log &mdash; run [ID from URL]**

```text
[paste the failing lines here, redacted for secrets]
```

Reproduces locally with: `[npm command that triggered it]`
```

### Step 3: reproduce locally

Anyone can reproduce the same Vercel build locally without a Vercel
account:

```pwsh
# From repo root
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm ci
npm run build
```

If this succeeds and Vercel still fails, the difference is environment.
The `vercel.json` rewrites and cron config live in the repo and can be
inspected without Vercel access; env vars must be requested from Bryan.

### Step 4: install the Vercel CLI as read-only

Any teammate can install the Vercel CLI globally and run:

```pwsh
npm install -g vercel
vercel build
```

The CLI reproduces Vercel's build environment locally without needing
dashboard access. It still requires a Vercel account (free) to log in,
but does not consume a paid seat on Bryan's team. The resulting
`.vercel/output/` directory is exactly what Vercel would upload.

## Free-tier constraints that surface as deploy failures

- **12-function cap on the Hobby plan.** Every file under `api/`
  becomes one serverless function. `vercel.json` collapses multi-verb
  routes via `rewrites` so several logical endpoints share one function.
  Adding a new file under `api/` risks pushing us past the cap. See
  ADR-014 for the one-file-per-URL rule and BDR T-56 for the 11-file
  soft limit enforced by `scripts/check_api_routes.py`.
- **Silent route collision.** Vercel builds both `api/foo.ts` and
  `api/foo/index.ts` and maps them to the same URL `/api/foo`; one
  wins the route and the other is a dead lambda that still counts
  against the 12-function cap. This is how the E01-S03 (SCRUM-18) organiser
  browse-events endpoint silently broke after PR #56 shipped. Enforced
  against by the same pre-commit hook. Postplan documenting the
  discovery: <https://4ovp804r75sa.postplan.dev>.
- **100MB compiled output for edge and serverless functions.** Not hit
  yet, but `package-lock.json` size is worth watching.
- **1 concurrent build.** Rapid push bursts queue rather than fail;
  distinguish "queued" from "failed" by checking the run status.
- **1 hour build timeout.** Not hit; typical build is under 60 seconds.

## When to escalate to Vercel-account changes

- Persistent red status on `main` after a green mirror workflow means
  Vercel needs configuration work only Bryan can do.
- Missing preview URLs on PRs mean the GitHub-Vercel integration
  disconnected; reconnect from the Vercel dashboard.
- Deploy protection blocking teammates from viewing preview URLs is a
  Vercel project setting; disable "Deploy Protection" for public
  preview readability if the project has no secrets in the frontend
  bundle.

## What this project has already done

- Consolidated `/api/auth/verify` into `/api/auth/session?task=verify`
  via `vercel.json` rewrite in PR #71, freeing a function slot.
- Kept `/api/cron/*` as a single file that dispatches on a task query
  parameter.
- All env vars for Supabase and Brevo are set on the Vercel project;
  the values live only there and in `.env` on Bryan's machine. The
  repo carries a placeholder-only `.env.template`.

## What Sprint 2 should add

- Enable Vercel's "Public Deploy Logs" per-project setting when it
  becomes available on Hobby. Today it is Pro-only, so this remains an
  aspiration.
- Consider moving to the GitHub-native Actions deploy pattern using
  `vercel deploy --prebuilt --prod --token=$VERCEL_TOKEN` in a
  workflow. That surfaces the full Vercel deploy log inside Actions,
  which every teammate can read. Requires a `VERCEL_TOKEN` secret and
  a decision on who owns rotation.
