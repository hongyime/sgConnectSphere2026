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

## 27 September 2026: E11-S01 routing and transactional integration

T-64 records the repository owner's approved recipient matrix, actor suppression,
waitlisted/Coordinator arrangement notices, explicit Venue Staff assignment
dependency and incremental integration scope. ADR-006 now specifies business
write/audit/in-app/outbox atomicity and retry identity. Original sprint estimates
are unchanged; missing workflow and inbox acceptance remains open.

## Version 5 to version 6: Week 7 Customer Changes

Version 6 records the Week 7 Customer Changes document (2 October 2026) as C-65 to C-70, verbatim and in document order. All six changes are mandatory for Release 1 and the customer anticipates no further changes.

Scope changes from the customer document

Returned E05-S05 to Release 1 (C-65, T-66). Setup and turnaround time are per-venue attributes and every availability and conflict check uses the buffered occupancy window. Reverses C-18 and C-38. Bookings that conflict under the new rule are flagged, never released.

Withdrew E05-S04's refusal of a block over a confirmed booking (C-66, T-67), delivered as a new E05 story because E05-S04 is in the Sprint 2 sprint backlog and sprint scope is fixed. Overlapping bookings become Conflicting; the event is never cancelled or moved automatically. Returned E10-S05 to Release 1.

Retired T-20 and inverted E06-S03 Scenario 3 (C-67, T-68). An event may hold several venue bookings, pending or confirmed, each checked independently. E08-S03's confirmation precondition becomes plural.

Amended T-49 (C-68, T-69). Every tentative hold carries an expiry; the system releases expired holds; the Coordinator is told before and at expiry. Reverses the no-expiry position in C-01, C-16 and C-60.

Retired T-14 and amended T-15 (C-69, T-70). New requests enter an unassigned queue worked by the new Event Coordinator Lead; Coordinators manage only their own events; the Lead may reassign.

Added a Safety Review status between Planning and Confirmed (C-70, T-71) as the interim placement of the Operational Safety Check. The Safety Officer approves, rejects or requests changes; the latter two return the event to Planning.

Extended the role model to seven roles (T-72). Both new roles are pre-seeded under C-57; ADR-012 holds.

Applied the Week 7 "Managing Changes" guide (T-74). Each change is classified in its section A row (five new requirements, one correction plus new requirement). Done stories touched by a change (E03-S01, E05-S01, E05-S03, E06-S01, E03-S05, E01-S01, E01-S02, E01-S11) stay Done and the new behaviour becomes new stories; To Do stories are updated in place; E05-S04, in the Sprint 2 sprint backlog, is left alone and corrected by a new story. Estimation rule recorded in T-73: new stories estimated at planning, changed To Do stories re-estimated only if materially different, Done stories never, in-flight stories for remaining work.

Process

T-73: the customer Q&A may fall after Sprint 3 planning, so every Week 7 story is written now against recorded defaults. O-20 to O-44 hold one row per ambiguity with the default and the exact Q&A question; dependent criteria are tagged "(assumes O-xx)"; Sprint 3 pulls first the stories with no High-priority open item. Twelve items are High, five Medium, eight Low.

Superseded rows

C-01, C-16, C-18, C-38, C-41, C-55, C-56 and C-60 gained a trailing note naming the Week 7 entry that supersedes them, in part or in full. Their original text is unchanged.

Housekeeping

Removed five stray blank lines inside the section B table (between T-57 and T-62, and before T-64) that split it into unrelated fragments when rendered. No row text changed.

Still outstanding after version 6

O-08, O-11, O-12, O-13, O-18 and O-19 remain open from earlier versions. O-20 to O-44 are open pending the customer Q&A.

Downstream documents affected

Backlog Markdown (release-1 and product views), acceptance test cases, the canonical status model's consumers (E03-S05, E08-S03, E08-S04, E08-S05, E01-S11), ADR-003 (buffered exclusion range), ADR-006 (hold expiry on the worker), ADR-007 and ADR-012 (seven roles), ADR-009 (safety-check audit actions), docs/db_schema.md and a new migration (user_role values, venue buffers, booking expiry, safety review), docs/c4-diagrams.md, docs/modular-monolith-architecture.md and docs/dynamic-user-flows.md (two new actors and sequences), the E11-S01 routing matrix, and the Figma role boards. Each is handled in its own follow-up PR; this version records the decisions they implement.

