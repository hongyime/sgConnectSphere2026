# E10 — Changes, Rescheduling & Cancellation

## E10-S01 — Request a change after submission

- **Sprint**: Sprint 4
- **Points**: 8
- **BDR references**: C-14, C-52, C-54, C-77, T-16, T-88
- **Owner**:

### User story

As an Event Organiser, I want to request a change to my event after it has been submitted or confirmed so that the arrangements reflect what I now need.

### Acceptance criteria

#### Scenario 1 — Change request recorded

Given my Event has been approved or confirmed When I submit a change request describing what should change Then the assigned Coordinator is notified and the request is recorded against the Event

#### Scenario 2 — Confirmed details shown alongside

Given a change request is Pending When I view my Event Then the currently confirmed details are shown alongside the pending request

#### Scenario 3 — Refused edit offers the form

Given I attempt to edit a restricted field directly after approval When the edit is refused Then I am offered the change-request form pre-filled with that field

#### Scenario 4 — Approved change applied

Given the Coordinator approves my change request When it is applied Then the Event is updated and I am notified

#### Scenario 5 — Declined request communicated

Given the Coordinator declines my change request When the decision is recorded Then I am notified and the confirmed Event details remain unchanged

#### Scenario 6 — Terminal Event closes pending requests as Obsolete

Given the Event becomes Completed or Cancelled while one or more change requests are Pending When the Event reaches that terminal status Then each Pending request becomes Obsolete, the transition is recorded in history, and Obsolete is distinct from a Coordinator rejection (C-77, T-88)

### Checklist

- Submit a change request against an approved or confirmed Event
- See current confirmed details alongside a pending request
- Reach the change-request form when a restricted direct edit is refused
- Be notified when the Coordinator approves or declines the request
- Confirm Pending requests become Obsolete with history when the Event becomes Completed or Cancelled

## E10-S02 — Distinguish minor edits from arrangement-affecting changes

- **Sprint**: Sprint 4
- **Points**: 5
- **BDR references**: C-05, T-16, B-05, B-11, C-67, T-68, O-27, C-107, T-79
- **Owner**:

### User story

As an Event Coordinator, I want the system to identify which Session arrangements a change affects so that I re-check the right bookings and reservations.

### Acceptance criteria

#### Scenario 1 — Session attendance beyond capacity flagged

Given a Session has a confirmed venue booking When its expected attendance changes Then each booking whose own headcount is set uses that headcount, otherwise it uses the Session attendance; only a booking whose governing headcount exceeds capacity is flagged and Venue Staff are notified

#### Scenario 2 — Description-only edit flags nothing

Given an Event has confirmed venue and equipment arrangements When only its Event description is edited Then no arrangements are flagged

#### Scenario 3 — Affected Session arrangements shown first

Given a change affects confirmed arrangements When I save it Then I am shown the affected Session bookings and equipment reservations before the change takes effect

#### Scenario 4 — Over-subscription warns only

Given a change would make a Session or combined Event registration capacity lower than approved registrations When the change is saved Then I am warned and shown the over-subscription, and no Attendee is automatically removed or waitlisted

#### Scenario 5 — Session date/time change flags its arrangements

Given a Session date or time changes When the change takes effect Then that Session's venue booking and equipment reservations are flagged for reconfirmation; an Event-wide date/time change flags all of its Session arrangements

#### Scenario 6 — Affected staff notified

Given a change flags a venue or equipment arrangement When the affected arrangements are identified Then the assigned Venue Staff and Technical Support Staff are notified

### Checklist

- Flag only the Session arrangement whose governing headcount exceeds capacity
- Leave arrangements unflagged for description-only edits
- Show affected Session bookings/reservations before applying a change
- Warn about over-subscription without automatically removing or waitlisting Attendees
- Flag the affected Session or all Sessions for date/time changes as appropriate
- Notify staff responsible for the affected arrangements

## E10-S04 — Cancel an event

- **Sprint**: Sprint 4
- **Points**: 5
- **BDR references**: C-14, C-54, C-77, T-07, T-48, T-79, T-88
- **Owner**:

### User story

As an Event Coordinator, I want to cancel an Event and release its Session arrangements so that venues and equipment do not stay committed to something that will not happen.

### Acceptance criteria

#### Scenario 1 — Event cancelled and Session arrangements released

Given an Event Organiser requests cancellation When I cancel the Event and record a reason Then its status becomes Cancelled, all Session venue bookings and equipment reservations are released, calendars/availability are updated, and affected staff are notified

#### Scenario 2 — Attendees and waiting list notified

Given Attendees are registered or waitlisted for a cancelled Event When cancellation completes Then all are notified

#### Scenario 3 — Cancelled Event read-only

Given an Event has been cancelled When any user views it Then it is read-only and shows the cancellation reason and date

#### Scenario 4 — Organiser cancellation becomes a request

Given an Event Organiser attempts to cancel directly When they submit Then the action is recorded as a cancellation request for the Coordinator to action

#### Scenario 5 — Pending change requests become Obsolete

Given the Event has Pending change requests When cancellation completes Then each request becomes Obsolete and the transition is recorded in history (C-77, T-88)

### Checklist

- Cancel an Event and release every Session booking and equipment reservation
- Record a reason for cancellation
- Confirm venue and equipment availability is restored
- Notify registered and waitlisted Attendees and affected staff
- Keep the cancelled Event read-only with its reason and date
- Close Pending change requests as Obsolete with history

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
