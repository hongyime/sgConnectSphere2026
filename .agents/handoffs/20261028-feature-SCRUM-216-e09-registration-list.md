# feature/SCRUM-216-e09-registration-list

Build E09-S07 "View registrations for my event" (story SCRUM-69) as one
full-stack PR with its manual run: backend subtask SCRUM-216, frontend SCRUM-217
and the run, SCRUM-218. The Organiser's Registrations page (E09-S02) gains the
registered list and the waiting list, with name, email and contact number only
(T-32), plus the registered count and places remaining. No migration.

## Done

- `attendeeRegistration/organiser.ts`:
  - The read (`GET /api/events?registrations=1`) is open to every Organiser of
    the event's client organisation (E01-S02 Scenario 3) and adds `registered`,
    `waitlisted`, `capacity.remaining` and `event.canManage`.
  - Another organisation's or an unknown event gets 403 "Access denied. This
    event is not available to your organisation.", and the attempt is
    recorded as `Access Denied` / `registrations`, outside any transaction.
  - Approve, decline and add stay with the event's own Organiser (403 for a
    colleague).
- `EventRegistrations.tsx`:
  - Places shows "X registered" and "Y remaining"; the waiting list shows
    "On, N waiting".
  - New cards: **Registered attendees (N)**, with a "Not given" contact number
    and an "Added manually" tag, and **Waiting list (N)**, in joining order
    with positions.
  - A colleague sees a note, no Decision column and no Add card.
  - Pending requests reuse the same `sessionLabels` helper.
- Tests:
  - backend units 14 (organiser.ts 100%);
  - the real-PostgreSQL E09 suite extended (lists, colleague, other
    organisation and its audit row);
  - Vitest (EventRegistrations.tsx 100%);
  - Playwright TC_E09S07_01 to _04.
- Manual run by Amareet on 28 Oct 2026: 4 PASS plus the colleague check, 6
  screenshots. Setup is `docs/testing/manual/E09-S07-preconditions.sql`; the
  sheet is `E09-S07-click-through.md`.

## Decisions

- Read access follows the AC ("my client organisation") and E01-S02, so
  colleagues can view; managing stays owner-only, as in E09-S02.
- TC_E09S07_03 names organiser_b as Client B, but the seed has organiser_b in
  Client A, so the run used organiser_c@clientb.com and showed organiser_b's
  colleague view.

## Follow-ups

- The refused page still shows the "Registration period" header button. It's
  harmless (a second refusal) but could be hidden when the load fails.
- On the general edit form (`EventEditForm`), a late registration close shows
  the 428 message with no "Save anyway"; the Registration period page handles it.