## 2 October 2026: Activity-log reader, booking ownership and Sprint 3 carryover

Product-owner approval is recorded in T-75 and T-76. Event Coordinators use the
existing event Activity log within existing event permissions; testers check
denial and deactivation rows in a controlled test database. No Administrator
role or global audit viewer is added to Release 1.

Booking approval, rejection and release logging moves from E14-S02 Scenario 3
to E06-S04 Scenario 5. TC_E14S02_03/_06/_07 remain as retired references to
TC_E06S04_05/_06/_07. Remaining E14-S02 Scenarios 1, 2, 4 and 5 carry into
Sprint 3; their completion is independent of E06-S04. Original commitments and
estimates remain historical evidence. Both backlog views, acceptance cases,
active scaffold files, ADR-009 and derived exports are reconciled in this change.
Jira reconciliation follows the merged backlog; the scope PR must not close
SCRUM-86 automatically.

## 8 October 2026: E06-S02 operating-hours clarification

T-77 records the Product Owner clarification relayed by the story owner:
E06-S02 flags an event outside venue operating hours as unsuitable, explicitly
naming the failure. Fully contained events pass. The result stays advisory and
must be available to Venue Staff in the owning booking workflow. E06-S01 search
continues without an operating-hours suitability filter. Both backlog views and
TC_E06S02_05 carry the clarification; Jira reconciliation follows merge.

## 9 October 2026 - PO confirms venue booking defaults (T-78)

Recorded the story owner's relayed PO confirmation of O-27, O-29, O-30 and
O-32, retaining the original questions/defaults as history. Booking-specific
purpose/headcount and contained periods are confirmed; buffer occupancy may
extend outside the event. First confirmed booking is primary, with Coordinator
selection of another confirmed booking permitted. Requests are limited to the
assigned Coordinator and Approved/Planning events; confirmed-event replacements
require the authorised reversion workflow first. Submission ends an unexpired
hold's expiry; an expired hold cannot convert. Both E06 backlog views updated.
Other open questions, including O-28 and O-31/O-33/O-34, remain unconfirmed.
This records requirements, not implementation or story completion.

## 12 October 2026: Week 9 customer Q&A (version 7)

Archived the eight source materials supplied to the project under
`docs/bdr/customer-sources/` and recorded all 66 Week 9 Q&A rows in workbook
order as C-71 to C-136. The original answer wording remains in section A;
status and the separate "What it settled for us" column record whether the
customer settled, partly answered or delegated each question.

Reconciled O-20 to O-44 against Week 9 and added O-45 to O-49 for residual
questions and design dependencies. O-10 is open again because C-107 conflicts
with C-62/T-48 on bookings across sessions. O-23 stays open because C-111 says
venue blocks should not be open-ended while C-119 permits open-ended
unavailability. C-78 adds the combined layout capacity rule for multi-venue
events. O-22, O-38 and O-44 retain their unresolved details. C-89
records manual Venue Staff selection without turning T-64's team routing model
into a customer-mandated roster.

Several clear answers conflict with earlier customer or team positions and need
downstream review: C-107 on bookings across sessions (O-10), C-120 on
confirmed-event status after venue loss (O-24), C-132 on the safety-review
trigger (O-40), and C-134 on where safety factors are assessed (O-42). The BDR
records these answers and flags the conflicts; this update does not amend
backlog stories, architecture decisions or implementation.

Regenerated the BDR and ADR Word exports from Markdown as `CAA 121026` and
updated the source-of-truth index. The exports remain derivative; the Markdown
sections are authoritative.

## 13 October 2026: Team selections from Week 9 Q&A (version 8)

The team reviewed the impact register and selected rules for the
Week 9 answers. Added T-79 to T-91 and reconciled the affected open-question
rows while retaining every original customer answer in section A.

