# feature/SCRUM-66-e09-s04-waiting-list

Goal: implement the backend and attendee UI for E09-S04 / SCRUM-66, covering Event-level waitlist join, live status and leave, place-release notifications, and first-come claim through the existing registration flow. Per the user's instruction, do not perform manual tester steps; keep human acceptance open.

## Scope and decisions

- Canonical story: `docs/backlog/release-1/E09-attendee-registration.md`; acceptance cases: `docs/testing/cases/E09.md`; team decision T-98 keeps lists at Event level and sends a full selected Session through the existing Pending path.
- T-46 and C-23 rule out queue positions, automatic promotion, and a reservation window. All waitlisted Attendees are notified when a registered place becomes available; the first completed claim wins.
- Reuse the registration event lock/capacity logic and E09-S05 withdrawal endpoint where possible. Account deactivation also withdraws upcoming waitlisted rows and must preserve place-release notices for remaining waitlisted Attendees.
- SCRUM-66 and SCRUM-222/223/224 are To Do and assigned to Aaron Koh. Do not change issue ownership. Leave SCRUM-224, the parent story, and human acceptance open.
- Existing `TC_E09S04_02` and `_05` mention list positions despite T-46. Resolve those wording conflicts against T-46/T-98 and regenerate the test-case workbook and coverage inventory if changed.

## Progress

- Started from current `origin/main` after opening PR #378 for SCRUM-50.
- SCRUM-66 dependencies E09-S01/S02 and E09-S05 are already implemented in merged registration code; this branch must be reviewed for overlap with their owners' work.
- Read the current story, subtasks, acceptance cases, DoD, instructor guidance, source-of-truth rules, notification implementation, and registration code.
- Backend implementation committed as `a22df28`: waitlist join and first-come claim share the Event registration lock; released places notify remaining waitlisted Attendees on withdrawal or account deactivation.
- Backend unit suite passed; registration and deactivation tests cover join/claim races, losing claims, Pending selected Sessions, and released-place notices.
- PostgreSQL integration scenarios cover simultaneous claims, API join, and deactivation notices. They were not run locally because `TEST_DATABASE_URL` is not configured.
- Frontend status/join/leave and claim entry are implemented. Focused Attendee tests pass 45/45 and the changed feature/API files report 100% statement, branch, function, and line coverage. Full frontend coverage reports 685/688 passing; three failures are in unchanged ChangeRequests, AppHeader, and EquipmentUnavailability tests.
- Typecheck passes. Keep integration and manual acceptance pending; the user requested no tester steps, and SCRUM-224 / SCRUM-66 must stay open.

## Next steps

1. Run `python scripts/check.py` before the next commit; do not run DB suites without a disposable local/CI `TEST_DATABASE_URL`, against Supabase, or with Docker Desktop.
2. Commit the frontend/docs slice and create new T-65 records only for final automated evidence; do not create manual records or screenshots.
3. Open a technical PR with honest verification and pending human acceptance; keep SCRUM-224 and the parent story open.
4. Continue with the next ranked Sprint 4 technical To Do.
