# E04-S02: prompt for a primary venue after deleting a Session

Follow-up to #408 under E04-S02 (SCRUM-39, reference only): deleting the Session
whose booking was the primary venue left the event with no primary and no warning,
and the event can't be published without one. This adds the prompt T-94 asks for.

## What changed

- `removeSession` returns `primaryNeeded` and sends the Coordinator a "Primary venue
  needed" notice when the primary was released and another Confirmed booking remains.
- The Organiser's removal message says the Coordinator must choose another; the
  Coordinator's booking list warns when Confirmed bookings have no primary.
- The editor no longer says a sole Session "uses the event's own requirements",
  which was untrue after deleting down to one.

## Deliberately not done

- **No automatic promotion:** T-94 says a released primary is cleared and someone is
  prompted. T-78 keeps choosing with the Coordinator, so the Organiser's prompt points there.
- **Event attendance unchanged:** T-79 keeps it as the overall planning total.
- **Event time unchanged:** no decision covers narrowing it after a deletion. Published
  events use the event's time, and a later event edit on a sole Session is still copied
  onto it by the 0014 trigger (not tested). Both are questions for Bryan.

## Commands and outcomes

See the PR's Verification section. Database tests run only with `TEST_DATABASE_URL`
on a local disposable database, with `DATABASE_URL` and `DATABASE_POOLER_URL` unset.
