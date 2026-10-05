# feature/SCRUM-112-vercel-preview-cleanup

Goal: SCRUM-112 preview deploy cleanup workflow. Nightly GitHub Actions workflow
that deletes Vercel preview deployments older than 30 days, using the existing
`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` repo secrets. SCRUM-112 is
assigned to Bryan, In Sprint 3 (id 36), parent SCRUM-127, low-priority
housekeeping.

## Done

- `.github/workflows/vercel-preview-cleanup.yml`:
  - `schedule: cron: "0 17 * * *"` (01:00 Asia/Singapore, after the Jira
    sweep at 00:00) plus `workflow_dispatch` with a `dry_run` input.
  - Guards: skips the job entirely when any of the three secrets is unset
    (same shape as `jira-hygiene-sweep.yml`).
  - Pages `GET https://api.vercel.com/v6/deployments?projectId=...&teamId=...&target=preview&limit=100&until=<cutoff_ms>`,
    walks `pagination.next` to keep going.
  - Cutoff = `now - 30 days` in ms; only `preview` deployments in `READY`,
    `ERROR` or `CANCELED` are deleted (not `BUILDING`/`QUEUED`).
  - `DELETE https://api.vercel.com/v13/deployments/{uid}?teamId=...`,
    accepts 200/202/204 as success, warns on anything else.
  - Writes a `$GITHUB_STEP_SUMMARY` block (candidates, deleted, failed,
    dry_run). Fails the run if any delete returned non-2xx.
  - `concurrency: group: vercel-preview-cleanup, cancel-in-progress: false`
    so two manual kicks never overlap.
  - `permissions: contents: read` only; no `GITHUB_TOKEN` writes needed.
  - `timeout-minutes: 15`.

## Decisions without team sign-off

- Chose `/v6/deployments` for listing (that endpoint accepts `until` for
  pagination and `target=preview` as a filter) and `/v13/deployments/{uid}`
  for deletes, matching the open-source precedent
  (`ChatGPTNextWeb/NextChat/scripts/delete-deployment-preview.sh`) and
  `vercel.com/docs/rest-api`. If Vercel bumps to `/v7`+ in future, the GET
  shape is unchanged for the fields we use.
- Age window: hard-coded 30 days via `AGE_DAYS: "30"` env (matches the ticket
  wording). Easy to raise/lower by editing the env.
- Cron at 17:00 UTC (01:00 SGT) to avoid the Jira sweep's 16:00 UTC and the
  Supabase keepalive's 08:00 UTC windows.
- `READY`/`ERROR`/`CANCELED` previews are candidates; `BUILDING`/`QUEUED`
  are left alone to avoid racing active deploys. `production` deployments
  are never considered (the filter already excludes them, but the state
  guard is defence in depth).
- No "keep the preview for an open PR" guard: Vercel's current retention
  model keeps the latest preview per branch active even if its deployment
  record is deleted via the API, and the merge-queue timeout (30 min) plus
  typical PR age mean an open PR older than 30 days is already a bug worth
  flagging. If this bites in practice, add a `gh pr list --state open --json
  headRefName` loop that skips deployments whose `meta.githubCommitRef`
  matches an open PR.

## Not done / next

- No companion script/unit test (the step is bash + jq, exercised directly
  by the first scheduled run or `workflow_dispatch inputs.dry_run=true`).
  If this grows, lift the body into `scripts/vercel_preview_cleanup.py`
  with a pytest shim as `jira_hygiene_sweep.py` does.
- No decision record (process housekeeping, not an architecture change);
  SCRUM-112 Jira issue + this handoff are the trail.

## Commands

- `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/vercel-preview-cleanup.yml'))"` -- OK
- `python3 scripts/check.py` -- repository hygiene + 77 tooling tests pass.
- First real evidence will be the next scheduled run (or a manual
  `workflow_dispatch` with `dry_run=true`) after this PR merges.

## Verification

- YAML parses cleanly in Python.
- `check.py` passes on this commit.
- API shape verified against `vercel.com/docs/rest-api` and the NextChat
  open-source precedent (same endpoints, same auth header, same `teamId`
  query).
- Repo secrets (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`)
  already exist for `vercel-deploy.yml`; no new secret setup needed.
