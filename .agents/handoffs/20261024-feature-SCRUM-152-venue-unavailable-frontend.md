# SCRUM-152 — E05-S06 frontend: venue unavailability over existing bookings

Goal: the screens for E05-S06 "Mark a venue temporarily unavailable over existing bookings" (Jira SCRUM-152): Venue Staff mark a venue unavailable with a start, optional end, reason category and note; see the affected events on save; edit, lift and view the history of an unavailability; the calendar, booking requests and the Coordinator's event show Conflicting bookings with the reason. Stacked on the backend PR #348 (`feature/SCRUM-152-venue-unavailable-backend`), itself stacked on the migration-only PR #345 (migration 0025).

## Release order

1. #345 merges; the deploy owner applies `0025_venue_unavailability.sql` to production and records it.
2. #348 is retargeted to `main` and merges.
3. This PR is retargeted to `main` and merges. Until then it stays a draft based on the backend branch.

## Task list

- [x] 0. Branch and this handoff file (`77db351`).
- [x] 0b. Backend (on #348's branch): read an unavailability's history and list lifted unavailabilities, so the history screen TC_E05S06_07 step 3 opens has data. Then merge into this branch. Done in #348 (`0203699`, records `f6fa9c2`): GET `?id=&blocks=1&history=<block>` and `?id=&blocks=1&lifted=1`, Venue Staff only; merged here.
- [x] 1. `blocksApi.ts`: timed input, optional end, reason category, `edit_block`, `lift_block`, history read, affected/restored events. (`2acd786`; old E05-S04 calls kept until Task 4; the current screen shows an open-ended block as "Until lifted").
- [ ] 2. `VenueBlockout.tsx` create form: start/end date and time, end optional ("until lifted"), category picker, note (Scenarios 1, 5).
- [ ] 3. Affected events listed on save (Scenarios 2–4).
- [ ] 4. Edit (extend, shorten, remove end, change reason), Lift with confirm, history view with actor and time, lifted entries listed as lifted (Scenarios 5–7, T-91).
- [ ] 5. `VenueCalendar.tsx`: reason category, "until lifted", Conflicting bookings labelled.
- [ ] 6. `BookingRequests.tsx`: Conflicting booking shows reason, period, earlier status.
- [ ] 7. Coordinator event view: venue-conflict flag with reason category (Scenario 3). Check the data is already served before adding anything.
- [ ] 8. Unit tests, 100% of changed code; update tests the old Shorten/Remove buttons break; regenerate `tc-coverage.md` if needed.
- [ ] 9. `scripts/check.py`, frontend tests, T-65 record, draft PR.

## Decisions for the reviewer

- The timed form replaces E05-S04's whole-day form. No decision, design note or case asks to keep both; a whole day is still entered as 00:00 to 00:00 the next day. TC_E05S06_06 (E05-S04 regression on free periods) still applies.
- The history view is in scope: T-91 names the UI, the Figma refinement plan says "show history and actor", and TC_E05S06_07 opens it.
