# Backlog Decision Review (BDR)

ConnectSphere Event Planning and Venue Booking System  ·  IS212 (AY 2026/27 T1)

Version 9  ·  13 October 2026

## Purpose

This document holds every decision behind the backlog and the evidence for it. The backlogs themselves are canonical Markdown under `docs/backlog/`; generated workbook `CONNECTSPHERE BACKLOGS CAA 161026.xlsx` contains story data, with each story carrying a Backlog Decision Reference pointing back to the entries here.

It exists to answer one question for any story or acceptance criterion: why is this here, and who decided it. Entries are separated into what the customer told us and what the team chose, because those carry different weight. Where the team chose, the entry says so plainly rather than presenting an assumption as a requirement.

## 15 October 2026 clarification addendum (references corrected 16 October)

T-94 to T-96 record the agreed E06-S03 Pending withdrawal, staff notification,
decision-race and suggested-venue retry/chain rules. These are requirements for a
follow-up to merged #274, not delivered functionality. The Product Owner's future
Confirmed-primary cancellation clarification is explicitly outside E06-S03.
The Product Owner confirmed on 16 October that the new withdrawal cases remain
in E06-S03's current Sprint 3 plan, with remaining work to be completed and
anything unfinished recorded honestly at sprint close. This does not claim delivery.
See [team decisions](B-team-decisions.md) and [change log](G-change-log.md).

## What changed in version 9

Applied the Week 9 decisions to eligible future backlog stories and recorded two residual design assumptions as O-50 and O-51. E04-S02 and E02-S05 are included in Release 1; E02-S07 and E07-S08 carry new date-horizon and Session-linked equipment behavior without reopening completed stories. Sprint 3 criteria remain deferred until its close under T-73. Canonical acceptance cases, ADRs, target schema/contracts, architecture views and repository UI/UX handoff are aligned in the stacked follow-ups. Actual Figma frames and application code remain downstream; Jira reconciliation waits until canonical Markdown merges.

Release 1 currently contains 60 stories and 173 estimated points. Four stories have no sprint assignment; E02-S07 and E07-S08 also have no estimate pending planning. The total excludes estimates for those two stories and may change after planning. Eight items remain open: O-08, O-11, O-12, O-13, O-18, O-19, O-50 and O-51; the first six are outside Release 1, while O-50/O-51 affect the assumptions for E09-S02/S04 and E02-S05.

## What changed in version 8

Recorded the team's selections from the Week 9 impact review as T-79 to T-91 and reconciled O-10, O-22 to O-24, O-34, O-37 to O-49. The decisions restore Sessions for Release 1, choose C-119's open-ended block behavior despite its conflict with C-111, define venue-loss and automatic safety-review transitions, set registration/capacity behavior, update role cardinality and hold/block policies, set a two-year date limit, close obsolete change requests, and add E02-S05 to Release 1. Team choices are labelled separately from customer answers.

The canonical lifecycle returns a Confirmed event to Planning automatically when venue loss triggers change review; completed arrangements enter Safety Review automatically. The safety record includes both the team's per-factor checklist and the decision/comments required by C-134. One event registration can select multiple Sessions while both per-Session and combined event capacities are enforced. Open-ended blocks follow T-80 as a team resolution, preserving C-111's conflicting answer in the source record. Generated exports follow their Markdown sources; implementation and Jira reconciliation follow the source-of-truth workflow.

## What changed in version 6

The customer issued the Week 7 Customer Changes document: six changes, all mandatory for Release 1, with the statement that no further changes are anticipated. They are recorded verbatim as C-65 to C-70. Four of the six reverse something the customer said in Week 2 or Week 4, so the earlier rows (C-01, C-16, C-18, C-38, C-41, C-55, C-56, C-60) now say which Week 7 entry supersedes them rather than being edited.

Setup and turnaround time returns (C-65, T-66). E05-S05 is back in Release 1; buffers are per-venue attributes and every availability and conflict check uses the buffered occupancy window. Bookings that conflict under the new rule are flagged, never released.

A venue may be made unavailable over confirmed bookings (C-66, T-67). E05-S04's refusal of such a block is withdrawn, but as a new E05 story rather than an edit to E05-S04, which is in the Sprint 2 sprint backlog. E10-S05 returns to Release 1.

An event may hold several venue bookings (C-67, T-68). T-20 is retired and E06-S03 Scenario 3 inverted. Each booking is checked independently; the one-hold-per-venue-slot rule from C-60 is unaffected.

Tentative holds expire (C-68, T-69). T-49 is amended: every hold carries an expiry date and time, the system releases expired holds, and the Coordinator is told before and at expiry.

Two roles are added (T-72). The Event Coordinator Lead replaces auto-assignment with an unassigned queue; T-14 is retired and T-15 amended (C-69, T-70). E03-S01, which delivered auto-assignment, stays Done; the queue is new stories. The Safety Officer gates the event between Planning and Confirmed through a new Safety Review status; this placement is interim and is the first Q&A question (C-70, T-71, O-39).

The customer Q&A that would resolve the document's ambiguities may fall after Sprint 3 planning. T-73 records the team's process: write the stories now against recorded defaults, carry every ambiguity as O-20 to O-44 with its default and its Q&A question, tag dependent criteria "(assumes O-xx)", and pull into Sprint 3 first the stories with no High-priority open item. T-74 applies the Week 7 guide's three scenarios: a Done story stays Done and new behaviour on it is a new story; an incomplete story is updated in place; a story is reopened only when an original criterion turns out unsatisfied, which no Week 7 change does. Each of C-65 to C-70 is classified as new requirement, clarification or correction in its row.

## What changed in version 5

The team worked through the open assumptions in section C and answered eight of them. Six confirmed what the backlog already assumed and changed nothing. Two produced edits.

