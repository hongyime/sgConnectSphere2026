# SCRUM-39 E04-S02 — multi-session Events

Implement the merged E04-S02 requirements for Jira SCRUM-39: create one or more child Sessions with independent dates and requirements, assess and book venues per Session, and safely delete a Session while releasing its confirmed booking and retaining notification and activity history. Keep registration and lifecycle Event-level, preserve existing Event data through a forward-only migration, and do not change Sprint 3 assignments or acceptance criteria.

## Status

- Started from `origin/main` at `74b0151` in a dedicated worktree on `feature/SCRUM-183-event-session-foundation`.
- Jira SCRUM-39 was read-only verified on 14 October 2026: Story, To Do, assigned to the repository owner, 5 points, no sprint assignment; its description mirrors canonical Markdown after PRs #253–#255.
- Created and verified Jira Subtask SCRUM-183, `Backend: persist Event Sessions and backfill existing Events`, under SCRUM-39. It is To Do, assigned to the repository owner, with no sprint or estimate. Its description explicitly states that it is a partial increment and the parent must remain open.
- No event Session model or Session migration exists in the current application. The current `sessions` code is authentication-session handling only.
- The customer decisions and architecture are already merged. This branch implements only E04-S02; registration selection/capacity and Session-linked equipment request workflows remain separate story work.

## Implementation

- Added migration `0014_event_sessions.sql`: create child Sessions with finite date ranges and per-session requirements; copy existing Event details and accessibility/facility selections; backfill venue/equipment records to their Session; retain Event-level registration, attendance and technical-support records; preserve single-session writes and edits; require explicit Session selection for dependent inserts once an Event has multiple Sessions.
- Added a PostgreSQL integration acceptance test for migration/backfill, legacy data retention, single-session compatibility, and explicit Session selection. Registered it in `backend`'s `test:db` script and a PostgreSQL 17 CI step.
- Regenerated `docs/testing/tc-coverage.md`; E04-S02 cases 01 and 02 now point to the new acceptance test. Cases 03–05 remain unimplemented in this partial increment.
- Added a T-65 session record for the general backend unit run; it explicitly states that the run does not exercise this migration.

## Decisions / boundaries

- Treat `docs/backlog/release-1/E04-programme-sessions.md`, `docs/testing/cases/E04.md`, `docs/bdr/`, `docs/adr/ADR-018-restoring-sessions-as-first-class-event-entities.md`, `docs/db_schema.md`, and shared venue-booking contracts on `main` as authoritative.
- Backfill one Session per existing Event without dropping or rewriting existing Event-level planning, lifecycle, registration, or technical-support data.
- Preserve unresolved O-50 and O-51 as assumptions; they are outside this story.
- Do not commit `.agents/STATE.md` or `.agents/JOURNAL.md`.

## Next steps

1. Rebase on the latest `origin/main`, inspect the complete diff, and rerun the required repository/application checks.
2. Commit and push the SCRUM-183 slice; open a draft PR with the four required template sections and accurate verification limits.
3. Once branch/PR evidence is live, reconcile SCRUM-183 to In Progress/In Review as the Jira workflow permits; keep parent SCRUM-39 open.
4. Use CI's PostgreSQL 17 acceptance step to validate the migration. Local PostgreSQL/Docker is unavailable in this environment.
5. Merge only after required checks, teammate approval, and the protected merge queue. Then mark SCRUM-183 Done; do not close SCRUM-39 because this PR is partial.

## Commands and outcomes

- `python scripts/agent_handoffs.py` — completed before implementation; this handoff was not yet present at that point.
- Jira `SCRUM-39` and `SCRUM-183` — read-only checks confirmed the parent and child details above.
- `npm run build --workspace backend` — passed.
- `npm test --workspace backend` — passed, 358 tests reported; session record notes that this is general regression coverage only.
- `npx tsx --test tests/eventSessionsMigration.integration.test.ts` — process exited successfully but the PostgreSQL test was skipped because `TEST_DATABASE_URL` is unavailable; it is not counted as migration acceptance evidence.
- `.venv-tools/Scripts/python.exe scripts/tc_coverage_audit.py` — passed; regenerated coverage to show cases 01 and 02 as active.
- `python scripts/check.py` — passed on the final files; repository hygiene and 87 tooling tests. A T-65 session record captures that run.
- Local PostgreSQL client/service and Docker daemon are unavailable. CI has a dedicated PostgreSQL 17 acceptance step; its result is pending the PR.

## Blockers

- The real-database acceptance test cannot run locally; rely on its dedicated CI step before merge.
- Any remaining story scope must be split into correctly prefixed discipline subtasks under SCRUM-39. Keep SCRUM-39 open until all acceptance criteria are implemented and verified.
