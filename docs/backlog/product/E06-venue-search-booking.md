# E06 — Venue Search & Booking

## E06-S01 — Search for suitable venues

- **Sprint**:
- **Points**: 5
- **BDR references**: B-08
- **Owner**:

### User story

As an Event Coordinator, I want to search venues by date, time, attendance, capacity, layout, accessibility and facilities so that I can shortlist options for an event quickly.

### Acceptance criteria

#### Scenario 1 — Matching venues listed

Given venues exist that match all my criteria and are available When I run the search Then those venues are listed with their capacity, layouts and facilities

#### Scenario 2 — Near matches show failing criteria

Given no venue matches all criteria When I run the search Then near matches are returned rather than an empty result

#### Scenario 3 — Undersized venue marked unsuitable

Given a venue is available but its capacity is below the event's expected attendance When results are displayed Then it is excluded or clearly marked as unsuitable

#### Scenario 4 — Blocked or booked venues excluded

Given a venue is blocked or already confirmed the event's period When I run the search Then it does not appear as available

### Checklist

- Search by date, time, expected attendance, location, capacity, accessibility, layout and required facilities
- See matching venues with their capacity, layouts and facilities
- See near matches returned rather than an empty result when nothing matches fully
- Confirm venues below the event's attendance are excluded or marked unsuitable
- Confirm blocked or already-confirmed venues do not appear as available
- Apply several filters together in one search

## E06-S02 — Check venue suitability against event requirements

- **Sprint**:
- **Points**: 3
- **BDR references**: C-06, T-13, T-21, B-08
- **Owner**:

### User story

As an Event Coordinator, I want the system to compare a venue against the event's recorded requirements so that I do not request a venue that cannot meet them.

### Acceptance criteria

#### Scenario 1 — Suitability shown for the event

Given an event has recorded requirements When I view a venue in the context of the event Then a suitability status is shown for the event

#### Scenario 2 — Failing requirements named

Given a venue fails one or more recorded requirements When I view it Then it is marked unsuitable and every failing requirement is named

#### Scenario 3 — All requirements met

Given a venue meets all recorded requirements for the event When I view it Then it is marked suitable

#### Scenario 4 — Unsuitable venue may still be requested

Given a venue is marked unsuitable When I submit a booking request for it anyway Then the request is accepted and the unsuitability is shown to the Venue Staff for their decision

### Checklist

- View a suitability status for a venue against a specific event
- See the venue marked unsuitable when it fails one or more recorded requirements
- See every failing requirement named
- See the venue marked suitable when it meets all recorded requirements
- Confirm suitability is advisory and does not itself block a booking request

## E06-S03 — Request a venue booking

- **Sprint**:
- **Points**: 3
- **BDR references**: C-01, C-16, C-17, C-37, C-46, C-60, T-20, T-49, C-65, T-66, C-67, T-68, T-78, O-27, O-29, O-30
- **Owner**:

### User story

As an Event Coordinator, I want to submit a venue booking request for an event so that Venue Staff can review it and decide whether the venue can be provided.

### Acceptance criteria

#### Scenario 1 — Request created as Pending

Given an event has recorded requirements and no pending request When I submit a booking request for a venue Then the request is created with status Pending, the venue calendar shows the period as Tentative, and the Venue Staff are notified

#### Scenario 2 — First request moves event to Planning

Given the event has status Approved When its first booking request is submitted Then the event status becomes Planning

#### Scenario 3 — Several venue bookings for one event

Given the event already has a Pending or Confirmed venue booking When I submit a request for another venue, or for the same venue over a different period, for the same event Then the request is created as Pending alongside the existing bookings, each booking keeps its own status, the event lists all of them, and withdrawing or changing one booking leaves the others untouched (C-67, T-68; replaces the earlier rule that blocked a second request, T-20 retired)

#### Scenario 3a — Each booking carries its own purpose and headcount

Given I am requesting one of several venues for an event When I submit the request Then I may record a purpose (for example "Main programme" or "Breakout A") and an expected headcount for that booking; suitability and capacity checks for that venue use the booking's headcount when present and the event's expected attendance otherwise (confirmed O-27, T-78)

#### Scenario 3b — Bookings may cover different windows inside the event

Given an event runs 09:00 to 18:00 When I request a breakout room for 14:00 to 16:00 Then the request is accepted; a request whose period falls outside the event's start and end is refused. Setup and turnaround buffers may extend beyond the event period and still reserve the venue (confirmed O-29, T-78)

#### Scenario 3c — One booking is the primary venue

Given an event has more than one Confirmed venue booking When I view the event Then the first booking to be Confirmed is marked primary by default and I may mark a different Confirmed booking as primary; Pending bookings cannot be primary; the primary venue is the one shown to Attendees (confirmed O-30, T-78)

