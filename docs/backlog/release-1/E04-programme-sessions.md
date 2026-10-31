# E04 — Programme & Sessions

## E04-S02 — Create a multi-session event

- **Sprint**:
- **Points**: 5
- **BDR references**: C-19, C-62, C-107, T-48, T-79, T-85
- **Owner**: Amareet

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
