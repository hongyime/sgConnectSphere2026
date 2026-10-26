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
- [x] 2. `VenueBlockout.tsx` create form: start/end date and time, end optional ("until lifted"), category picker, note (Scenarios 1, 5). `59aec53`: old `createBlock` and the `booking_conflict` alert removed; TC_E05S04_02 unit + Playwright tests now check the superseding save (TC_E05S06_02); E05-S04 Playwright create tests use the new form (8/8 locally). #348's `tc-coverage.md` was stale after 0b; regenerated there (`7673580`) and merged here.
- [x] 3. Affected events listed on save (Scenarios 2–4). `4d013fc`: success alert lists each event with code, "Returned to Planning" and "Coordinator notified" / "No Coordinator assigned" labels.
- [x] 4. Edit (extend, shorten, remove end, change reason), Lift with confirm, history view with actor and time, lifted entries listed as lifted (Scenarios 5–7, T-91). Split in two:
  - [x] 4a. Edit and Lift (`a02020f`): Edit reuses the create form prefilled; replies list newly flagged and restored events; Lift confirms and lists restored bookings. Shorten/Remove UI and `shortenBlock`/`removeBlock` removed (backend keeps the actions). TC_E05S04_04 unit + Playwright moved to Edit/Lift. The `if (lifting) return` guard is covered in Task 8 by submitting the confirmation form twice.
  - [x] 4b. History panel and "Show lifted" list (`4349f41`): lifted rows read-only with "Lifted by …, time"; History table (when, who, change, before, after); "Former staff member" for a deleted actor; "No changes recorded" for blocks saved before 0025.
- [x] 5. `VenueCalendar.tsx`: reason category, "until lifted", Conflicting bookings labelled. `8efe1d6`. **Release risk found:** the calendar on `main` has no 'conflicting' state, so once #348 is live, a venue with a Conflicting booking crashes the calendar until this PR merges. Merge this PR straight after #348, or tell the reviewer.
- [x] 6. Re-targeted: the Venue Staff queue lists Pending only, so the flag went on the Coordinator's venue bookings page (`VenueBookingRequests.tsx`), which already receives the conflict fields: warning "Conflicting" label + "Venue unavailable" flag with category, note, period / until lifted, earlier status. `BookingRequests.tsx` decide page explains a Conflicting booking can't be decided. `f7b1069`.
- [x] 7. Coordinator event view: venue-conflict flag with reason category (Scenario 3). `b57b287`: the event page showed only "Planning"; new `VenueConflictFlag` reuses the booking_requests list (no backend change) and names each Conflicting venue + category with a link to venue bookings; silent on refusal. E07-S06 `TechnicalSupport.test.tsx` allow-list extended for this card (intent unchanged).
- [x] 8. Unit tests, 100% of changed code; update tests the old Shorten/Remove buttons break; regenerate `tc-coverage.md` if needed. `d00af8c`: TC_E05S06_01–08 Playwright cases live (mocked API; _03 email stays with the backend DB test); every added/changed line in the 9 frontend source files covered (checked against the vitest JSON report); full Playwright 368 passed, 0 failed.
- [x] 9. `scripts/check.py`, frontend tests, T-65 record, draft PR. Evidence at `86666e4`: `20261025-134344-lexinphun2024-debug-frontend-vitest.md` (571/571, changed lines fully covered), `20261025-134418-lexinphun2024-debug-frontend-e2e.md` (368 passed, 0 failed), `20261025-134629-lexinphun2024-debug-tooling.md` (14 known Windows-only `test_worktree_hygiene` failures). Draft PR **#349** opened against the backend branch; #348's description now asks for #349 to merge straight after it. PostPlan page prepared for the user to upload and link in a #349 comment.

- [x] 10. Real local stack run + manual-run kit (25 Oct). `docs/testing/manual/E05-S06-preconditions.sql` (seeded events moved to Jan 2027 at Orchid Hall) and `E05-S06-click-through.md`. First real attempt failed TC_02: a **primary** Confirmed booking could not become Conflicting (0019 check) — fixed in #345 `049c389`, tested in #348 `47a268c`, merged here `92d8ff9`. Re-run on the real stack: all 8 cases pass, read-only SQL corroboration in `20261025-151652-lexinphun2024-debug-frontend-e2e.md` (automated, database real; not T-93). Temporary script deleted.
- [x] 11. Follow-up to Bryan's #345 review (25 Oct). Merged #345 (incl. his `d5174c6` coverage repair) into #348 (`62997a6`) and #348 into this branch (`7f21b63`). CI on this PR had failed the calendar DB test: since `049c389`, 0025 drops and re-adds `venue_bookings_primary_confirmed`, which 0019 creates, but the venue calendar, accessibility and search tests applied 0025 without 0019. `a25a3dc` adds 0019 after 0016 in all three (tests only, added here in `f6523c9`); record `20261025-151945-lexinphun2024-debug-backend-db.md` (14/14).
- [x] 12. Human T-93 manual run (26 Oct): TC_E05S06_01–08 all PASS on the real local stack at `781c974`, 25 hand-taken screenshots. Record `20261026-161844-lexinphun2024-debug-frontend-e2e.md`, evidence in `docs/testing/runs/evidence/20261026-161844-lexinphun2024-debug-frontend-e2e/`. Email for TC_03 checked read-only: 8 venue notices, all to Coordinators, each `email:queued`. Seen outside the cases: top menu cuts off its last item ("Tentative I", "Ve"); affected-events list repeats the event code (seed titles contain it); Maintenance blocks forgets the chosen venue after a new sign-in.

## Next steps

- Reviews of #345, #348 and this PR.
- ~~Manual end-to-end runs of TC_E05S06_01–08~~ done 26 Oct (item 12).
- After #348 merges: retarget this PR to `main`, re-run CI, merge promptly (calendar crash risk above).

## Decisions for the reviewer

- The timed form replaces E05-S04's whole-day form. No decision, design note or case asks to keep both; a whole day is still entered as 00:00 to 00:00 the next day. TC_E05S06_06 (E05-S04 regression on free periods) still applies.
- The note is required on the form although the backend accepts an empty one: Scenario 1 marks only the end as optional and saves "the period, the category, the note"; TC_E05S06_01 enters one; a note explains "Other". The page title and menu label stay "Maintenance blocks" for now.
- The history view is in scope: T-91 names the UI, the Figma refinement plan says "show history and actor", and TC_E05S06_07 opens it.
