# G. Change log

## Version 1 to version 2

Reconciled the release scope against the 20 core features. Three gaps were found and closed by new stories: E03-S07 (view and update event information, feature 7), E09-S07 (view registrations, feature 18) and E08-S05 (complete an event, required by the Completed status).

Closed the workflow break where nothing moved an event into Confirmed. E08-S03 was brought in and split by operation into confirm, revert and complete.

Adopted a single canonical status vocabulary. E02-S01 previously set Requested and E03-S03 set Planning on approval, both inconsistent with the rest of the backlog.

Brought E14-S02 in with reduced scope. Three stories referenced activity history while the whole audit epic sat out of scope, so those criteria could not have passed.

Fixed two acceptance criteria pasted under the wrong story: E07-S01 carried E07-S07's staff-assignment checklist, and E05-S05 carried E05-S04's venue-blocking checklist.

Removed E01-S10, which duplicated E01-S04 and had an empty criteria cell. Rewrote E01-S11 from deletion to deactivation.

Closed eleven OPEN and ASSUMPTION markers against the Week 2 clarifications and reclassified the remainder as explicit team assumptions.

Added estimates and sprint assignments, neither of which existed in version 1.

## Version 2 to version 3

Version 3 followed an overlap audit across all release stories. See section D.

Merged the former E03-S03 (approve) and E03-S04 (reject) into a single E03-S03, matching how E06-S04 already handled venue approval and rejection in one story.

Merged the former E11-S01 and E11-S02 into a single E11-S01. They were one behaviour split by actor rather than by behaviour.

Removed three outright duplications (B-08, B-09, B-10).

Retitled E02-S03 and E05-S02 to name their matching purpose rather than reading as data capture already covered elsewhere.

Recorded the boundary for four story pairs that remain deliberately separate (B-01 to B-04) and cross-referenced one mirrored invariant (B-05).

Moved the backlogs into CONNECTSPHERE BACKLOGS CAA 140926.xlsx and all rationale into this document. The Word backlogs are retired.

## Version 3 to version 4

Version 4 applies the Week 4 customer clarifications, recorded as C-55 to C-64. Three of those answers changed the shape of the release rather than merely confirming it, and two backlog edits logged in version 3 were carried out.

Scope changes from customer answers

Withdrew the sessions model (C-62, T-48). Bryan confirmed that a multi-session event must be set up as separate events. E04-S02 left Release 1, 29 of the 47 release stories were rewritten from session level to event level, and ADR-004 and ADR-005 were retired along with the SESSIONS table and its composite foreign keys. Multi-session was never among the twenty core features, so this realigns the release with them.

Returned tentative venue holding to Release 1 (C-60, T-49). E06-S05 is back in Sprint 3 with four scenarios. The venue calendar state reverts from Pending to Tentative, amending T-17. Only one active hold or confirmed booking may exist per venue and period, which independently confirms T-20. Auto-expiry rules are explicitly not required, so no expiry figure was invented.

Changed the registration capacity rule (C-58, amends T-31). Capacity is governed by the booked venue capacity, and expected attendance is a planning input used for venue suitability rather than a registration cap.

Added manual VIP registration (C-58, T-50), as scenarios 4 and 5 of E09-S02 rather than a separate story, because it is a business-rule variation on capacity enforcement.

Added an acceptance step to coordinator reassignment (C-56, amends T-15). E03-S01 grew from four scenarios to six.

Recorded that internal staff onboarding is out of scope (C-57), so E01-S08 covers Attendee self-registration only.

Confirmed that 'none required' counts as a fulfilled arrangement (C-59) and added a scenario to E08-S03.

Confirmed that an event cannot be confirmed without a ConnectSphere venue (C-63).

Backlog edits carried out

Applied T-46. E09-S04 Scenario 1 was reworded to remove 'my position is confirmed', which implied an ordered queue that Scenario 2 and the schema both contradict.

Applied T-47 as boundary ruling B-11. E09-S02 Scenario 4 was deleted as a duplicate of E10-S02 Scenario 4.

Consequential edits

Removed E11-S01 Scenario 4, which scoped notifications to one session of a multi-session event. The story drops from XL to L.

Rebalanced the sprints after E04-S02 left Sprint 1 and E06-S05 joined Sprint 3. E05-S01 and E05-S02 moved to Sprint 1, E05-S04 to Sprint 2. Release 1 stands at 47 stories and 155 points across 36, 36, 43 and 40.

Closed five standing assumptions on customer evidence: O-03, O-04, O-07, O-10 and O-15. Retained in section C marked Closed so the history stays visible.

Still outstanding after version 4

O-01, O-02, O-05, O-06, O-08, O-09, O-11, O-12, O-13, O-14, O-16, O-17, O-18 and O-19 remain open. C-64 reaffirmed that no user capacity numbers exist, so O-17 stays open.

Downstream documents affected

The sessions withdrawal reaches beyond the backlog. The database schema loses SESSIONS, its composite foreign keys and every per-session column. The C4 model and architecture document both describe per-session booking, equipment and registration. The test-case suite references session identifiers throughout. ADR-004 and ADR-005 are formally retired in version 3 of the Architecture Decision Records.

## Version 4 to version 5

The team answered eight of the open assumptions in section C. Six confirmed existing positions; two produced edits.

O-05 closed with a change. Registration lists show name, email address and contact number. E09-S07 Scenario 1 and its checklist, and E09-S01's checklist, were updated. T-32 amended. No schema change: contact number already exists on the user record.

O-01 closed with a change. A three-second target for venue search, calendar load and registration submission, recorded as T-51 and placed in the Definition of Done rather than in individual acceptance criteria.

O-02, O-06, O-09, O-14, O-16 and O-17 closed unchanged, confirming the assumptions already carried.

Six items remain open, all outside Release 1: O-08, O-11, O-12, O-13, O-18, O-19.

No change was required to the architecture, the C4 model, the database schema or the sprint plan.
