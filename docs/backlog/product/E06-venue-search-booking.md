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
- **BDR references**: C-01, C-16, C-17, C-37, C-46, C-60, T-20, T-49
- **Owner**:

### User story

As an Event Coordinator, I want to submit a venue booking request for an event so that Venue Staff can review it and decide whether the venue can be provided.

### Acceptance criteria

#### Scenario 1 — Request created as Pending

Given an event has recorded requirements and no pending request When I submit a booking request for a venue Then the request is created with status Pending, the venue calendar shows the period as Tentative, and the Venue Staff are notified

#### Scenario 2 — First request moves event to Planning

Given the event has status Approved When the first booking request for any of its events is submitted Then the event status becomes Planning

#### Scenario 3 — Second request for same event blocked

Given the event already has a pending booking request When I submit another for the same event Then submission is blocked and the existing pending request is identified

#### Scenario 4 — Venue taken by another event blocked

Given a venue is already Pending or Confirmed for another event over the same period When I submit a request for it Then submission is blocked and the conflict is explained

### Checklist

- Submit a booking request for an event using its recorded requirements
- Confirm the request is created as Pending and Venue Staff are notified
- Confirm the venue calendar shows the period as Tentative
- Confirm the event status moves from Approved to Planning on the first request
- Be blocked from holding more than one pending request for the same event
- Be blocked from requesting a venue already Pending or Confirmed for another event in that period
- View the status of each of my booking requests

## E06-S04 — Decide on a venue booking request

- **Sprint**:
- **Points**: 3
- **BDR references**: C-08, T-39
- **Owner**:

### User story

As a Venue Staff member, I want to approve or reject booking requests and record my reasoning so that Coordinators receive a clear, traceable decision.

### Acceptance criteria

#### Scenario 1 — Request approved and confirmed

Given a booking request is pending and the venue is free for the period When I approve it Then the booking becomes Confirmed, the venue calendar is updated and the Coordinator is notified

#### Scenario 2 — Rejected with reason and alternative

Given I reject a request When I record a reason and optionally suggest an alternative venue Then the Coordinator is notified with both, and can amend the request to the suggested alternative without restarting the search

#### Scenario 3 — Rejection without reason blocked

Given I attempt to reject without recording a reason When I confirm Then the rejection is blocked

### Checklist

- Approve a pending booking request for a free venue
- Confirm the booking becomes Confirmed and the calendar updates
- Reject a request with a recorded reason
- Be blocked from rejecting without a reason
- Suggest an alternative venue alongside a rejection
- Confirm the Coordinator can amend the request to the suggested venue without starting a new search
- Confirm the Coordinator is notified of either decision

## E06-S05 — Hold a venue tentatively

- **Sprint**:
- **Points**: 3
- **BDR references**: C-01, C-16, C-37, C-60, T-49
- **Owner**:

### User story

As an Event Coordinator, I want to place a tentative hold on a venue so that it is not taken by another event while the arrangements are still being finalised.

### Acceptance criteria

#### Scenario 1 — Tentative hold placed

Given a venue is free for the period When I place a tentative hold Then the calendar shows the period as Tentative and the hold is recorded against my event

#### Scenario 2 — Slot already held or booked

Given a venue already has a tentative hold or a confirmed booking for the period When I attempt to hold it for another event Then the hold is refused and the existing hold or booking is identified

#### Scenario 3 — Hold becomes a booking request

Given I hold a venue tentatively When I submit a booking request for that venue Then the hold becomes a pending booking request for the same period

#### Scenario 4 — Hold released

Given I hold a venue tentatively and no longer need it When I release the hold Then the period returns to Free on the calendar

### Checklist

- Place a tentative hold on a venue that is free for the period
- See the period shown as Tentative on the venue calendar
- Be refused when the slot already has a tentative hold or a confirmed booking for another event
- Convert a tentative hold into a booking request
- Release a tentative hold, returning the period to Free
- Confirm only one active hold or confirmed booking exists per venue and period

## E06-S06 — Prevent double-booking of a venue

- **Sprint**:
- **Points**: 5
- **BDR references**: C-46, T-22
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

### Checklist

- Be blocked from approving a request overlapping an existing confirmed booking
- See which existing booking is causing the conflict
- Confirm a competing pending request is flagged as conflicting once one is approved
- Confirm a simultaneous approval by another Venue Staff member fails safely
- Be told the venue has been taken when a simultaneous approval wins
- Confirm no venue ever holds two confirmed bookings over the same period
