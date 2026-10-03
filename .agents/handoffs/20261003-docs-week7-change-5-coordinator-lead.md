# docs/week7-change-5-coordinator-lead

Goal: backlog and acceptance cases for Week 7 Change 5 (C-69, Event
Coordinator Lead), per T-70, T-72, T-74 in #194. Stacked on
docs/week7-change-4-hold-expiry (shares the E11 routing table edits); merge
#197, #199, #200 first. No Jira keys yet for the five new stories.

Done: E03-S01 stays Done; Scenarios 1-2 and two checklist items marked
"[Superseded by E03-S08 (C-69)]" with a note, nothing deleted (T-74). New
stories E03-S08 (Lead assigns from the unassigned queue), E03-S09 (Lead
reassigns; Coordinator acceptance path kept), E03-S10 (oversight view),
E01-S12 (Coordinators manage only assigned events; venue calendars unaffected
per C-40), E01-S13 (Lead and Safety Officer sign-in homes). E11-S01 gains two
routing rows and a Lead note. 16 cases incl. regressions on E03-S01, E03-S05,
E01-S02, E05-S03, E01-S01. Exports regenerated (53 R1 stories, 292 cases).

Decisions without team sign-off: O-35 one Lead, O-36 Lead reassignment is
directive, O-37 Coordinator may ask the Lead, O-38 queue Lead-only, O-44 one
role per account; the fewest-active-events count becomes advice shown to the
Lead rather than automation; E01-S13 forward-references E08-S07 (change 6).
Skipped IDs E01-S10 and E03-S04 deliberately (both were removed earlier).

Not done: Playwright scaffolds; TC_E03S01_01/_02 assert the auto-assignment
that is now superseded - retire when E03-S08 ships.
