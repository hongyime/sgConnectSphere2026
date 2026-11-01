# E04-S02 Session screens and per-Session needs

Finish E04-S02 "Create a multi-session event" (story SCRUM-39, owner Amareet;
subtasks SCRUM-239 frontend, SCRUM-240 backend, SCRUM-241 tests) so every
acceptance scenario can be done through the app. PR #401 (Bryan) merged the
Session API and a draft-only editor, but a user could not reach Scenarios 3 to
5: no per-Session venue or equipment needs on screen, no Session choice in
venue search or booking, and no way to delete a Session once the event was in
planning.

## What changed

- Backend (`eventSessions/`): a Session saves its own accessibility and
  facility needs into `session_accessibility_needs` / `session_facility_needs`,
  which venue search reads. The Sessions GET returns the layout, accessibility
  and facility options. Adding a second Session copies the Event's needs onto
  the existing one first. Deleting a Session writes a `Session Deleted` row on
  the Event so the activity log shows it (Scenario 5 asks for this; #401 only
  logged the booking releases).
- Venue search: a sole Session with no needs of its own follows the Event's
  needs again. Since #401 the booking submission always passed `session_id`,
  so single-Session events created after migration 0014 lost their
  accessibility and facility needs in the suitability snapshot. The set-up call
  lists the event's Sessions; suitability returns the Session; the booking list
  returns each booking's Session.
- Frontend: `SessionEditor` shows per-Session requirements once there are two
  Sessions, sends stored text and layout back on every save (the old editor
  cleared them), and appears on the Organiser's request page in planning with a
  confirmed Remove. `VenueSearch` has a Session picker (`?session_id=`) carried
  into `VenueSuitability` and `VenueBookingForm`; holds stay single-Session.
  `VenueBookingRequests` names each booking's Session. `ActivityLog` reads the
  new row as "Session deleted / Session: <title>".
- No migration: every table already exists (0014).

## Not done here

- Lost-venue replacement on a multi-Session event: the coordinator must pick
  the Session in search first; the backend does not yet infer it from the
  replaced booking.
- Equipment requests per Session (E07) and holds per Session (E06-S05) are out
  of scope.
- The T-93 manual run is the next step, recorded under SCRUM-241.

## Commands and outcomes

See the PR's Verification section. The real-database tests in
`backend/tests/eventSessionsRoutes.integration.test.ts` fall back to
`DATABASE_URL`; never run them without `TEST_DATABASE_URL` pointing at a local
disposable database.
