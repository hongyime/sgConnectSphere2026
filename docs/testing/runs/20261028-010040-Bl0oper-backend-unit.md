---
date: 2026-10-28T01:00:40+08:00
runner: Bl0oper
scope: backend/unit
environment: local
run_type: automated
test_case_version: "271026"
database: mocked
commit: a728b57
---

SCRUM-67 / E09-S05 gate 1: the whole backend unit suite, `npm test
--workspace backend`, on branch `feature/SCRUM-67-withdraw-registration` at
`a728b57` (Windows 11, Node 22). Scripted (mocked) database: the real
PostgreSQL behaviour is in the same session's `backend/db` record. The new
withdrawal tests are in `backend/tests/attendeeRegistration.test.ts`. Run by
Claude for Aaron, from 01:00:40 to 01:00:54. Root `npm run typecheck` and
`npm run build` also passed at this commit just before.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E09S05_01 | withdrawRegistration releases an approved place and tells the waiting list | PASS | 200 with the registration `withdrawn`; locks taken in the order Event, account, registration; one `place_released` notice per waitlisted Attendee, "Community Meetup: A place is available. Apply on a first-come basis; no place has been reserved for you." |
| TC_E09S05_03 | withdrawRegistration refuses after the deadline with a contact, and changes nothing | PASS | 409 "Withdrawal has closed. For help, contact events@client.example.test." with `contact`; no update written; contact query falls back to the Organiser's email |
| TC_E09S05_04 | withdrawalOpen: the deadline binds approved places only and is inclusive | PASS | Fixed clock: allowed at exactly the deadline, refused one second later; Pending and waitlisted allowed after it; no deadline means until the Event starts |
| TC_E09S05_05 | withdrawRegistration releases an approved place and tells the waiting list | PASS | One update of one row releases every selected Session (counts come from status) |
| MULTIPLE | Other withdrawal tests: no notice while still full or for a Pending row; missing, repeated or foreign withdrawal; busy account; the event page's `withdrawal` field and D105 reachability; Discover's SQL | PASS | 6 tests without a single TC ID |
| MULTIPLE | Rest of the backend unit suite | PASS | 545/545 passed, 0 failed |