#### Scenario 3d - Assigned Coordinator and planning status required (T-78)

Given I am the assigned Event Coordinator and the event is Approved or Planning When I submit a valid booking request Then submission is permitted. Other actors or event statuses are refused. A Confirmed event needing a replacement must first return to Planning through the authorised reversion workflow.

#### Scenario 4 — Venue taken by another event blocked

Given a venue is already Pending or Confirmed for another event over the same period When I submit a request for it Then submission is blocked and the conflict is explained

#### Scenario 5 — Request conflicts through the buffer

Given a venue is Confirmed for another event 10:00 to 12:00 and has a turnaround time of 45 minutes When I submit a request for 12:30 to 14:00 Then submission is blocked and the conflict names the other event's buffered window, 09:30 to 12:45 (C-65, T-66)

### Checklist

- Submit a booking request only as the assigned Event Coordinator while the event is Approved or Planning, using its recorded requirements (T-78)
- Confirm the request is created as Pending and Venue Staff are notified
- Confirm the venue calendar shows the period as Tentative
- Confirm the event status moves from Approved to Planning on the first request
- Hold several venue bookings, Pending or Confirmed, for one event, each with an optional purpose and headcount, and mark one as primary (C-67; confirmed O-27 and O-30, T-78)
- Be blocked from requesting a venue already Pending or Confirmed for another event in that period, counting that venue's setup and turnaround time (C-65)
- View the status of each of my booking requests

## E06-S04 — Decide on a venue booking request

- **Sprint**: Sprint 3
- **Points**: 3
- **BDR references**: C-08, T-39, C-65, T-66, T-75, T-76
- **Owner**: Le Xin

### User story

As a Venue Staff member, I want to approve or reject booking requests and record my reasoning so that Coordinators receive a clear, traceable decision.

### Acceptance criteria

#### Scenario 1 — Request approved and confirmed

Given a booking request is pending and the venue is free for the period When I approve it Then the booking becomes Confirmed, the venue calendar is updated and the Coordinator is notified

#### Scenario 2 — Rejected with reason and alternative

Given I reject a request When I record a reason and optionally suggest an alternative venue Then the Coordinator is notified with both, and can amend the request to the suggested alternative without restarting the search

#### Scenario 3 — Rejection without reason blocked

Given I attempt to reject without recording a reason When I confirm Then the rejection is blocked

#### Scenario 4 — Approval checks the buffered window

Given approving a pending request would make its buffered occupancy window overlap another Confirmed booking's buffered window on the same venue When I approve it Then approval is blocked and the conflicting booking is identified, even if the two advertised event times do not overlap (C-65, T-66)

#### Scenario 5 — Booking decision recorded

Given a venue booking is approved, rejected or released When the action completes Then an entry is recorded with the actor, the action, the affected records and the time

### Checklist

- Approve a pending booking request for a free venue
- Confirm the booking becomes Confirmed and the calendar updates
- Reject a request with a recorded reason
- Be blocked from rejecting without a reason
- Suggest an alternative venue alongside a rejection
- Confirm the Coordinator can amend the request to the suggested venue without starting a new search
- Confirm the Coordinator is notified of either decision
- Record each booking approval, rejection and release with actor, action, affected booking/event and time in the same transaction as the action
- Verify all three booking-log outcomes under TC_E06S04_05, TC_E06S04_06 and TC_E06S04_07

### Audit ownership (T-76)

Scenario 5 transfers E14-S02's former Scenario 3 to the story that implements
booking decisions. Release logging remains required and is verified through the
workflow that actually releases the booking, such as event cancellation in
E10-S04; this does not add a standalone release screen or permission. The Event
Coordinator inspects entries on an event they may already view (T-75).
E14-S02 completion no longer waits on these booking workflows. The original
3-point estimate remains unchanged; this decision does not claim delivery.

## E06-S05 — Hold a venue tentatively

- **Sprint**:
- **Points**: 5
- **BDR references**: C-01, C-16, C-37, C-60, T-49, C-65, T-66, C-68, T-69, T-78, O-31, O-32, O-33, O-34
- **Owner**:

### User story

As an Event Coordinator, I want to place a tentative hold on a venue so that it is not taken by another event while the arrangements are still being finalised, and I want the hold to expire at a known time so that venues are not reserved indefinitely.

The expiry scenarios come from the Week 7 Customer Changes (C-68, T-69) and reverse the earlier position that no expiry was required (C-01, C-16, C-60, T-49). Scenarios tagged "(assumes O-xx)" are written to the default recorded in `docs/bdr/C-open-questions.md`.

### Acceptance criteria

#### Scenario 1 — Tentative hold placed

