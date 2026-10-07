# E13 — Reporting & Export

## E13-S01 — Generate an event report

- **Sprint**:
- **Points**: 5
- **BDR references**: C-27, O-01
- **Owner**:

### User story

As an Event Coordinator, I want to generate a summary report for an event so that I can share the arrangements at operational meetings.

### Acceptance criteria

_No acceptance criteria recorded._

### Checklist

- Generate a downloadable report containing event name, date and time, venue, equipment list, assigned technical support and total registered Attendees
- Show aggregate attendee counts rather than personal data
- Show incomplete arrangements with an Outstanding tag rather than omitting the section
- Show a clear error with a retry option if generation fails

## E13-S02 — Review venue usage over a period

- **Sprint**:
- **Points**: 5
- **BDR references**: C-27, O-01
- **Owner**:

### User story

As a Venue Staff member, I want to review venue bookings and usage over a chosen period so that I can plan maintenance and identify under-used spaces.

### Acceptance criteria

_No acceptance criteria recorded._

### Checklist

- Select a custom date range with start and end dates
- Be rejected with a validation message when the start date is after the end date
- See a breakdown per venue of total booked hours, total blocked hours and number of events
- See blocked time in a column distinct from bookings
- See an informative empty state when no records match

## E13-S03 — Export attendee registration information

- **Sprint**:
- **Points**: 3
- **BDR references**: C-26, T-32
- **Owner**:

### User story

As an Event Organiser, I want to export the registration list for my event so that I can prepare badges and catering numbers.

### Acceptance criteria

_No acceptance criteria recorded._

### Checklist

- Export registrations only for events the Organiser manages
- Generate a downloadable file of the registration list
- Exclude sensitive personal data from the generated file
