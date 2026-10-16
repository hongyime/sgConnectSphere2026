# T-72 seeded-role database evidence

Goal: satisfy the remaining PR #232 review request with an isolated real PostgreSQL reset, migration ledger check, seed load, and successful sign-ins for the seeded Coordinator Lead and Safety Officer accounts, without using Docker Desktop locally or writing to shared Supabase.

## Done so far

- GitHub Actions used its disposable PostgreSQL service container. No local Docker Desktop or shared Supabase database was used.
- On tested commit `39557a111a960aa64f145d1da5c073d8488039a3`, `npm run db:reset --workspace backend` and `npm run db:verify-t72-role-signins --workspace backend` passed in [Actions run 38526415605](https://github.com/hongyime/sgConnectSphere2026/actions/runs/38526415605), completed at `2026-10-14T15:15:38+08:00`.
- The run applied 14 migration files: `0001_connectsphere_schema.sql`, `0002_durable_notification_dispatch.sql`, `0002_event_visibility.sql`, `0002_users_email_case_insensitive.sql`, `0003_auth_sessions.sql`, `0004_attendee_visibility.sql`, `0005_event_request_fields.sql`, `0006_verification_tokens.sql`, `0007_password_reset_delivery.sql`, `0008_coordinator_assignment.sql`, `0009_keepalive_logs.sql`, `0010_audit_logs_immutable.sql`, `0012_user_role_enum_additions.sql`, and `0013_tentative_venue_holds.sql`.
- Seed output reported 2 organisations, 15 users, 5 venues, 2 equipment items, 10 events, 5 accessibility features, 5 facilities, 6 event threads, 8 registrations, 10 audit log entries, and 8 notifications. The verifier confirmed all 15 users.
- `coord_lead@connectsphere.com` signed in with role `event_coordinator_lead`, and `safety_officer@connectsphere.com` signed in with role `safety_officer`; an active session persisted for each.
- Immutable T-65 record [20261014-151538-bryanseah234-backend-db.md](../../docs/testing/runs/20261014-151538-bryanseah234-backend-db.md) is committed as `28d7c64`. It records `scope: backend/db`, `environment: ci`, `run_type: automated`, `database: real`, PR `232`, tested commit `39557a1`, and workbook version `131026`.
- The PR body contains the observed migration, seed, sign-in/session evidence and run link. The current PR head `28d7c64` has passing required checks; Xiang's changes-requested review still needs re-review and teammate approval is required before merge.
- `python scripts/check.py` passed locally on `28d7c64`: repository hygiene passed and all 128 repository-tooling tests passed. It warned that the repository has other secondary worktrees. The first invocation lacked the `python` launcher on `PATH`; rerunning with the repository's `.venv-tools/bin` on `PATH` passed.

## Not done / next step

- Confirm the required checks after this handoff refresh reach the PR branch.
- Keep PR #232 open until Xiang re-reviews and a teammate approves. The T-72 backend evidence verifies migration, seed, authentication, and persistence only; it does not claim completion of the E01-S13 workspaces.

## Commands and evidence

- `gh run view 38526415605 --json ...` — successful `application-checks` job on tested commit `39557a1`; reset/verifier step output independently confirmed the details above.
- `gh pr checks 232` — all reported checks passed on evidence-record commit `28d7c64`.
- `PATH="$PWD/.venv-tools/bin:$PATH" python scripts/check.py` — passed, 128/128 tooling tests; repository hygiene passed with the secondary-worktree warning.
- `gh api user --jq .login` — confirmed runner login `bryanseah234`.

## Learnings

- This repository already provisions disposable PostgreSQL in GitHub Actions. It supports migration, seed, login, and persisted-session evidence without local Docker Desktop or writes to the shared Supabase database.
- Do not infer a contiguous migration numbering scheme: this branch's exact migration directory has repeated `0002` filenames and no `0011` file; the verifier compares the actual file set with the applied ledger.
