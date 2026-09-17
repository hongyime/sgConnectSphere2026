# E04 — Programme & Sessions

## E04-S01 — Record the event programme

- **Sprint**:
- **Points**: 5
- **BDR references**: T-19
- **Owner**:

### User story

As an Event Organiser, I want to record the programme for my event, including sessions and breaks, so that ConnectSphere can plan the venue and support around it.

### Acceptance criteria

#### Scenario 1 — Programme item added

Given I am editing my event When I add a programme item with a title, start time and end time Then it appears in the event in chronological order

#### Scenario 2 — Item outside event times warned

Given a programme item falls outside the event's own start and end times When I save it Then I am warned and asked either to correct the times or extend the event

#### Scenario 3 — Overlapping items warned

Given two programme items overlap When I save them Then I am warned of the overlap

### Checklist

_No checklist recorded._

## E04-S02 — Create a multi-session event

- **Sprint**:
- **Points**: 5
- **BDR references**: C-19, C-62, T-48
- **Owner**:

### User story

As an Event Organiser, I want to define an event made up of one or more sessions so that each session's requirements can be planned separately.

### Acceptance criteria

#### Scenario 1 — Sessions hold their own requirements

Given I am creating an event When I add sessions Then each session stores its own date, time, expected attendance, venue requirements and equipment requirements

#### Scenario 2 — Single-session event needs no structure

Given my event has a single session When I create it Then no additional structure is required and the event behaves as a single-session event

#### Scenario 3 — Suitability judged per session

Given two sessions of my event have different expected attendance When a venue search is run for each Then suitability is assessed against that session's own attendance and requirements

#### Scenario 4 — Deleted session releases its booking

Given a session has a confirmed venue booking When I delete that session Then the booking is released, the Venue Staff are notified, and the deletion is recorded in the activity log

### Checklist

- Add one or more sessions, each with its own date, time, attendance and requirements
- Create a single-session event without extra steps
- Edit a session's date, time or requirements before its booking is confirmed
- Delete a session, releasing any confirmed booking and notifying Venue Staff
- See each session listed with its own venue booking and equipment status
