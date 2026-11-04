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

## Runs

- Amareet's #422 merged (5ea9ab58) and was merged in here; it already updated
  section K steps 2 and 3 to the named list.
- Automated real-stack run of K and L: 19/19, record `20261104-175630`
  (abb833c). The first try was 18/19 because the guide was wrong: tech_b's
  Support to reconfirm list is shared (any Technical Support Staff member may
  reconfirm, T-104 decision), and section L's review also shows "40 people for
  20 places". Guide fixed, data reset, recorded run from the start.
- Le Xin's manual run of K and L: 3/3 PASS, 7 screenshots with label strips
  (Le Xin's request), record `20261104-175800`. The first try at K was stopped:
  "Sign language interpreter" was ticked on Day 2 by mistake; discarded, reset,
  re-run.

## Next step

PR (base `main`), PostPlan, Jira comment on SCRUM-71; after it merges, Bryan's
acceptance of SCRUM-71. E08-S04 (SCRUM-250, branch
`fix/SCRUM-250-e08s04-safety-officer-flow`, local only) is on hold meanwhile.

## Blockers / care

- The local `connectsphere_dev_stack` database and ports 3001/5173 are shared
  with the on-hold E08-S04 work; its setup must be reloaded before it resumes.
