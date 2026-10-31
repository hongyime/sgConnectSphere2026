# feature/SCRUM-66-waiting-list

Finish E09-S04 "Join the waiting list" (SCRUM-66) after Bryan's #379 (merged 30 Oct, `f91eb3e`) delivered the product code: the tests subtask SCRUM-224 (TC_E09S04_04's wording, the preconditions SQL, Aaron's manual run and the records) plus the gaps found while testing. Branched from `main` at `4da52a4`. This is the story's final PR; Bryan's PO acceptance (Definition of Done) follows it.

## Done so far

- `docs/testing/cases/E09.md`: TC_E09S04_04 expects a Pending request instead of "registration is simply shown as closed" (D81: C-98, T-85; the backlog's Scenario 4 only says no list is offered).
- `tests/e2e/e09.spec.ts`: the five TC_E09S04 `test.fixme` scaffolds removed; live unit, database and Vitest tests carry each full TC ID. Three titles gained full IDs (`attendeeRegistration.test.ts` x2, Amareet's `EventRegistration.test.tsx` x1).
- `docs/testing/manual/E09-S04-preconditions.sql`: one stage; two published events at a 1-place venue (Community Meetup with the list on, Tech Conference 2026 with it off) and the accounts `attendee_k`, `attendee_m`.
- `backend/tests/deactivation.integration.test.ts` (Ji Ning's E01-S11 test): it built its schema from 0001 and 0003 only, so #379's release-notice lines could never pass; it now applies every migration, and its fake pool gains `query` for `login()`. Passes locally on Docker.
- `backend/src/modules/accessControl/deactivation.ts`: `withdrawn = registrations.length` replaces #379's moved `rowCount ?? 0`, an unreachable branch after the rows are locked.
- `docs/plans/scrum-66-implementation-status.md` rewritten in Aaron's story-record format, keeping Bryan's run rows.

## Not done / next step

- Aaron's manual click-through (TC_E09S04_01 to _05) with screenshots, its T-65 record, and the database check afterwards.
- Final gate runs on the committed head and their records; workbook export; `tc-coverage.md` last; PR with `Closes SCRUM-224`; postplan.
- PO acceptance on SCRUM-66 (Bryan).

## Decisions taken without team sign-off

- D92 amended (Aaron, 30 Oct): the released-place notice carries no link; the Attendee claims from the waiting-list page. Recorded as a Known limit for E11-S01's inbox owner.

## Learnings

- `deactivation.integration.test.ts` has a `test:deactivation:db` script but no step in `application-checks.yml`, so a broken assertion there stays invisible on green CI. Run it locally whenever deactivation changes.
