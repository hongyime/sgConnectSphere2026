# docs/week7-change-3-multi-venue

Goal: backlog and acceptance cases for Week 7 Change 3 (C-67, several venues
per event), per T-68, T-74 in #194. Stacked on
docs/week7-change-1-setup-turnaround (shares the E06 files); merge #197 first.
No Jira key yet. No new story: every affected story is To Do, so AC are updated
in place.

Done: E06-S03 Scenario 3 inverted (several bookings allowed) plus 3a/3b/3c
(headcount per booking, windows inside the event, primary venue); E06-S06
Scenario 5 (conflicts per venue); E08-S03 Scenarios 1, 2, 6 and checklist made
plural with the O-28 gate; E10-S02 Scenarios 1 and 5 per booking; E09-S01
Scenario 5 primary venue shown. Both backlog views. Cases TC_E06S03_07/_08,
TC_E06S06_07, TC_E08S03_06/_07, TC_E10S02_07, TC_E09S01_06. Exports and
coverage regenerated (271 cases).

Decisions without team sign-off: O-27/28/29/30 defaults tagged; the primary
venue is the first Confirmed booking by default; a booking outside the event
window is refused rather than warned. T-20 is retired by #194 and the E06-S03
BDR line keeps it for history.

Not done: Playwright test.fixme scaffolds (dev work); TC_E06S03_03, which
asserted the old second-request block, should be retired when E06-S03 is
implemented - left in the catalogue for now so the inventory stays stable
until the story owner picks it up.
