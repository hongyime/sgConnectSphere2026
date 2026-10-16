# SCRUM-161 / E05-S05 venue setup and turnaround verification and handoff

Repair PR #273's E05-S05 manual guide so it does not direct testers to an unverified deployment or claim unsupported UI steps; keep the follow-up explicitly documentation-only and do not reopen SCRUM-161.

## Verified implementation limits

- PR #261 was merged to `main` at `5c22e26`; migrations 0011 and 0016 add database support for setup/turnaround buffers and buffer conflict marking.
- `frontend/src/features/venue/VenueForm.tsx` has no setup-time or turnaround-time fields. The backend accepts the fields, but the guide cannot describe a browser interaction that does not exist.
- The database seed has a confirmed Orchid Hall booking on 6 October 2026, not the adjacent current bookings required by E05-S05 scenarios 2–5 and 7.
- The guide now identifies all seven manual cases as blocked/not run until UI controls and correct fixtures exist. Those are readiness statuses, not execution outcomes.

## Safety and scope

- Removed the deployed/preview option. The preview database's production status is unknown; the guide directs manual work only to a positively verified loopback disposable database.
- Documented the reset guard's behavior and its limit: a `dev`/`test` database name also passes the CLI check, so the operator must independently verify loopback. No reset, seed, database connection, or migration was run for this documentation correction.
- Removed the literal seed password and refer to `seedCredential` in `backend/src/database/cli.ts`.
- This handoff contains no machine-specific paths, credential values, or instructions to apply production migrations.

## Verification and next steps

1. `python scripts/check.py` passed on PR head `cba68a7`: repository hygiene passed, 140 tooling tests passed and 320 existing run records validated. The checker warned about existing secondary worktrees; none were removed.
2. The run is recorded in `docs/testing/runs/20261016-075211-bryanseah234-tooling.md` under T-65. This is repository-tooling evidence only, not E05-S05 manual execution evidence.
3. No E05-S05 case was executed. Commit and push only to `docs/SCRUM-161-venue-buffer-verification`, without force-push. Do not mark any E05-S05 case run or accepted, and do not change the Done status of SCRUM-161.

## Learnings

- An API/database field does not make a browser acceptance step executable; verify the actual screen and fixture state before writing click-through instructions.
- A reset guard that permits any database name containing `dev` or `test` is not, by itself, proof of a local target; documentation must require independent loopback verification.