T-79 follows C-107 and reverses T-48: Sessions return to Release 1 under Event;
venue bookings and equipment attach to Sessions, while one event-level attendee
registration can select multiple Sessions. T-80 selects C-119's open-ended
unavailability rule despite its conflict with C-111, and keeps buffers off
maintenance blocks. T-81 applies C-120's automatic return to Planning when a
venue is lost and notifies the Coordinator. T-82 starts Safety Review
automatically and records both the factor checklist and the overall decision
and comments. T-83 removes the Coordinator-initiated reassignment request and
limits the queue to Leads.

T-84 sets per-hold expiry and warning times, with at most two extensions and a
reason for each. T-85 defines one event registration with selected Sessions,
per-Session and combined event caps, and an over-capacity Pending review path.
T-86 adopts multi-role accounts while seed data assigns one role per account.
T-87 imposes no fixed minimum lead time and a team-selected maximum of two years.
T-88 closes pending change requests as Obsolete when the event becomes terminal.
T-89 keeps venue-to-staff assignments as setup data without a roster screen.
T-90 adds E02-S05 to Release 1 at its existing three-point estimate, with sprint
placement left to planning. T-91 allows Venue Staff to edit blocks, retains
history, and notifies affected Coordinators when blocks are lifted.

These are scope decisions, not implementation evidence. Both backlog views,
test cases, schema/contracts, ADRs, flows and UI design must agree before the
affected stories are considered ready. Generated exports follow their Markdown
sources. Jira changes remain downstream of the merged canonical backlog.

## Version 8 to version 9

Applied Week 9 choices to eligible stories and recorded remaining assumptions. Restored E04-S02 and added E02-S05 to Release 1; added E02-S07 for the two-year date horizon and E07-S08 for Session-linked equipment behavior. Updated Sprint 4 registration, arrangement-change, safety-reversion, rescheduling and cancellation criteria while leaving Sprint 3 stories untouched until close under T-73. Added O-50 for Session waitlist behavior and O-51 for copied Session/arrangement data; both remain explicit assumptions for review.

## 15 October 2026: Manual-run screenshots (T-93)

T-93 makes hand-taken screenshots part of every manual test run. The tester
names each image after the TC_ID it shows and commits it next to the session
record under `docs/testing/runs/evidence/`. Showing them in the PR's postplan as well is recommended.
It applies to manual records dated on or after `2026-10-16T00:00:00+08:00`; earlier records stay
as they are. Sprint 3 Done stories are re-run with screenshots before the
Sprint 3 Review as new records, without being reopened; Sprint 1 and 2 stories
are left as they are.

## 15 October 2026 — E06-S03 withdrawal and suggested-venue follow-up

T-94 records the Product Owner's Pending-only withdrawal boundary and the future
Confirmed-primary cancellation rule (clear primary, prompt Organiser, no automatic
promotion). T-95 records the E06-S04 owner's Released/lock/audit agreement and the
story owner's requested-venue staff notification confirmation. T-96 records the
story owner's replacement retry and rejection-chain confirmation. Source is the
clarifications relayed in the working conversation on 15 October; these are not
new customer consultation quotes or proof of implementation.

Reconcile E06-S03's release/product criteria and canonical cases with the shared
contract. Reuse Released; no new status. Only Released replacements stop consuming
their predecessor's replacement slot. A Rejected replacement must follow its own
new suggestion, if any, rather than retry its predecessor's suggestion. Preserve
0019 and plan a separate index migration. The latest E06-S05 owner coordination
is already resolved in #274; this follow-up does not reopen it or change Session
scope, hold defaults, story estimates, sprint assignments or Jira statuses.


## 16 October 2026 ? Withdrawal decision reference correction (#280 review)

Renumber the withdrawal decisions from T-93/T-94/T-95 to **T-94/T-95/T-96**
because earlier PR #279 reserves T-93 for hand-taken manual-run screenshots.
This is a reference correction, not a change to the agreed withdrawal behaviour.
The release/product backlog, cases, contract, schema note, BDR addendum and
regenerated CAA 161026 derivatives use the corrected IDs. CAA 151026 exports
and immutable execution records remain historical snapshots with their old IDs.

New TC_E06S03_09 to _13 keep the parent story's current Sprint 3 metadata.
The scheduling question recorded during review is resolved by the Product Owner's
16 October confirmation below. They remain unimplemented, not delivered.

## 16 October 2026: Product Owner approvals (T-97)

