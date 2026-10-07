# E12 — Calendar, Search & Dashboards

## E12-S01 — View my events in a calendar

- **Sprint**:
- **Points**: 3
- **BDR references**: -
- **Owner**:

### User story

As an Event Coordinator, I want to see my events in a calendar so that I can plan my workload across the coming weeks.

### Acceptance criteria

#### Scenario 1 — Events shown on their dates

Given I have events spread across several weeks When I open the calendar Then my events appear on their dates with their status indicated

#### Scenario 2 — Multi-day event spans its days

Given an event spans several days When I view the calendar Then it is shown across all its days rather than only the first

### Checklist

_No checklist recorded._

## E12-S02 — Search and filter events

- **Sprint**:
- **Points**: 3
- **BDR references**: -
- **Owner**:

### User story

As an Event Coordinator, I want to search events by name, client, date, venue, status, category or assigned Coordinator so that I can find a specific event quickly.

### Acceptance criteria

#### Scenario 1 — Permitted matches returned

Given events match my criteria When I search Then only matching events that I am permitted to see are returned

#### Scenario 2 — Empty result offers relaxation

Given no events match my criteria When I search Then an empty result is shown with the option to relax the filters

#### Scenario 3 — Filters combine

Given I apply several filters at once When I search Then all the filters are applied together

### Checklist

_No checklist recorded._

## E12-S03 — See my work on a role-based dashboard

- **Sprint**:
- **Points**: 5
- **BDR references**: -
- **Owner**:

### User story

As a Venue Staff member, I want a dashboard showing booking requests awaiting my decision and upcoming venue preparations so that I can see my outstanding work in one place.

### Acceptance criteria

#### Scenario 1 — Pending decisions listed

Given booking requests are pending my decision When I open my dashboard Then they are listed with event name, venue, dates and how long each has been waiting

#### Scenario 2 — Empty state, not an error

Given I have no outstanding items When I open my dashboard Then an empty state is shown rather than an error

### Checklist

_No checklist recorded._

## E12-S04 — Use the system on a mobile device

- **Sprint**:
- **Points**: 3
- **BDR references**: -
- **Owner**:

### User story

As a Venue Staff member, I want to use the system on my phone while preparing a venue so that I can check and update arrangements without returning to a desk.

### Acceptance criteria

#### Scenario 1 — Readable without horizontal scrolling

Given I open the system on a mobile device When I view my dashboard, an event or a venue calendar Then the content is readable and usable without horizontal scrolling

#### Scenario 2 — Mobile update saves identically

Given I am working on a mobile device When I update a preparation status Then the update is saved exactly as it would be on a desktop

### Checklist

_No checklist recorded._
