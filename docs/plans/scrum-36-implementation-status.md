# SCRUM-36 / E03-S06 implementation status

## Scope cross-check

This implementation follows the Sprint 2 story in the authoritative E03 backlog:

- User story: organisers keep planning conversations on the event record.
- Scenario 1: an accessible organiser can post a comment and the assigned
  Coordinator receives an in-app notification.
- Scenario 2: event comments are displayed oldest first.
- Scenario 3: an organiser without access cannot open or post to the event.
- Checklist: comment body, author name, posting time, chronological display,
  coordinator notification, and access refusal.
- Decisions: B-02 keeps comments separate from clarification requests; C-15
  excludes internal-only comments; C-47 excludes moderation because it is not
  specified for this story.

## Completed in this change

- Added comment retrieval to the organisation-scoped event detail response.
- Added organiser comment creation at `POST /api/events?id=<id>&comment=1`.
- Stored comments in the existing `event_threads` table with type `comment`.
- Created an in-app `notifications` row for the assigned Coordinator.
- Added a comments section and organiser composer to the event detail screen.
- Added backend tests for successful posting/notification and inaccessible-event
  refusal.
- Activated all three E03-S06 Playwright acceptance cases.

## Verification

- Frontend typecheck and tests passed.
- Backend typecheck passed.
- Backend test files passed when run directly with `tsx` (146 tests); the
  package test wrapper currently fails before execution because `c8` is not
  installed in this checkout.
- E03-S06 desktop Playwright tests passed (3/3).
- Frontend/backend builds passed.
- Repository checks passed.

The browser acceptance tests use deterministic API responses because the
repository's disposable E2E database reset/seed setup is still scaffold-only.
The backend service tests cover the real SQL contract and access decisions.
