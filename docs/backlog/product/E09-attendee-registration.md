# E09 — Attendee Registration

## E09-S01 — Register for an event

- **Sprint**:
- **Points**: 5
- **BDR references**: C-35, C-67, C-97, C-107, T-68, T-78, T-79, T-85
- **Owner**:

### User story

As an Attendee, I want to register once for a confirmed Event and select the Sessions I will attend so that my place is reserved across the Event I chose.

### Acceptance criteria

#### Scenario 1 — Place reserved in an open Event

Given an Event is Confirmed, registration is open, and selected Sessions have capacity When I submit the required registration information and select one or more Sessions Then one active Event-level registration records those Sessions and I receive a confirmation with the Event and selected Session details

#### Scenario 2 — One active registration per account and Event

Given I already have an active registration for an Event When I attempt to submit another registration for that Event Then ConnectSphere tells me I am already registered and does not create a second active registration; selecting multiple Sessions remains part of the existing registration

#### Scenario 3 — Missing fields identified

Given a required registration field is empty When I submit Then registration is blocked and the missing fields are identified

#### Scenario 4 — Unconfirmed Event refused

Given an Event is not Confirmed When I attempt to register Then registration is refused

#### Scenario 5 — Event and Session venue information shown

Given a Confirmed Event has one or more confirmed venue bookings When I view registration Then the Event summary shows its primary venue and the selected Session details show their own confirmed venues; venues are not separate registrations (C-67, T-78, T-79)

### Checklist

- Register once for a Confirmed Event and select one or more Sessions
- Receive one confirmation with Event and selected Session details
- Be prevented from creating a second active registration for the same account and Event
- Be blocked with missing required information identified
- Be refused registration for an Event that is not Confirmed
- See the primary Event venue and the venue for each selected Session

## E09-S02 — Enforce registration capacity

- **Sprint**: Sprint 4
- **Points**: 3
- **BDR references**: C-05, C-58, C-78, C-98, T-30, T-31, T-50, T-85, B-11, O-50
- **Owner**:

### User story

As an Event Organiser, I want the system to enforce each selected Session's approved layout capacity and the combined Event capacity so that registrations do not exceed either limit.

### Acceptance criteria

#### Scenario 1 — Both capacity limits enforced

Given a registration selects one or more Sessions When the request is within each selected Session's approved layout capacity and within the combined Event capacity Then it may be confirmed; if either limit would be exceeded it is not confirmed as an approved seat (C-78, T-85)

#### Scenario 2 — Over-capacity submission remains Pending

Given an Attendee submits a registration that would exceed a selected Session capacity or the combined Event capacity When it is received Then it is saved as Pending for the Event Organiser to approve or reject and does not count as an approved seat (C-98, T-85)

#### Scenario 3 — Pending request approval rechecks both limits

Given a registration is Pending When the Event Organiser approves it Then approval succeeds only if both the selected Session capacities and combined Event capacity remain available; otherwise it stays unapproved until capacity/arrangements change or it is rejected

#### Scenario 4 — Concurrent submissions do not overbook

Given one approved seat remains in a Session or in the combined Event capacity When two registrations are submitted at the same time Then at most one is confirmed against that remaining capacity and any other submission that exceeds capacity is Pending

#### Scenario 5 — Waiting list remains event-level

Given the combined Event capacity is full When an Attendee opens registration Then the existing Event-level waiting-list option is offered where enabled; whether a full individual Session offers a separate waiting list is open under O-50

#### Scenario 6 — Manual addition allowed within both limits

Given normal registration is full but both the selected Session and combined Event capacity have room When the Event Organiser manually adds an Attendee Then the registration is created as a distinguishable manual addition (C-58, T-50)

#### Scenario 7 — Manual addition blocked at either limit

Given the selected Session or combined Event capacity is already full When the Event Organiser manually adds an Attendee Then the addition is blocked and neither capacity is exceeded

### Checklist

- Set combined Event capacity from confirmed Session layout capacities
- Enforce both every selected Session capacity and combined Event capacity
- Keep an Attendee over-capacity submission Pending for Organiser review without counting it as an approved seat
- Recheck both limits when the Organiser approves a Pending registration
- Prevent concurrent requests from exceeding either limit
- Offer the Event-level waiting list when combined Event capacity is full; apply O-50 for individual full Sessions
- Allow manual VIP additions only within both limits and block them at either limit

## E09-S03 — Control the registration period

- **Sprint**:
- **Points**: 3
- **BDR references**: C-24, C-44, T-42, T-79, T-85
- **Owner**:

### User story

As an Event Organiser, I want to set one registration and withdrawal window for the Event so that attendees can select Sessions within a consistent Event-level period.

### Acceptance criteria

#### Scenario 1 — Before registration opens

Given the Event-level registration opening date has not been reached When an Attendee views the Event Then registration is shown as not yet open and the opening date is stated

#### Scenario 2 — After registration closes

Given the Event-level registration closing date has passed When an Attendee tries to register for any Session Then registration is refused

#### Scenario 3 — Closing date after Event start warned

Given I set the Event-level closing date after the Event has started When I save Then I am warned and asked to confirm

#### Scenario 4 — Waiting list enabled for Event

Given I enable the waiting list for an Event When its combined Event capacity is full Then the Event-level waiting list is offered where enabled

### Checklist

- Set Event-level registration opening, closing, and withdrawal dates
- Enable or disable the waiting list for the Event
- Apply the same registration window to all selected Sessions
- Show the opening date before registration opens
- Refuse registration outside the Event-level window
- Warn when the closing date is after the Event has started

## E09-S04 — Join the waiting list

- **Sprint**:
- **Points**: 5
- **BDR references**: C-23, T-33, T-46, B-10, O-50
- **Owner**:

### User story

As an Attendee, I want to join the waiting list when an event is full so that I can still attend if a place is released.

### Acceptance criteria

#### Scenario 1 — Joined a full event's list

Given the combined Event capacity is full and its Event-level waiting list is enabled When I join the waiting list Then I am added and told I will be notified when a place is released (Session-specific waiting-list behavior remains open under O-50)

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

- **Sprint**:
- **Points**: 3
- **BDR references**: C-24, T-48, B-10, T-79, T-85
- **Owner**:

### User story

As an Attendee, I want to withdraw my Event registration so that my Event place and places in all selected Sessions are released together.

### Acceptance criteria

#### Scenario 1 — Registration withdrawn from Event and Sessions

Given I have an active Event registration selecting one or more Sessions and the withdrawal deadline has not passed When I withdraw Then the Event registration is cancelled and its approved places are released from every selected Session and from the combined Event capacity

#### Scenario 2 — Withdrawal after deadline refused

Given the Event-level withdrawal deadline has passed When I try to withdraw Then I am told withdrawal has closed and given a contact for assistance

### Checklist

- Withdraw one Event registration before the Event-level deadline
- Release its approved places in all selected Sessions and combined Event capacity
- Be refused after the withdrawal deadline, with a contact provided

## E09-S06 — Record attendance

- **Sprint**:
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

- **Sprint**:
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
