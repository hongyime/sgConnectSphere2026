# E09 — Attendee Registration

## E09-S01 — Register for an event

- **Sprint**: Sprint 4
- **Points**: 5
- **BDR references**: C-35, T-48
- **Owner**:

### User story

As an Attendee, I want to register for a confirmed event so that my place is reserved and I receive the event information.

### Acceptance criteria

#### Scenario 1 — Place reserved in an open event

Given an event is Confirmed, registration is open and places remain When I submit the required registration information Then my place is reserved and I receive a confirmation containing the event details

#### Scenario 2 — Duplicate registration prevented

Given I have already registered for the event When I try to register again Then I am told I am already registered and no duplicate registration is created

#### Scenario 3 — Missing fields identified

Given a required registration field is empty When I submit Then registration is blocked and the missing fields are identified

#### Scenario 4 — Unconfirmed event refused

Given an event is not Confirmed When I attempt to register Then registration is refused

### Checklist

- Register for a confirmed event
- Provide name, email address and contact number as the required registration information
- Receive a confirmation containing the event details
- Be told I am already registered rather than creating a duplicate
- Be blocked with missing fields identified when required information is absent
- Be refused registration for an event that is not Confirmed

## E09-S02 — Enforce registration capacity

- **Sprint**: Sprint 4
- **Points**: 3
- **BDR references**: C-05, C-58, T-30, T-31, T-50, B-11
- **Owner**:

### User story

As an Event Organiser, I want registration to stop at the booked venue's capacity so that more people do not register than the venue can hold.

### Acceptance criteria

#### Scenario 1 — Venue capacity enforced

Given the event's capacity is the booked venue's capacity When registrations reach that number Then further registrations are refused

#### Scenario 2 — Simultaneous final registration

Given one place remains When two Attendees submit registrations at the same moment Then only one succeeds and the other is told the event is full

#### Scenario 3 — Full event offers the waiting list

Given the event is full When an Attendee opens the registration page Then registration is closed and the waiting list is offered where it is enabled

#### Scenario 4 — VIP added beyond normal registration

Given normal registration is full and total registrations remain below the booked venue's capacity When the Event Coordinator adds a VIP attendee manually Then the registration is created and recorded as a manual addition

#### Scenario 5 — VIP blocked at venue capacity

Given total registrations already equal the booked venue's capacity When the Event Coordinator attempts to add a VIP manually Then the addition is blocked

### Checklist

- Confirm registration is refused once the booked venue's capacity is reached
- Confirm a simultaneous final registration is handled without over-booking
- Confirm the waiting list is offered when the event is full and the list is enabled
- Add a VIP attendee manually when normal registration is full
- Be blocked from adding a VIP once total registrations equal venue capacity
- Confirm a manual addition is distinguishable from a normal registration

## E09-S03 — Control the registration period

- **Sprint**: Sprint 4
- **Points**: 3
- **BDR references**: C-24, C-44, T-42
- **Owner**:

### User story

As an Event Organiser, I want to set when registration opens and closes, and when withdrawal closes, so that Attendees can act only during the permitted windows.

### Acceptance criteria

#### Scenario 1 — Before registration opens

Given the registration opening date has not been reached When an Attendee views the event Then registration is shown as not yet open and the opening date is stated

#### Scenario 2 — After registration closes

Given the registration closing date has passed When an Attendee tries to register Then registration is refused

#### Scenario 3 — Closing date after event start warned

Given I set a closing date that falls after the event has started When I save Then I am warned and asked to confirm this is intended

#### Scenario 4 — Waiting list enabled

Given I enable the waiting list for an event When an event becomes full Then Attendees are offered the waiting list

### Checklist

- Set registration opening and closing dates
- Set a withdrawal deadline
- Enable or disable the waiting list for the event
- Confirm registration is refused outside the permitted window
- Confirm the opening date is shown to Attendees before registration opens
- Be warned when setting a closing date after the event has started

## E09-S04 — Join the waiting list

