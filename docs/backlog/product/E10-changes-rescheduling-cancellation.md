# E10 — Changes, Rescheduling & Cancellation

## E10-S01 — Request a change after submission

- **Sprint**:
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

- **Sprint**:
- **Points**: 5
- **BDR references**: C-05, T-16, B-05, B-11
- **Owner**:

### User story

As an Event Coordinator, I want the system to tell me when a change affects arrangements already confirmed so that I re-check them rather than assuming they still hold.

### Acceptance criteria

#### Scenario 1 — Attendance beyond capacity flagged

Given an event has a confirmed venue When its expected attendance is increased beyond that venue's capacity Then the venue booking is flagged for review and the Venue Staff are notified

#### Scenario 2 — Description-only edit flags nothing

Given an event has a confirmed venue and equipment When only the event description is edited Then no arrangements are flagged

#### Scenario 3 — Affected arrangements shown first

Given a change affects confirmed arrangements When I save it Then I am shown which arrangements are affected before the change takes effect

#### Scenario 4 — Over-subscription warns only

Given a venue change reduces the event's capacity below its registration count When the change is saved Then I am warned and shown the over-subscription, and no Attendee is automatically removed or waitlisted

#### Scenario 5 — Date change flags venue and equipment

Given the event's date or time changes When the change takes effect Then its venue booking and equipment reservations are flagged as requiring reconfirmation

### Checklist

- Confirm attendance increases beyond venue capacity flag the booking for review
- Confirm description-only edits flag nothing
- See which arrangements are affected before a change takes effect
- Confirm over-subscription warns the Coordinator without removing Attendees
- Confirm date or time changes flag both venue and equipment for reconfirmation
- Confirm affected Venue Staff and Technical Support Staff are notified

## E10-S03 — Reschedule an event

- **Sprint**:
- **Points**: 5
- **BDR references**: C-25, O-18
- **Owner**:

### User story

As an Event Coordinator, I want to reschedule an event to new dates so that it can still take place when the original dates no longer work.

### Acceptance criteria

#### Scenario 1 — Date change flags bookings

Given an event has a confirmed venue and equipment When I change its date Then the existing bookings are flagged as requiring reconfirmation and are not moved silently

#### Scenario 2 — Registered Attendees notified

Given Attendees have registered for the event When it is rescheduled Then all registered Attendees are notified of the new date and time

### Checklist

_No checklist recorded._

## E10-S04 — Cancel an event

- **Sprint**:
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

- **Sprint**:
- **Points**: 3
- **BDR references**: -
- **Owner**:

### User story

As an Event Coordinator, I want to be alerted when a venue becomes unavailable for one of my confirmed events so that I can arrange an alternative before Attendees are affected.

### Acceptance criteria

#### Scenario 1 — Blocked venue flags the event

Given my event has a confirmed venue When Venue Staff block that venue over the event's period Then I am notified and the event is flagged as at risk

#### Scenario 2 — At-risk event offers a new search

Given my event is flagged as at risk When I open it Then the reason and the affected arrangement are shown and I can begin a new venue search from that screen

### Checklist

_No checklist recorded._
