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
- **BDR references**: C-19, C-62, C-107, T-48, T-79, T-85
- **Owner**:

### User story

As an Event Organiser, I want to define an event made up of one or more Sessions so that each Session's requirements can be planned separately.

### Acceptance criteria

#### Scenario 1 — Sessions hold their own requirements

Given I am creating an event When I add one or more Sessions Then each Session stores its date, time, expected attendance, venue requirements, and equipment requirements beneath the Event

#### Scenario 2 — Single-session event needs no extra setup

Given my event has one Session When I create it Then the system supports it as a single-session Event without requiring extra registration or lifecycle setup

#### Scenario 3 — Suitability judged per Session

Given two Sessions have different attendance or requirements When venue suitability is assessed for each Then each assessment uses that Session's own requirements and attendance

#### Scenario 4 — Session booking is independent

Given one Event uses the same venue for different Sessions When bookings are requested Then each booking is linked to its Session and its own time window; a booking for one Session does not replace another Session's booking

#### Scenario 5 — Deleted Session releases its booking

Given a Session has a confirmed venue booking When I delete that Session Then the booking is released, Venue Staff are notified, and the deletion is recorded in the activity log

### Checklist

- Add one or more Sessions beneath an Event with their own date, time, attendance, venue and equipment requirements
- Create a single-session Event without extra lifecycle steps
- Assess venue suitability against each Session independently
- Link bookings to the Session whose period they cover
- Delete a Session and release its confirmed booking with notification and history
