# SCRUM-71 E10-S02 — manual re-run on the Session screen after Amareet's screen PR

Le Xin's manual re-run of E10-S02 on the Organiser's Session screen (story
SCRUM-71, owner Le Xin): section K (TC_E10S02_14, _15) and the new section L
(TC_E10S02_16), once Amareet's Session-screen PR (named list, over-subscription
warning, stale-check panel; split agreed on #416) has merged. #416 merged on 3
November (f9208979); the first manual run of section K is record
`20261103-003200`, before the review fixes.

## Done so far

- Setup: EVT-1030 "Design Summit" in `E10-S02-preconditions.sql`: two Sessions,
  published, Day 2 booked at E10 Seminar Room B (Boardroom seats 20), 30
  Attendees registered for Day 2 (`e10s02.tc16.fill01..30`). A separate event so
  section K (EVT-1029) is unchanged, and published so registered Attendees can
  be notified. Loaded once on a fresh local reset: EVT-1030 2 Sessions, 1
  booking, 30 registered; the `check` stage shows Day 2 unflagged, no layout.
- Guide: section L (TC_E10S02_16), ten events, `APP_URL` for the local API.
  Section L's wording follows `ArrangementReview`; confirm against Amareet's PR.

## Not done / next step

1. Amareet's Session-screen PR merges; merge `main` here.
2. Update section K steps 2 and 3 to the named list (TC_E10S02_14).
3. Fresh reset and setup, automated real-stack run of K and L, audit, record.
4. Reset fresh; Le Xin's manual run of K and L with pasted screenshots; record.
5. PR; Jira comment on SCRUM-71; Bryan's acceptance.

## Blockers / care

- The local `connectsphere_dev_stack` database and port 3001 were in use by
  another session on 4 November (Vite from 01:32, a reset at 01:35:20). Agree
  who uses the local stack before resetting it; never stop an API you did not
  start.