Recorded the Product Owner's bounded demo-account risk acceptance and approved
procedure for the single existing Safety Officer seed profile. The current seed
already defines that account and the Coordinator Lead; only this one approved
missing profile may be provisioned after reviewed procedure and read-only
precheck. No seed code change or other account creation is authorised. The
existing public/shared credential has no selected rotation or access restriction;
this is not a security-safety or real-data approval. No production account write
was performed here.

Selected E14-S03 and E03-S12 as Sprint 3 follow-ups, still unestimated and not
Done, for separate refinement. E14-S03 addresses the confirmed display defect:
the current Organiser and assigned Coordinator Activity logs expose raw UTC
edited date/time values; the new story will show readable Singapore time.
UTC storage, audit permissions and access
remain unchanged; notifications, unrelated labels, global viewing and before/
after history are excluded. E03-S12 replaces the current plain success paragraph
with the shared success Alert, retaining its existing status semantics and
field-specific messages while preserving error, save,
persistence and permission behavior. E14-S02, E03-S07 and E03-S11 remain Done.
T-97 supersedes T-74's historical reopening exception under the current
Definition of Done and 6 October instructor guidance; T-74's history remains
unchanged. This is planning approval, not a claim of story delivery.

Recorded Bryan as accountable PO for the SCRUM-75 Venue Staff mapping follow-up.
The separate Jira subtask SCRUM-195 is assigned to Bryan as accountable PO.
This decision approves no roster mapping or load. Only the deploy owner may apply an actual approved mapping
with pre/post records, and Ji Ning verifies delivery. PR #272's merged routing
code is independent of the mapping; no assignments are authorised until
approval. T-89's no-roster-screen decision remains.

## 16 October 2026 ? PO Sprint 3 confirmation and current-main integration

The Product Owner confirmed: keep the new cases under E06-S03's current Sprint 3
plan and complete the remaining work; record anything unfinished honestly at
sprint close. Do not label this a Sprint 4 allocation, inferred carryover or
completed delivery. Update T-94 and downstream planning notes accordingly without
changing case sprint values, estimates or ownership.

