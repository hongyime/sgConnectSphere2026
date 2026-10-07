# E05 — Venue Catalogue & Availability

## E05-S01 — Maintain the venue catalogue

- **Sprint**: Sprint 1
- **Points**: 3
- **BDR references**: T-13, T-18, B-05
- **Owner**: Le Xin

### User story

As a Venue Staff member, I want to add and update venue records so that Event Coordinators search against accurate information.

### Acceptance criteria

#### Scenario 1 — Venue added and searchable

Given I am adding a venue When I save it with location, capacity, facilities, accessibility features, supported layouts and operating hours Then it becomes searchable by Event Coordinators

#### Scenario 2 — Capacity drop flags bookings

Given a venue has confirmed bookings When I reduce its capacity below the expected attendance of one of those bookings Then the affected bookings are flagged for review and the assigned Coordinators are notified

#### Scenario 3 — Venue retired

Given a venue has no future bookings When I retire it Then it no longer appears in search results and its past bookings are retained

#### Scenario 4 — Retirement blocked by future bookings

Given a venue has future bookings When I attempt to retire it Then retirement is blocked and the blocking bookings are identified

### Checklist

- Add a venue with location, capacity, facilities, accessibility features, supported layouts and operating hours
- Update any of those attributes on an existing venue
- Confirm a new venue becomes searchable by Event Coordinators
- Confirm affected bookings are flagged when capacity drops below a booked attendance
- Retire a venue that has no future bookings
- Be blocked from retiring a venue with future bookings, with those bookings identified

## E05-S02 — Match layout requirements to venue capacity

- **Sprint**: Sprint 1
- **Points**: 3
- **BDR references**: T-45, B-07
- **Owner**: Le Xin

### User story

As a Venue Staff member, I want to record the room layouts supported by a venue and the maximum capacity for each layout, so that Event Coordinators only consider arrangements the venue can accommodate.

### Acceptance criteria

#### Scenario 1 — Layout and capacity stored

Given I am editing a venue When I add a supported layout with its maximum capacity Then it is stored against that venue

#### Scenario 2 — Undersized layout excluded

Given an event requires a theatre layout for a given attendance When a Coordinator searches for venues Then venues whose theatre capacity is below that attendance are excluded or marked unsuitable

#### Scenario 3 — Duplicate layout warned

Given a layout already exists on the venue When I try to add it again Then I am warned and no duplicate is created

### Checklist

- View the layouts supported by a venue and their maximum capacities
- Add one or more room layouts to a venue
- Set and edit a maximum capacity for each layout
- Remove a layout no longer offered at the venue
- Be warned when adding a layout that already exists

## E05-S03 — View the venue availability calendar

- **Sprint**: Sprint 2
- **Points**: 5
- **BDR references**: C-40, C-60, T-17, T-49
- **Owner**:

### User story

As an Event Coordinator, I want to view a venue's calendar so that I can see when the venue is free, pending, confirmed or blocked.

### Acceptance criteria

#### Scenario 1 — Four states distinguishable

Given a venue has bookings and blocks in a period When I open its calendar for that period Then each entry is shown as Free, Tentative, Confirmed or Blocked, and the states are visually distinguishable

#### Scenario 2 — Other events' details withheld

Given I do not have permission to view another event's details When I open the calendar Then the period is shown as unavailable without revealing the other event's information

#### Scenario 3 — Block distinct from booking

Given a venue is blocked for maintenance When I view the calendar Then the block is clearly distinct from a booking

### Checklist

- Select a date or date range to view venue availability
- See the availability state for each period: Free, Tentative, Confirmed or Blocked
- See the event name, event, date and time for periods I am permitted to view
- Navigate to different dates or date ranges
- See a blocked venue clearly distinguished from a booked one
- See periods I cannot view marked unavailable without any event detail

## E05-S04 — Block a venue for maintenance

- **Sprint**: Sprint 2
- **Points**: 3
- **BDR references**: -
- **Owner**:

