# E10 — Changes, Rescheduling & Cancellation

## E10-S01 — Request a change after submission

- **Sprint**: Sprint 4
- **Points**: 3
- **BDR references**: C-14, C-52, C-54, T-16
- **Owner**:

### User story

As an Event Organiser, I want to request a change to my event after it has been submitted or confirmed so that the arrangements reflect what I now need.

### Acceptance criteria

#### Scenario 1 — Change request recorded

Given my event has been approved or confirmed When I submit a change request describing what should change Then the assigned Coordinator is notified and the request is recorded against the event

#### Scenario 2 — Confirmed details shown alongside

Given a change request is pending When I view my event Then the currently confirmed details are still shown alongside the pending request

#### Scenario 3 — Refused edit offers the form

Given I attempt to edit a restricted field directly after approval When the edit is refused Then I am offered the change request form pre-filled with that field

#### Scenario 4 — Approved change applied

Given the Coordinator approves my change request When it is applied Then the event is updated and I am notified

### Checklist

- Submit a change request against an approved or confirmed event
- Describe the change requested
- Confirm the assigned Coordinator is notified
- See currently confirmed details alongside any pending request
- Reach the change request form when a restricted direct edit is refused
- Be notified when the Coordinator approves or declines the request

## E10-S02 — Distinguish minor edits from arrangement-affecting changes

- **Sprint**: Sprint 4
- **Points**: 5
- **BDR references**: C-05, T-16, B-05, B-11, C-67, T-68, O-27
- **Owner**:

### User story

As an Event Coordinator, I want the system to tell me when a change affects arrangements already confirmed so that I re-check them rather than assuming they still hold.

### Acceptance criteria

#### Scenario 1 — Attendance beyond capacity flagged

Given an event has one or more confirmed venue bookings When its expected attendance is increased Then each venue booking whose governing headcount (the booking's own headcount where set, otherwise the event's attendance) now exceeds that venue's capacity is flagged for review, and the others are not (C-67; assumes O-27) and the Venue Staff are notified

#### Scenario 2 — Description-only edit flags nothing

Given an event has a confirmed venue and equipment When only the event description is edited Then no arrangements are flagged

#### Scenario 3 — Affected arrangements shown first

Given a change affects confirmed arrangements When I save it Then I am shown which arrangements are affected before the change takes effect

#### Scenario 4 — Over-subscription warns only

Given a venue change reduces the event's capacity below its registration count When the change is saved Then I am warned and shown the over-subscription, and no Attendee is automatically removed or waitlisted

#### Scenario 5 — Date change flags venue and equipment

Given the event's date or time changes When the change takes effect Then every one of its venue bookings and its equipment reservations are flagged as requiring reconfirmation

### Checklist

- Confirm attendance increases beyond venue capacity flag the booking for review
- Confirm description-only edits flag nothing
- See which arrangements are affected before a change takes effect
- Confirm over-subscription warns the Coordinator without removing Attendees
- Confirm date or time changes flag both venue and equipment for reconfirmation
- Confirm affected Venue Staff and Technical Support Staff are notified

## E10-S04 — Cancel an event

- **Sprint**: Sprint 4
- **Points**: 5
- **BDR references**: C-14, C-54, T-07, T-48
- **Owner**:

### User story

As an Event Coordinator, I want to cancel an event and release its arrangements so that venues and equipment do not stay committed to something that will not happen.

### Acceptance criteria

#### Scenario 1 — Event cancelled, arrangements released

Given an Event Organiser requests cancellation When I cancel the event and record a reason Then its status becomes Cancelled, its venue booking and equipment reservations are released, the venue calendar is updated and the affected staff are notified

#### Scenario 2 — Attendees and waitlist notified

Given Attendees are registered or waitlisted for a cancelled event When the cancellation completes Then all of them are notified

#### Scenario 3 — Cancelled event read-only

Given an event has been cancelled When any user views it Then it is read-only and shows the cancellation reason and date

#### Scenario 4 — Organiser cancellation becomes a request

Given an Event Organiser attempts to cancel directly When they submit Then the action is recorded as a cancellation request for the Coordinator to action

### Checklist

- Cancel an event, releasing its venue and equipment
- Record a reason for the cancellation
- Confirm the released venue becomes available again on the calendar
- Confirm released equipment returns to the available pool
- Confirm registered and waitlisted Attendees are notified
- Confirm a cancelled event is read-only and shows its reason and date

## E10-S05 — Handle a venue lost from a confirmed event

- **Sprint**: Sprint 3
- **Points**: 3
- **BDR references**: C-66, C-61, T-28, T-67, T-73, T-74, O-24, O-25
- **Owner**:

### User story

As an Event Coordinator, I want to be alerted when a venue becomes unavailable for one of my events and to find and request a replacement from the event itself, so that I can arrange an alternative before Attendees are affected while the original event information is preserved.

Returned to Release 1 by the Week 7 Customer Changes (C-66, T-67). The three-point estimate is carried from the original backlog and re-estimated at Sprint 3 planning (T-73). The alert itself is raised by E05-S06; this story is what the Coordinator does with it. Scenarios tagged "(assumes O-xx)" are written to the default recorded in `docs/bdr/C-open-questions.md`.

### Acceptance criteria

#### Scenario 1 — Lost venue flags the event

Given my event has a Pending or Confirmed venue booking When Venue Staff mark that venue unavailable over the booking's period (E05-S06) Then I am notified, the booking shows as Conflicting on the event, and the event is flagged as needing alternative arrangements while its status and every other arrangement stay as they were (assumes O-24)

#### Scenario 2 — Flagged event offers a replacement search

Given my event is flagged When I open it Then the reason category, the period and the affected booking are shown, the original venue, dates and requirements are preserved, and I can start a venue search (E06-S01) for the same event from that screen

#### Scenario 3 — Replacement requested without losing the original

Given I have found a replacement venue When I submit a booking request for it (E06-S03) Then the request is created for the same event alongside the Conflicting booking, and I may cancel the Conflicting booking explicitly once the replacement is Confirmed; nothing is cancelled for me

#### Scenario 4 — Organiser and Attendees told on the actual change

Given I confirm a replacement venue When the venue of a Confirmed event changes Then the Organiser and registered Attendees are notified of the new venue through the existing venue-change routing (E11-S01), and not earlier (assumes O-25)

### Checklist

- Be notified when a venue I have booked is marked unavailable over my booking
- See the reason, period and affected booking on the event, with the original event information intact
- Start a venue search for the same event from the flagged event
- Request a replacement venue while the Conflicting booking remains on the event until I cancel it
- Confirm the Organiser and registered Attendees are told of the venue change only when it actually happens
