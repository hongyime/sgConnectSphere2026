# chore/e09-registration-schema

Add the database schema E09-S01/S02/S03 (SCRUM-63, SCRUM-64, SCRUM-65) need,
as a migration-only PR ahead of the application code
(`docs/ops/production-migrations.md`): migration 0023 adds the `pending` and
`rejected` registration statuses; 0024 adds `event_registration_sessions`,
`event_registrations.manually_added`, and replaces the one-row-ever rule with
one active registration per account and Event. The stories stay open; this PR
must not close any of them.

## Done

- 0023 (enum values only, like 0013 and 0017) and 0024, both following
  `docs/db_schema.md`'s EVENT_REGISTRATION_SESSIONS / `manually_added` design.
- `rejected` added to `docs/db_schema.md` and `docs/class-diagram.md`: the
  E09-S02 criteria say the Organiser can reject a Pending request, but the ERD
  had no state for it. Raised for Bryan in the PR.
- Local evidence: `docs/testing/runs/20261020-001007-amareetkm2024-del-backend-db.md`
  (disposable loopback database; 19/19 checks).

## Decisions and open points

- Numbering: 0021 is reserved by #308 and 0022 by #319, so these are 0023 and
  0024. The deploy owner applies 0023 then 0024, one at a time, after the
  earlier files.
- The backfill gives each existing registration every Session of its Event,
  because registrations made before Sessions existed covered the whole Event.
- A selected Session cannot be deleted on its own (`NO ACTION`); nothing in the
  app deletes Sessions today. Deleting a whole Event still cascades.
- No Jira key in the branch or title, and no `Closes` clause, so jira-sync
  closes nothing on merge.

## Next

- Review, merge, then the deploy owner applies 0023 and 0024 to production
  and commits the run records.
- Then the E09-S01 application PR (registration with Session selection).
  Application code must not ship before both migrations are verified.
