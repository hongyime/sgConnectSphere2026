# SCRUM-39 E04-S02 — multi-session Events

Implement the merged E04-S02 requirements for Jira SCRUM-39: create one or more child Sessions with independent dates and requirements, assess and book venues per Session, and safely delete a Session while releasing its confirmed booking and retaining notification and activity history. Keep registration and lifecycle Event-level, preserve existing Event data through a forward-only migration, and do not change Sprint 3 assignments or acceptance criteria.

## Status

- Started in a dedicated worktree on feature/SCRUM-183-event-session-foundation; the implementation and verification commits are rebased on current origin/main at c0797ec.
- Jira SCRUM-39 was read-only verified on 14 October 2026: Story, To Do, assigned to the repository owner, 5 points, no sprint assignment; its description mirrors canonical Markdown after PRs #253–#255.
- Created and verified Jira Subtask SCRUM-183, `Backend: persist Event Sessions and backfill existing Events`, under SCRUM-39. It is To Do, assigned to the repository owner, with no sprint or estimate. Its description explicitly states that it is a partial increment and the parent must remain open.
- At task start there was no Event Session model or migration; existing sessions code was authentication-session handling only. This slice adds persisted Session records and migration, without building the Session UI or workflows.
- The customer decisions and architecture are already merged. This branch implements only E04-S02; registration selection/capacity and Session-linked equipment request workflows remain separate story work.

## Implementation

- Added migration `0014_event_sessions.sql`: create child Sessions with finite date ranges and per-session requirements; copy existing Event details and accessibility/facility selections; backfill venue/equipment records to their Session; retain Event-level registration, attendance and technical-support records; preserve single-session writes and edits; require explicit Session selection for dependent inserts once an Event has multiple Sessions.
- Added a PostgreSQL integration acceptance test for migration/backfill, legacy data retention, single-session compatibility, and explicit Session selection. Registered it in `backend`'s `test:db` script and a PostgreSQL 17 CI step.
- Regenerated `docs/testing/tc-coverage.md`; E04-S02 cases 01 and 02 now point to the new acceptance test. Cases 03–05 remain unimplemented in this partial increment.
- T-65 execution records cover pre- and post-rebase backend runs, skipped local migration acceptance, and the Windows tooling-check failure; unit records state they do not exercise this migration.

## Decisions / boundaries

- Treat `docs/backlog/release-1/E04-programme-sessions.md`, `docs/testing/cases/E04.md`, `docs/bdr/`, `docs/adr/ADR-018-restoring-sessions-as-first-class-event-entities.md`, `docs/db_schema.md`, and shared venue-booking contracts on `main` as authoritative.
- Backfill one Session per existing Event without dropping or rewriting existing Event-level planning, lifecycle, registration, or technical-support data.
- Preserve unresolved O-50 and O-51 as assumptions; they are outside this story.
- Do not commit `.agents/STATE.md` or `.agents/JOURNAL.md`.

## Next steps

1. Push the SCRUM-183 branch and open a draft PR with the four required sections and accurate verification limits.
2. Once branch/PR evidence is live, reconcile SCRUM-183 to In Review; keep parent SCRUM-39 open.
3. Use CI's PostgreSQL 17 acceptance step to validate the migration; local PostgreSQL/Docker is unavailable here.
4. Merge only after required checks, teammate approval, and the protected merge queue. Then mark SCRUM-183 Done; do not close SCRUM-39 because this PR is partial.

## Commands and outcomes

- `python scripts/agent_handoffs.py` — completed before implementation; this handoff was not yet present at that point.
- Jira `SCRUM-39` and `SCRUM-183` — read-only checks confirmed the parent and child details above.
- Before rebase, `npm run build --workspace backend`, `npm test --workspace backend` (358 tests), the integration-test transpile check, the coverage generator, and `python scripts/check.py` (87 tooling tests) passed; corresponding T-65 records are included where evidence was cited.
- Rebase onto c0797ec succeeded, retaining both the migration-selector and Event Session migration-test registrations along with the updated workflow action pins.
- Post-rebase npm run build --workspace backend — PASS.
- Post-rebase npm test --workspace backend — PASS, 369 tests; recorded in a backend/unit session file under docs/testing/runs.
- Post-rebase migration acceptance — SKIP because TEST_DATABASE_URL is unset; no PostgreSQL acceptance was executed. A backend/db session file under docs/testing/runs records the skip; the PostgreSQL 17 CI step must provide acceptance evidence.
- The coverage audit completed and generated coverage has no content drift.
- python scripts/check.py — FAIL on this Windows environment: the test-run record validator passed for 224 records, but 4 of 128 tooling tests failed in test_worktree_hygiene on Windows path handling. A T-65 tooling session file records the failure; confirm the Linux CI result before merge.
- Local PostgreSQL client/service and Docker daemon are unavailable. CI has a dedicated PostgreSQL 17 acceptance step; its result is pending the PR.

## Blockers

- The post-rebase real-database acceptance test cannot run locally; rely on its dedicated CI step before merge.
- The local Windows repository check has four tooling-test failures; do not claim it passed, and require the normal Linux CI check before merge.
- Any remaining story scope must be split into correctly prefixed discipline subtasks under SCRUM-39. Keep SCRUM-39 open until all acceptance criteria are implemented and verified.
