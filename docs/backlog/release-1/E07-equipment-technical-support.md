# E07 — Equipment & Technical Support

## E07-S01 — Maintain the equipment catalogue

- **Sprint**: Sprint 3
- **Points**: 3
- **BDR references**: -
- **Owner**:

### User story

As a Technical Support Staff member, I want to maintain equipment records including type, quantity, location and operational status so that availability checks are based on accurate data.

### Acceptance criteria

#### Scenario 1 — Item added and reservable

Given I am adding an equipment item When I save its type, description, quantity, location and operational status Then it becomes available for reservation

#### Scenario 2 — Quantity drop flags reservations

Given an item is already reserved for upcoming events When I reduce its quantity below the amount reserved Then the affected reservations are flagged and the relevant Coordinators are notified

#### Scenario 3 — Item retired

Given an item has no future reservations When I retire it Then it no longer appears in availability checks and its past reservations are retained

### Checklist

- Add an equipment item with type, description, quantity, location and operational status
- Update any of those attributes on an existing item
- Confirm a new item becomes available for reservation
- Confirm affected reservations are flagged when quantity drops below the amount reserved
- Retire an item that has no future reservations
- Confirm retired items no longer appear in availability checks

## E07-S02 — Request equipment for an event

- **Sprint**: Sprint 3
- **Points**: 3
- **BDR references**: T-25
- **Owner**:

### User story

As an Event Coordinator, I want to record the equipment an event needs, with quantities, so that Technical Support Staff can check whether it can be provided.

### Acceptance criteria

#### Scenario 1 — Equipment recorded against an event

Given I am planning an approved event When I add equipment items with quantities to an event Then the request is saved against the event and the Technical Support Staff are notified

#### Scenario 2 — Request exceeds total stock

Given I request more of an item than ConnectSphere owns in total When I save the request Then I am warned that the request cannot be met from existing stock

#### Scenario 3 — Events independent of each other

Given an event has several events When I record equipment for the event Then the other events are unaffected

### Checklist

- Add equipment items with quantities to a specific event
- Confirm the request is saved against the event and Technical Support Staff are notified
- Be warned when requesting more than ConnectSphere owns in total
- Record different equipment for different events of the same event
- Amend or remove an equipment request before it is reserved

## E07-S03 — Check equipment availability

- **Sprint**: Sprint 3
- **Points**: 5
- **BDR references**: C-07, C-20
- **Owner**:

### User story

As a Technical Support Staff member, I want to see how much of an item is free for a given date and time so that I can decide whether a request can be met.

### Acceptance criteria

#### Scenario 1 — Reserved and faulty stock excluded

Given some items are reserved for other events in the period When I check availability Then the free quantity excludes those reservations and any items marked damaged or under maintenance

#### Scenario 2 — Location does not affect availability

Given an item is free for the requested date and time but is currently located at another venue When I check availability Then it is shown as available and no transport allowance is applied

#### Scenario 3 — Non-overlapping events share an item

Given two events require the same item at non-overlapping times on the same day When I check availability Then the item is free for both

### Checklist

- View the free quantity of an item for a given date and time
- Confirm reservations for other events are excluded from the free quantity
- Confirm damaged or under-maintenance items are excluded
- Confirm items at other venues are still counted as available
- Confirm the same item can serve two events at non-overlapping times

## E07-S04 — Reserve equipment for an event

- **Sprint**: Sprint 3
- **Points**: 5
- **BDR references**: C-21, T-24, B-09
- **Owner**:

### User story

As a Technical Support Staff member, I want to reserve equipment for an event so that limited equipment is not committed to two events at the same time.

### Acceptance criteria

#### Scenario 1 — Full reservation recorded

Given sufficient equipment is free for the period When I reserve the requested quantity Then the reservation is recorded against the event and the Event Coordinator is notified

#### Scenario 2 — Partial reservation and shortfall

Given only part of the requested quantity is free When I record a partial reservation Then the Coordinator is notified of the shortfall and the outstanding quantity

#### Scenario 3 — Fully committed item shows nothing free

Given an item becomes fully committed When availability is next checked for that period Then no free quantity is shown

#### Scenario 4 — Reservation released

Given an event is cancelled or its equipment is no longer required When I release the reservation Then the quantity returns to the available pool

### Checklist

- Select an event and equipment item to reserve
- Specify the quantity required
- See an error when the requested quantity exceeds what is available
- Record a partial reservation and notify the Coordinator of the shortfall
- Release a reservation when an event is cancelled or the equipment is no longer needed
- Receive confirmation showing the event, date, time, item and quantity

## E07-S05 — Mark equipment as unavailable

- **Sprint**: Sprint 3
- **Points**: 1
- **BDR references**: B-04
- **Owner**:

### User story

As a Technical Support Staff member, I want to mark equipment as damaged or under maintenance so that it is not treated as available for events.

### Acceptance criteria

#### Scenario 1 — Item marked unavailable

Given an item has no reservations in the period When I mark it unavailable with a reason and a period Then it is excluded from availability checks for that period

#### Scenario 2 — Reserved item flags its events

Given an item is reserved for an upcoming event When I mark it unavailable Then the affected events are flagged and their Coordinators are notified

### Checklist

- Mark an item unavailable for a specified period with a recorded reason
- Confirm it is excluded from availability checks for that period
- Confirm affected events are flagged and Coordinators notified
- Return an item to service, restoring it to availability checks

## E07-S06 — Request technical support for an event

- **Sprint**: Sprint 3
- **Points**: 1
- **BDR references**: C-22, T-23
- **Owner**:

### User story

As an Event Coordinator, I want to request on-site technical support for an event and describe what is needed so that suitable staff can be allocated.

### Acceptance criteria

#### Scenario 1 — Support request recorded

Given an event requires technical support When I submit a request describing the support and the times it is needed Then the Technical Support Staff are notified and the request is recorded against the event

#### Scenario 2 — Request accepted before venue confirmed

Given the event does not yet have a confirmed venue When I submit a technical support request Then it is accepted and reviewed alongside venue identification

#### Scenario 3 — Event marked as needing none

Given an event needs no technical support When I mark it as such Then no request is created and confirmation is not blocked on staff assignment

### Checklist

- Submit a technical support request against a specific event
- Describe the support required and the times it is needed
- Confirm Technical Support Staff are notified
- Submit a request before the venue is confirmed
- Mark an event as requiring no technical support

## E07-S07 — Assign and manage technical staff for an event

- **Sprint**: Sprint 3
- **Points**: 3
- **BDR references**: C-39
- **Owner**:

### User story

As a Technical Support Staff member, I want to assign and manage available colleagues to support an event so that the right people are on site at the right time.

### Acceptance criteria

#### Scenario 1 — Available colleague assigned

Given an event has an open technical support request and a colleague is available for its times When I assign them Then they are notified and the assignment appears on their schedule

#### Scenario 2 — Overlapping assignment blocked

Given a colleague is already assigned to another event at an overlapping time When I try to assign them Then the assignment is blocked and the conflicting event is identified

#### Scenario 3 — Assignment removed

Given an assignment exists When I remove it Then the colleague is notified and the slot is freed

#### Scenario 4 — Replacement assigned under same check

Given I have removed an assignment When I assign a replacement Then the same conflict check is applied

### Checklist

- Assign a colleague only when they have no conflicting assignment the event's period
- See the assignment on the assigned staff member's schedule
- Be blocked from assigning a colleague with an overlapping assignment, with the conflicting event identified
- Remove an existing assignment
- Assign a replacement colleague subject to the same conflict check
- Confirm the staff member is notified when assigned or removed
