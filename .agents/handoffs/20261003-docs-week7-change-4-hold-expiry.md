# docs/week7-change-4-hold-expiry

Goal: backlog and acceptance cases for Week 7 Change 4 (C-68, tentative holds
expire), per T-69, T-74 in #194. Stacked on docs/week7-change-3-multi-venue
(shares the E06 file and its TC numbering); merge #197 then #199 first.
No Jira key; E06-S05 is SCRUM-49.

Done: E06-S05 (To Do) updated in place - Scenario 1 and 3 amended for the
default expiry and the completing action, Scenarios 6-9 added (expiry frees
the venue and never counts as a booking, reminder + notice, Venue Staff
extension, boundary at the exact second), checklist extended; E11-S01 routing
table gains the hold reminder/expiry row. Cases TC_E06S05_03-07. Exports and
coverage regenerated (276 cases).

Decisions without team sign-off: O-31 (48 h default, Venue Staff may change),
O-32 (submitting the request completes the hold), O-33 (reminder 24 h before
plus notice at expiry), O-34 (Venue Staff extend, logged, unlimited; expired
holds cannot be extended). Expiry job runs on the existing outbox worker
(T-69), not a new scheduler.

Not done: Playwright scaffolds (dev work); ADR-006 note about the worker
also expiring holds is for the architecture PR.
