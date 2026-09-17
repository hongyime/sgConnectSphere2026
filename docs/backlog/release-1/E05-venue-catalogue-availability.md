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
