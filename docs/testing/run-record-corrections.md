# Run record corrections

T-65 records in [`runs/`](runs/README.md) are never edited after they are
committed, so execution history stays visible. When an audit finds a record
whose metadata or evidence is wrong, the correction is listed here instead.
`scripts/export_test_submission_xlsx.py` reads this table and shows the
correction next to every row of that record in the workbook's Execution Log.

Audit of all 947 records on `main` at `0773a72` (6 November 2026, Release 1
test-case submission):

- Every `commit` is 7 hexadecimal characters. 203 of the 501 distinct SHAs are
  not in a fresh clone of `main`, because they are commits of squash-merged
  branches deleted after merge; sampled SHAs (`e297065`, `30a5a66`, `42b635d`)
  still resolve on GitHub. These are not errors.
- No record marks PASS for a case that had no test able to produce it: every
  PASS row for a case that lacked a live automated test is a manual run, or an
  automated real-stack run, with the observed result in `Remarks`.
- 70 records omit `database`; all predate the field becoming required.

| Record | Problem | Correction |
| --- | --- | --- |
| `20261002-162151-bryanseah234-frontend-e2e.md` | Filename time 16:21:51 differs from the frontmatter date 16:19:00 | The frontmatter `date` is the execution time |
| `20261002-162151-bryanseah234-frontend-vitest.md` | Filename time 16:21:51 differs from the frontmatter date 16:04:00 | The frontmatter `date` is the execution time |
| `20261016-162300-jininggg-frontend-e2e.md` | Filename time 16:23:00 differs from the frontmatter date 17:17:48 | The frontmatter `date` is the execution time |
| `20261016-221852-jininggg-frontend-e2e.md` | Filename time 22:18:52 differs from the frontmatter date 22:20:13 | The frontmatter `date` is the execution time |
| `20261017-000020-jininggg-frontend-e2e.md` | Filename time 00:00:20 differs from the frontmatter date 00:10:38 | The frontmatter `date` is the execution time |
| `20261017-010257-jininggg-frontend-e2e.md` | Filename time 01:02:57 differs from the frontmatter date 01:07:53 | The frontmatter `date` is the execution time |
| `20261018-122117-bryanseah234-backend-unit.md` | Filename time is UTC (12:21:17); the README requires Singapore time | Executed 2026-10-18 20:21:17 SGT, as the frontmatter says |
| `20261018-122206-bryanseah234-backend-unit.md` | Filename time is UTC (12:22:06) | Executed 2026-10-18 20:22:06 SGT, as the frontmatter says |
| `20261018-122245-bryanseah234-tooling.md` | Filename time is UTC (12:22:45) | Executed 2026-10-18 20:22:45 SGT, as the frontmatter says |
| `20261018-122605-bryanseah234-backend-unit.md` | Filename time is UTC (12:26:05) | Executed 2026-10-18 20:26:05 SGT, as the frontmatter says |
| `20261018-122906-bryanseah234-backend-unit.md` | Filename time is UTC (12:29:06) | Executed 2026-10-18 20:29:06 SGT, as the frontmatter says |
| `20261018-122935-bryanseah234-tooling.md` | Filename time is UTC (12:29:35) | Executed 2026-10-18 20:29:35 SGT, as the frontmatter says |
| `20261018-123027-bryanseah234-backend-unit.md` | Filename time is UTC (12:30:27) | Executed 2026-10-18 20:30:27 SGT, as the frontmatter says |
| `20261018-123111-bryanseah234-tooling.md` | Filename time is UTC (12:31:11) | Executed 2026-10-18 20:31:11 SGT, as the frontmatter says |
| `20261018-123428-bryanseah234-tooling.md` | Filename time is UTC (12:34:28) | Executed 2026-10-18 20:34:28 SGT, as the frontmatter says |
| `20261006-003121-xiangyingg-ci-regression.md` | Filename scope `ci-regression` is not in the scope enum | Scope is `frontend/e2e`, as the frontmatter says |
| `20261006-003923-xiangyingg-ci-regression.md` | Filename scope `ci-regression` is not in the scope enum | Scope is `full-regression`, as the frontmatter says |
| `20261016-020537-Bl0oper-backend-db.md` | Manual record after the T-93 cutoff with no hand-taken screenshots | Outcome kept as recorded but unevidenced; later automated runs of the same cases supersede it |
| `20261016-031733-Bl0oper-frontend-e2e.md` | Manual record after the T-93 cutoff with no hand-taken screenshots | Outcome kept as recorded but unevidenced; later automated runs of the same cases supersede it |
| `20261106-081051-Bl0oper-frontend-e2e.md` | `environment: local` for both runs, which targeted the deployed site | `local` is where the runner ran (Bl0oper's laptop), as the enum has only `local` and `ci`; both runs targeted https://sgconnectsphere.vercel.app serving `1e286f7`, as `Remarks` says |
| `20261106-081051-Bl0oper-frontend-e2e.md` | Calls the deployed demo sign-ins "read-only", and `database: mocked` covers the sign-in run too | The sign-ins used the real production database and were not read-only: each reset the account's failed-login count (already 0) and created a session row, which its sign-out removed. Nothing else was written |