Registration lists now show name, email address and contact number rather than name and email alone (O-05, amends T-32). E09-S07 and E09-S01 updated. No schema change was needed: contact number is already held on the user record, so nothing additional is collected at registration.

A three-second response target was adopted for venue search, opening the venue availability calendar, and submitting a registration (O-01, T-51). The customer confirmed twice that no benchmarks exist, so the figure is ours. It is recorded once in the Definition of Done rather than repeated as an acceptance criterion, following the Week 4 guidance that cross-cutting quality expectations are set once. It supersedes the six-second figures in the notes on E13-S01 and E13-S02.

Six assumptions were confirmed unchanged and closed: O-02 lockout at five attempts with an emailed reset link, O-06 mandatory rejection reason, O-09 Rejected is terminal, O-16 no waiting-list hold window, O-14 the fuller status vocabulary, and O-17 the design scale of roughly 500 internal staff.

As of version 8, six items remained open on stories outside Release 1: O-08, O-11, O-12, O-13, O-18 and O-19. Version 9 adds the two explicit Week 9 design assumptions O-50/O-51 listed above.

Release 1 is unchanged at 47 stories and 155 points. The architecture, C4 model and database schema required no changes.

## What changed in version 4

The customer answered ten further questions in Week 4 (C-55 to C-64). Three of those answers changed the shape of the release rather than merely confirming it.

The sessions model was withdrawn (C-62, T-48). A multi-session event is now set up as several separate events. This rewrote 29 of the 47 release stories, removed E04-S02 from Release 1, and retired ADR-004 and ADR-005 along with the SESSIONS table and its composite foreign keys. Multi-session was never among the twenty core features, so the release is now better aligned with them, not worse.

Tentative venue holding returned to Release 1 (C-60, T-49). E06-S05 is back in Sprint 3 and the venue calendar state reverts from Pending to Tentative, amending T-17. Only one active hold or confirmed booking may exist per venue and period, which independently confirms T-20.

Registration capacity is now governed by the booked venue capacity rather than an Organiser limit (C-58), and VIPs may be added manually beyond normal registration while total registrations stay within venue capacity (T-50). This amends T-31.

Coordinator reassignment gained an acceptance step (C-56). It is agreed offline, the assigned Coordinator initiates it, and the incoming Coordinator must accept before ownership moves. E03-S01 grew from four scenarios to six.

Two backlog edits logged in version 3 were applied: E09-S04 Scenario 1 was reworded to remove an implied queue position (T-46), and the duplicated over-subscription scenario was removed from E09-S02 (T-47, B-11).

Five standing assumptions closed on customer evidence: O-03, O-04, O-07, O-10 and O-15.

Release 1 now stands at 47 stories and 155 points across four sprints.

## How to read the reference codes

C-01 to C-70 — customer clarifications. C-01 to C-64 are taken from the Week 2 and Week 4 Q&A spreadsheets and numbered in their own row order so any entry can be checked against the source file; C-65 to C-70 are the six items of the Week 7 Customer Changes document, in document order. C-71 to C-136 are the Week 9 Q&A rows in workbook order.

T-01 to T-91 — team decisions, each naming the clarification it follows from or the gap it closes.

O-01 to O-49 — questions and standing assumptions, including items closed with the answer recorded against them. O-20 to O-44 were raised from Week 7 and are reconciled against Week 9; O-45 to O-49 record remaining Week 9 gaps and design dependencies.

B-01 to B-11 — boundary rulings from the story overlap audit and the test-case audit.

## Canonical event status model

Every acceptance criterion uses these names and no others.

Draft → Submitted → Under Review → Approved → Planning → Safety Review → Confirmed → Completed

Under Review ↔ Awaiting Clarification (E03-S02, returns to Under Review when the Organiser responds)

Under Review → Rejected (E03-S03, terminal and read-only)

Planning or Confirmed → Cancelled (E10-S04, terminal and read-only)

Confirmed → Planning (E08-S04 for a Coordinator's deliberate reversion; venue loss automatically triggers Planning/change review and Coordinator notification under C-120/T-81.)

Planning → Safety Review automatically after every required venue and technical arrangement is confirmed (C-132, T-82).

Safety Review → Confirmed (Safety Officer approves) or Safety Review → Planning (Safety Officer rejects or requests changes, with a mandatory reason; never cancels). C-131 confirms the Safety Check sits between Planning and Confirmed.

Transition owners: E02-S01 sets Submitted. E03-S01 sets Under Review (the Event Coordinator Lead assigns from the unassigned queue, T-70/T-83). E03-S02 sets Awaiting Clarification. E03-S03 sets Approved or Rejected. E06-S03 sets Planning on the first venue booking request. E08 arrangement completion automatically enters Safety Review; the Safety Officer's decision sets Confirmed or returns the event to Planning. E08-S04 remains the Coordinator's deliberate reversion path. Venue loss also automatically returns a Confirmed event to Planning (T-81). E08-S05 sets Completed. E10-S04 sets Cancelled.

This diverges from C-49, in which the customer named four statuses. The divergence is deliberate and is recorded as T-01 and O-14. Safety Review is the team's name for the stage the customer places between Planning and Confirmed (C-131). The system records the Safety Officer's decision and comments as C-134 requires and also keeps the team's in-system checklist for each factor (T-82); the checklist is not presented as a customer requirement.


## Section files

- [A. Customer clarifications](./A-customer-clarifications.md)
- [B. Team decisions](./B-team-decisions.md)
- [C. Open questions and standing assumptions](./C-open-questions.md)
- [D. Story boundary rulings](./D-boundary-rulings.md)
- [E. Out of the first release](./E-out-of-release-1.md)
- [F. Core feature coverage](./F-core-feature-coverage.md)
- [G. Change log](./G-change-log.md)
