# Backlog Decision Review (BDR)

ConnectSphere Event Planning and Venue Booking System  ·  IS212 (AY 2026/27 T1)

Version 5  ·  14 September 2026

## Purpose

This document holds every decision behind the backlog and the evidence for it. The backlogs themselves live in CONNECTSPHERE BACKLOGS CAA 140926.xlsx and contain story data only; each story there carries a Backlog Decision Reference pointing back to the entries here.

It exists to answer one question for any story or acceptance criterion: why is this here, and who decided it. Entries are separated into what the customer told us and what the team chose, because those carry different weight. Where the team chose, the entry says so plainly rather than presenting an assumption as a requirement.

## What changed in version 5

The team worked through the open assumptions in section C and answered eight of them. Six confirmed what the backlog already assumed and changed nothing. Two produced edits.

Registration lists now show name, email address and contact number rather than name and email alone (O-05, amends T-32). E09-S07 and E09-S01 updated. No schema change was needed: contact number is already held on the user record, so nothing additional is collected at registration.

A three-second response target was adopted for venue search, opening the venue availability calendar, and submitting a registration (O-01, T-51). The customer confirmed twice that no benchmarks exist, so the figure is ours. It is recorded once in the Definition of Done rather than repeated as an acceptance criterion, following the Week 4 guidance that cross-cutting quality expectations are set once. It supersedes the six-second figures in the notes on E13-S01 and E13-S02.

Six assumptions were confirmed unchanged and closed: O-02 lockout at five attempts with an emailed reset link, O-06 mandatory rejection reason, O-09 Rejected is terminal, O-16 no waiting-list hold window, O-14 the fuller status vocabulary, and O-17 the design scale of roughly 500 internal staff.

Six items remain open, all on stories outside Release 1: O-08, O-11, O-12, O-13, O-18 and O-19. Each will be decided if and when its story is scheduled.

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

C-01 to C-64 — customer clarifications, taken verbatim from the Week 2 and Week 4 Q&A spreadsheets and numbered in their own row order so any entry can be checked against the source file.

T-01 to T-50 — team decisions, each naming the clarification it follows from or the gap it closes.

O-01 to O-19 — questions still open, or closed with the answer recorded against them.

B-01 to B-11 — boundary rulings from the story overlap audit and the test-case audit.

## Canonical event status model

Every acceptance criterion uses these names and no others.

Draft → Submitted → Under Review → Approved → Planning → Confirmed → Completed

Under Review ↔ Awaiting Clarification (E03-S02, returns to Under Review when the Organiser responds)

Under Review → Rejected (E03-S03, terminal and read-only)

Planning or Confirmed → Cancelled (E10-S04, terminal and read-only)

Confirmed → Planning (E08-S04, manual reversion only, never automatic — confirmed again by C-61)

Transition owners: E02-S01 sets Submitted. E03-S01 sets Under Review. E03-S02 sets Awaiting Clarification. E03-S03 sets Approved or Rejected. E06-S03 sets Planning on the first venue booking request. E08-S03 sets Confirmed. E08-S05 sets Completed. E10-S04 sets Cancelled.

This diverges from C-49, in which the customer named four statuses. The divergence is deliberate and is recorded as T-01 and O-14.


## Section files

- [A. Customer clarifications](./A-customer-clarifications.md)
- [B. Team decisions](./B-team-decisions.md)
- [C. Open questions and standing assumptions](./C-open-questions.md)
- [D. Story boundary rulings](./D-boundary-rulings.md)
- [E. Out of the first release](./E-out-of-release-1.md)
- [F. Core feature coverage](./F-core-feature-coverage.md)
- [G. Change log](./G-change-log.md)
