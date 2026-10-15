# docs/SCRUM-49-hold-api-status

Goal: note in `docs/api-changes-week7.md` (Change 4) what Sprint 3 actually shipped
for E06-S05 "Hold a venue tentatively" (SCRUM-49): the T-92 rules from the backlog
story, not the T-84 Sprint 4 target the table rows describe.

## Done so far

- Added a "Sprint 3 implementation" note under the Change 4 table. The T-84 rows stay
  as the Sprint 4 target. Sources: the E06-S05 story in `docs/backlog/release-1/` and
  `backend/src/modules/venueBooking/holds.ts` / `api/cron/outbox-relay.ts` on main.
- SCRUM-142 (hold buffers) moved to Done in Jira with a comment: #261 delivered it.

## Not done / next step

- SCRUM-141 stays In Review. No Vercel cron calls `?task=holds`, so in production
  expired holds never change to `expired` and no notice is sent. A separate PR
  proposes the cron entry for the deploy owner (Bryan) to decide the cadence.
- SCRUM-49 goes to Done once SCRUM-141 is Done.

## Commands run

- `python scripts/check.py`: see the PR's Verification section.