Given a venue is free for the period When I place a tentative hold Then the calendar shows the period as Tentative, the hold is recorded against my event, and the hold carries an expiry date and time set to 48 hours from creation by default, which Venue Staff may change on the hold (assumes O-31)

#### Scenario 2 — Slot already held or booked

Given a venue already has a tentative hold or a confirmed booking for the period When I attempt to hold it for another event Then the hold is refused and the existing hold or booking is identified

#### Scenario 3 — Hold becomes a booking request

Given I hold a venue tentatively When I submit a booking request for that venue Then the hold becomes a pending booking request for the same period and the expiry no longer applies, because submitting the request is the action that completes the hold; an expired hold cannot be converted (confirmed O-32, T-78)

#### Scenario 4 — Hold released

Given I hold a venue tentatively and no longer need it When I release the hold Then the period returns to Free on the calendar

#### Scenario 5 — Hold occupies the buffered window

Given a venue has a setup time of 30 minutes and a turnaround time of 45 minutes When I hold it tentatively for 10:00 to 12:00 Then the hold occupies 09:30 to 12:45, the calendar shows that window as Tentative, and another hold or booking request overlapping any part of it is refused (C-65, T-66)

#### Scenario 6 — Hold expires and frees the venue

Given my hold's expiry date and time has passed and I have not submitted a booking request for it When the expiry job next runs Then the hold's status becomes Expired, the period returns to Free on the calendar, the venue can be held or requested by any event, and an Expired hold is never counted as a Confirmed or Pending booking anywhere, including the E08-S03 confirmation gate (C-68, T-69)

#### Scenario 7 — Coordinator told before and at expiry

Given my hold will expire in 24 hours When that moment passes Then I receive an in-app and email reminder naming the venue, the event and the expiry time; and Given the hold expires When the expiry job runs Then I receive an in-app and email notice that it has expired and the venue is free (assumes O-33)

#### Scenario 8 — Venue Staff may extend a hold

Given a hold has not yet expired When Venue Staff set a later expiry date and time Then the new expiry applies, the extension is recorded in the activity log with who made it, and the reminder is rescheduled; an expired hold cannot be extended and must be placed again (assumes O-34)

#### Scenario 9 — Expiry exactly at the boundary

Given a hold expires at 10:00:00 When the expiry job runs at 09:59:59 Then the hold is still Tentative, and when it runs at 10:00:00 or later Then the hold is Expired

### Checklist

- Place a tentative hold on a venue that is free for the period
- See the period shown as Tentative on the venue calendar
- Be refused when the slot already has a tentative hold or a confirmed booking for another event
- Convert a tentative hold into a booking request
- Release a tentative hold, returning the period to Free
- Confirm only one active hold or confirmed booking exists per venue and period
- See the expiry date and time on every hold, defaulting to 48 hours after creation (assumes O-31)
- Confirm an expired hold frees the venue and is never treated as a booking
- Receive a reminder before and a notice at expiry (assumes O-33)
- Confirm Venue Staff can extend an unexpired hold and the extension is logged (assumes O-34)

## E06-S06 — Prevent double-booking of a venue

- **Sprint**:
- **Points**: 5
- **BDR references**: C-46, T-22, C-65, T-66, C-67, T-68
- **Owner**:

### User story

As a Venue Staff member, I want to be blocked from approving a booking that overlaps an existing confirmed booking for the same venue so that a venue is never committed to two events at once.

### Acceptance criteria

#### Scenario 1 — Overlapping approval blocked

Given a venue has a confirmed booking When I attempt to approve another request overlapping that period Then approval is blocked and the conflicting booking is identified

#### Scenario 2 — Competing request flagged

Given two pending requests cover the same venue and overlapping times When I approve one of them Then the other is flagged as conflicting and cannot be approved until the conflict is resolved

#### Scenario 3 — Simultaneous approval fails safely

Given another Venue Staff member approves a conflicting request moments before me When my approval is processed Then it fails and I am told the venue has just been taken

#### Scenario 4 — Buffered windows are what must not overlap

Given two pending requests on one venue whose advertised times do not overlap but whose buffered occupancy windows do When both are approved at the same moment Then at most one approval succeeds and the other fails safely, because the database-level conflict check operates on the buffered window (C-65, T-66, ADR-003)

#### Scenario 5 — Conflicts are per venue, not per event

Given one event has Pending requests on two different venues over the same period When both are approved Then both become Confirmed, because double-booking is detected per venue and an event may legitimately occupy several venues at once (C-67, T-68)

### Checklist

- Be blocked from approving a request overlapping an existing confirmed booking
- See which existing booking is causing the conflict
- Confirm a competing pending request is flagged as conflicting once one is approved
- Confirm a simultaneous approval by another Venue Staff member fails safely
- Be told the venue has been taken when a simultaneous approval wins
- Confirm no venue ever holds two confirmed bookings over the same period
