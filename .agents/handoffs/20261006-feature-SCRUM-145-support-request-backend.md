# E07-S06 technical support request backend (SCRUM-145)

Goal: build the backend for E07-S06 "Request technical support for an event"
(story SCRUM-56, subtask SCRUM-145): the assigned Coordinator records a
support request, or declares that none is needed, and Technical Support
Staff are notified. The frontend (SCRUM-146) and the story-level tests and
manual E2E (SCRUM-147) follow in separate PRs. Owner: Amareet.

## Done

- `backend/src/modules/equipmentSupport/supportRequests.ts`: validation,
  access rules, read, request, "none" declaration and notification.
- `backend/src/modules/equipmentSupport/supportHandler.ts`, routed as
  `/api/venues?task=support` from `api/venues/index.ts`.
- `backend/tests/supportRequests.test.ts` (19 tests, 100% c8 coverage of both
  files) and `backend/tests/supportRequests.integration.test.ts` (PostgreSQL,
  in `npm run test:db`).

## Not done / next step

- Run `npm run test:db` (or just the new integration file) against a
  disposable local PostgreSQL. Docker Desktop was not running on 6 October
  2026, so the real-database test has not been executed yet; record a T-65
  `backend/db` session when it is.
- SCRUM-146 frontend: request form and "No technical support required" on the
  Coordinator event page, against the GET/POST shapes in `supportHandler.ts`.

## Decisions for the reviewer (not yet confirmed by the team)

1. **Who is notified:** every active Technical Support Staff member, because
   no technician is assigned until E07-S07. This matches E07-S02 (#216). The
   story says only "the Technical Support Staff are notified".
2. **How "no support needed" is stored:** a `tech_support_requests` row with
   `support_required = false` over the event's range. The schema already has
   the column, and no migration is needed. Scenario 3's "no request is
   created" is read as "nothing to staff and nobody notified". E08-S03
   (Aaron) must look only at `support_required = true` rows when checking
   readiness.
3. **When requests can change:** only while the event is `approved` or
   `planning`, as for E07-S02 equipment requests. Before approval there is
   no assigned Coordinator plan; after confirmation, changes are E10 work.
4. **"None" while a live request exists** is refused (409), since E07-S06 has
   no cancel scenario; cancelling would be a later story.
5. **Times** are not constrained to the event's own range, because support
   can be needed for setup before or teardown after the event.