- **Sprint**: Sprint 4
- **Points**: 5
- **BDR references**: C-23, T-33, T-46, B-10
- **Owner**:

### User story

As an Attendee, I want to join the waiting list when an event is full so that I can still attend if a place is released.

### Acceptance criteria

#### Scenario 1 — Joined a full event's list

Given an event is full and the waiting list is enabled When I join the waiting list Then I am added and told I will be notified when a place is released

#### Scenario 2 — Released place notified to all

Given a place is released in an event with a waiting list When the place becomes available Then all waitlisted Attendees are notified and the place is claimed on a first-come, first-served basis

#### Scenario 3 — Claimed place leaves the list

Given I claim a released place When my registration completes Then I am removed from the waiting list

#### Scenario 4 — Disabled list offers nothing

Given the waiting list is disabled for an event When the event is full Then no waiting list is offered

### Checklist

- Join the waiting list for a full event where the list is enabled
- See confirmation that I have joined
- Receive a notification when a place is released
- Claim a released place on a first-come, first-served basis
- Leave the waiting list
- Confirm no waiting list is offered when the Organiser has disabled it

## E09-S05 — Withdraw my registration

- **Sprint**: Sprint 4
- **Points**: 3
- **BDR references**: C-24, T-48, B-10
- **Owner**:

### User story

As an Attendee, I want to withdraw my registration so that my place is released to someone else.

### Acceptance criteria

#### Scenario 1 — Registration withdrawn

Given I am registered and the withdrawal deadline has not passed When I withdraw Then my registration is cancelled and the place becomes available again

#### Scenario 2 — Withdrawal after deadline refused

Given the withdrawal deadline has passed When I try to withdraw Then I am told withdrawal has closed and given a contact for assistance

### Checklist

- Withdraw my registration before the deadline
- Confirm the released place becomes available again
- Be refused after the withdrawal deadline, with a contact provided

## E09-S06 — Record attendance

- **Sprint**: Sprint 4
- **Points**: 3
- **BDR references**: C-45
- **Owner**:

### User story

As an Event Coordinator, I want to record which registered Attendees actually attended the event so that registration and attendance can be distinguished.

### Acceptance criteria

#### Scenario 1 — Attendance marked after completion

Given an event has status Completed When I mark an Attendee as attended for an event Then their record shows attended and the registration figure is unchanged

#### Scenario 2 — Registered but not attended

Given a registered Attendee did not attend When the event is Completed Then they are shown as registered but not attended

#### Scenario 3 — Recording before completion blocked

Given an event is not yet Completed When I try to record attendance Then the action is blocked

### Checklist

- Mark a registered Attendee as attended for a specific event
- Confirm the registration figure is unchanged by attendance recording
- See Attendees who registered but did not attend distinguished from those who did
- Be blocked from recording attendance before the event is Completed
- View registration and attendance counts side by side for the event

## E09-S07 — View registrations for my event

- **Sprint**: Sprint 4
- **Points**: 1
- **BDR references**: C-26, T-32, O-05
- **Owner**:

### User story

As an Event Organiser, I want to view the list of Attendees registered for my event so that I can plan for the numbers attending the event.

### Acceptance criteria

#### Scenario 1 — Registrations grouped by event

Given Attendees have registered for my event When I open its registration list Then I see each Attendee's name, email address and contact number

#### Scenario 2 — Counts and remaining capacity

Given I open the registration list When it is displayed Then the registered count and remaining capacity are shown for the event

#### Scenario 3 — Unmanaged event refused

Given an event does not belong to my client organisation When I attempt to open its registration list Then access is refused

#### Scenario 4 — Waitlist shown separately

Given a waiting list exists for an event When I view the list Then waitlisted Attendees are shown separately from registered Attendees

### Checklist

- View registered Attendees for an event I manage, grouped by event
- See each Attendee's name, email address and contact number, and no other personal data
- See registered count and remaining capacity for the event
- See waitlisted Attendees separately from registered ones
- Be refused access to registration lists for events I do not manage