### User story

As a Venue Staff member, I want to block a venue for maintenance, renovation or safety reasons so that it is not offered for events during that period.

### Acceptance criteria

#### Scenario 1 — Free period blocked

Given a venue has no bookings in a period When I block that period and record a reason Then the venue no longer appears as available for those dates

#### Scenario 2 — Block over a confirmed booking warned

Given a venue already has a confirmed booking in the period When I try to block it Then I am warned of the conflict and must resolve it before the block takes effect

#### Scenario 3 — Affected Coordinators notified

Given a block is created over an upcoming event's dates When the block is saved Then the affected Coordinators are notified

### Checklist

- Block a venue for a specified period with a recorded reason
- Be prevented from finalising a block that overlaps a confirmed booking, with the conflicting booking identified
- Remove or shorten an existing block, restoring availability for the released period
- Confirm a blocked venue no longer appears as available during the blocked period
- Confirm affected Event Coordinators are notified when a block affects an upcoming event

## E05-S05 — Apply setup and turnaround time

- **Sprint**: Sprint 3
- **Points**: 5
- **BDR references**: C-65, T-66, T-73, T-74, O-20, O-21, O-22 (supersedes C-18, C-38)
- **Owner**:

### User story

As a Venue Staff member, I want to record the setup and turnaround time each venue requires so that every availability and conflict check accounts for the time needed to prepare the room before an event and reset it afterwards.

Returned to Release 1 by the Week 7 Customer Changes (C-65). The five-point estimate is the one carried from the original backlog and is re-estimated at Sprint 3 planning (T-73). Scenario 3 lives here rather than in E05-S03, and Scenario 7 here rather than in E06-S01, because both of those stories are Done (T-74). Scenarios tagged "(assumes O-xx)" are written to the default recorded in `docs/bdr/C-open-questions.md` and are amended if the customer answers differently.

### Acceptance criteria

#### Scenario 1 — Buffers recorded on the venue

Given I am creating or editing a venue When I enter a setup time and a turnaround time in whole minutes, either of which may be 0, and save Then both values are stored against the venue and shown on its detail, and every venue that existed before this story has both values at 0

#### Scenario 2 — Occupancy window computed from the buffers

Given a venue has a setup time of 30 minutes and a turnaround time of 45 minutes When a booking or tentative hold for 10:00 to 12:00 is evaluated for availability or conflicts Then the venue is treated as occupied from 09:30 to 12:45

#### Scenario 3 — Calendar shows the buffered window

Given a venue with non-zero buffers has a Confirmed booking or a Tentative hold When a Coordinator or Venue Staff member views the venue availability calendar Then the Confirmed or Tentative period shown covers the buffered window and the buffer portion is visually distinguishable from the advertised event time, and the Free, Tentative, Confirmed and Blocked states of E05-S03 are otherwise unchanged

#### Scenario 4 — Conflicts created by a buffer change are identified, not removed

Given a venue has Confirmed bookings 10:00 to 12:00 and 12:30 to 14:00 and a turnaround time of 0 When I change the turnaround time to 45 minutes and save Then the save succeeds (assumes O-21), both bookings remain Confirmed and the later one is marked Conflicting rather than released, the conflicting pair is listed to me on save, the calendar flags the conflict, and the Coordinator of each affected event is notified (assumes O-20)

#### Scenario 5 — Buffers do not apply against a maintenance block

Given a venue has a maintenance block ending at 12:00 and a setup time of 30 minutes When a booking request for 12:00 to 14:00 is evaluated Then the block and the booking are compared on the booking's advertised times, so the request is not in conflict with the block (assumes O-22)

#### Scenario 6 — Adjacent buffered windows do not conflict

Given booking A occupies a venue until 12:45 once its turnaround is applied When booking B's buffered window on the same venue starts at exactly 12:45 Then there is no conflict, and when it starts at 12:44 there is

#### Scenario 7 — Buffered occupancy excludes a venue from search