Integrate current main (62916a9, including #217/#266/#273/#277) as requested in
#280's review. Regenerate the backlog/test workbooks, legacy testcase compatibility
input, BDR export and coverage inventory from the combined canonical sources.
Resolve generated coverage by regeneration, preserving both main's scaffold
changes and this PR's five new unimplemented cases. The reported hard-coded
354-case assertion has been repaired in #268 per the PO's review comment; do not
change the correct 359-case catalogue to satisfy the obsolete assertion.

## 16 October 2026: E03-S11 added to the backlog

E03-S11 (SCRUM-176), created in Jira by the Product Owner on 12 October 2026
and delivered in #247, is now in the release and product backlogs with five
scenarios and test cases TC_E03S11_01 to _05. It fixes two gaps in E03-S07,
which stays Done (T-74): the Organiser could not edit the registration setup,
and the registration date labels were laid out wrongly.

## 18 October 2026: O-50 and O-51 resolved as team decisions

Recorded T-98 and T-99, closing O-50 and O-51. E09-S02/S04 now state that a
full selected Session follows the Pending decision path and has no per-Session
waitlist; the Event-level list remains available when combined Event capacity
is full. E02-S05 now records the accepted copy behavior: retain requirements
and Session structure, clear Event/Session dates and times, and do not copy
bookings, equipment reservations or registrations. Updated the corresponding
product/release backlog entries, canonical test case references, and the dated
Figma handoff note. These remain team decisions, not customer statements.

The 18 October entries were numbered T-98 and T-99 before merge because the
16 October PO-decision PR #293 already uses T-97. This preserves the earlier
identifier and decision date while keeping the 18 October decision wording and
date unchanged. The earlier draft identifiers in PR #316 were T-97 and T-98.

## 22 October 2026: PO interpretation of venue claim rule B (T-100)

The Product Owner approved a prospective interpretation of C-01, C-16, C-46,
C-60 and C-65: the first successfully accepted hold or request claims its
venue's buffered slot; later overlapping claims are refused while that claim is
active. Hold conversion keeps the same claim. Approval rechecks current
availability, concurrency and current buffers. C-109 continues to govern later
buffer edits: retain affected bookings and flag conflicts; do not release a
claim silently. Approval waits until the conflict is explicitly rejected,
withdrawn or replanned. This is a PO interpretation, not a new customer quote.

T-100 resolves the open choice recorded in #338 prospectively. It does not adopt
the first-approval proposal associated with #308; that proposal remains
untouched, and this addendum makes no claim that #308 has merged. Reconcile only
E06-S06 in both backlog views and its seven existing cases, plus the shared
contract and matching scaffold descriptions. Preserve E06-S03's multi-venue
semantics and all IDs, estimates, sprint assignments, owners and Done flags.
The decision does not rewrite migration 0016 or adopt migration 0021. Product
adoption, implementation, evidence and human review gates remain in force.

Regenerate the CAA 221026 backlog and test-case workbooks, refresh the legacy
test-case compatibility input from the generated workbook, rebuild the coverage
inventory, and regenerate the BDR Word export. Keep older dated exports and all
T-65 records as historical evidence.
## 24 October 2026: E05-S06 and E10-S05 aligned with the venue-loss decisions

E05-S06 (SCRUM-152) and E10-S05 (SCRUM-74) still carried the Week 7 defaults
for O-23 and O-24 because both were labelled Sprint 3 when the Week 9 answers
arrived, and active sprint scope was not edited (T-73). Neither story has been
started, so their criteria are updated in place (T-74) to decisions already
recorded; no decision is new or changed.

- E05-S06: an unavailability may be open-ended until lifted, with no buffers
  around it (T-80); a Confirmed event whose active booking is lost returns to
  Planning and is not cancelled (C-120, T-81); only the Coordinator is told at
  the loss (C-121); shortening or lifting restores a booking that was not
  replaced or cancelled (C-122). New Scenario 7 keeps a history of each edit
  and lift and notifies affected Coordinators on a lift (T-91).
- E10-S05: Scenario 1 returns a Confirmed event to Planning (T-81); Scenario 4
  notifies the Organiser and Attendees when the replacement is confirmed
  (C-121).
- Test cases follow: TC_E05S06_02 to _05 and TC_E10S05_01, _03 and _04 are
  updated, TC_E05S06_04 now checks an open-ended save instead of a refusal, and
  TC_E05S06_07 is added.
- C-111 also says affected existing bookings are flagged. Only its open-ended
  part had been used (T-80), so no story covered an unexpired Tentative hold
  inside a new unavailability. E05-S06 Scenario 2 now flags such a hold
  Conflicting without releasing it, Scenario 6 restores it (or marks it Expired
  if its expiry passed meanwhile), the booking contract's Conflicting
  transition includes holds, and TC_E05S06_08 is added.

One interpretation for review: a restored booking does not return its event
straight to Confirmed; the event follows E08-S04 Scenario 4.
## 26 October 2026: T-65/T-93 evidence enforcement

The T-65 execution-record schema remains the source of truth for runs used as
evidence, and T-93 remains the rule for hand-taken screenshots on manual runs.
The new `test-evidence` CI check and local pre-commit hook enforce those rules
for new records: PASS/FAIL rows need linked existing screenshots, screenshots
must be stored under the matching evidence folder, and the record plus images
must arrive together. Automated runs and SKIP/N/A rows do not require images;
old merged records are not rewritten.

## 30 October 2026: refused holds stop naming the other event (T-102)

The Product Owner answered yes to hiding the other event's name when a
tentative hold is refused, matching E06-S06 Scenario 2 and the existing
booking-request refusal. The hold refusal now gives only the occupied buffered
window. E06-S05 Scenario 2 and TC_E06S05_01 are reworded in both backlog views
and the case catalogue. E06-S05 is not reopened; its Done flag and earlier run
records stay as they are.

## 31 October 2026: date changes flag Technical Support staffing too (T-103)

The Product Owner answered yes to flagging Technical Support staffing when an
event's date or time changes, after the E08-S04 manual run showed a moved event
entering Safety Review with its support crew still booked for the old day.
E10-S02 is not Done, so Scenarios 5 and 6 are updated in place in both backlog
views and the story is re-estimated from 5 to 8 points. New and updated
E10-S02 test cases follow in the same branch.