Given a venue's existing booking or hold, once that venue's setup and turnaround time are applied, overlaps an event's requested period When a Coordinator runs the venue search for that event Then the venue does not appear as available even though the advertised event times do not overlap; E06-S01 is Done and is not edited, this is its buffered-search requirement placed here under T-74

### Checklist

- Record a setup time and a turnaround time in whole minutes for each venue, with 0 allowed and 0 the default for existing venues
- See both values on the venue's detail
- Have the calendar, venue search, booking request, booking decision, tentative hold and double-booking prevention all evaluate the buffered occupancy window instead of the advertised event times
- See the conflicts a buffer change creates listed on save and flagged on the calendar, with the affected Coordinators notified
- Never have a booking released automatically because a buffer changed

## E05-S06 — Mark a venue temporarily unavailable over existing bookings

- **Sprint**: Sprint 3
- **Points**:
- **BDR references**: C-66, C-48, C-61, T-28, T-67, T-74, O-23, O-24, O-25, O-26
- **Owner**:

### User story

As a Venue Staff member, I want to mark a venue temporarily unavailable for maintenance, equipment failure, renovation, a safety concern or another operational reason, even when events are already booked in it, so that affected bookings are identified and their Coordinators can arrange an alternative without the events themselves being cancelled.

New story from the Week 7 Customer Changes (C-66). It supersedes E05-S04 Scenario 2, which refused a block over a confirmed booking; E05-S04 is in the Sprint 2 sprint backlog and is not edited (T-67, T-74). Estimate to be set by planning poker at Sprint 3 planning (T-73). Scenarios tagged "(assumes O-xx)" are written to the default recorded in `docs/bdr/C-open-questions.md`.

### Acceptance criteria

#### Scenario 1 — Unavailability recorded with a reason

Given I am viewing a venue When I mark it unavailable for a period and choose a reason category from maintenance, equipment failure, renovation, safety concern or other, with a free-text note Then the unavailability is saved with the period, the category, the note and my identity, and the calendar shows the period as Blocked

#### Scenario 2 — Overlapping bookings become Conflicting, not released

Given the venue has a Pending request and a Confirmed booking inside the period When I save the unavailability Then the save succeeds, both bookings are marked Conflicting, neither is released or cancelled, and the two affected events are listed to me on save

#### Scenario 3 — The event itself is untouched

Given a Confirmed event's booking has just become Conflicting When anyone views that event Then its status is still Confirmed, every other arrangement is intact, and a venue-conflict flag with the reason category is shown; the event changes status only when its Coordinator acts (assumes O-24)

#### Scenario 4 — Affected Coordinators informed

Given the unavailability made one or more bookings Conflicting When it is saved Then the Coordinator of each affected event receives an in-app and email notification naming the venue, the period, the reason category and the event, and stating that alternative arrangements are required (assumes O-25)

#### Scenario 5 — End date required and extendable

Given I am recording an unavailability When I omit the end date and time Then the save is refused; and Given a saved unavailability When I extend its end Then bookings newly inside the longer period are handled as in Scenario 2 (assumes O-23)

#### Scenario 6 — Unavailability shortened or ended early

Given a booking is Conflicting only because of an unavailability When I shorten or end that unavailability so the booking no longer overlaps it Then the Conflicting flag clears and the booking stands as it was; a booking the Coordinator has already cancelled or replaced is not restored (assumes O-26)

### Checklist

- Mark a venue unavailable for a period with a reason category and a note, including when Pending or Confirmed bookings fall inside the period
- See the affected events listed on save and their bookings marked Conflicting, with none released or cancelled
- Confirm the affected events keep their status and other arrangements, with a visible venue-conflict flag
- Confirm each affected Coordinator is notified in-app and by email
- Be refused an unavailability with no end date and time
- Confirm shortening or ending an unavailability clears the Conflicting flag on bookings it no longer touches
- Confirm E05-S04's existing block, shorten and remove behaviour still works for periods with no bookings
