# E11 — Notifications & Reminders

## E11-S01 — Notify users about events they are involved in

- **Sprint**:
- **Points**: 5
- **BDR references**: C-04, C-29, C-53, T-35, T-36, T-44, T-48
- **Owner**:

### User story

As a user involved in an event, I want to be notified when its status or arrangements change so that I do not have to keep checking the system and nobody continues working from outdated information.

### Acceptance criteria

#### Scenario 1 — Status change notified

Given I am linked to an event When its status changes or a booking decision is made Then I receive a notification stating what changed, when, and which event it concerns

#### Scenario 2 — All affected parties notified

Given the event's date, time or venue changes When the change takes effect Then the Event Organiser, assigned Venue Staff, assigned Technical Support Staff and registered Attendees are all notified

#### Scenario 3 — Unaffected users not notified

Given a change does not affect a particular user's responsibilities When the change occurs Then that user is not notified

#### Scenario 4 — Delivered in-app and by email

Given a notification is generated for me When it is delivered Then it appears in the system and is also sent to my registered email address

#### Scenario 5 — Unread notifications distinguished

Given I have several unread notifications When I open my notification list Then they are shown newest first with unread ones distinguished

#### Scenario 6 — Marked as read

Given I open an unread notification When I have read it Then it is marked as read

### Checklist

- Receive a notification when an event I am linked to changes status
- Receive a notification when a booking decision is made
- Confirm all affected parties are notified when the event's date, time or venue changes
- Confirm users whose responsibilities are unaffected are not notified
- See what changed, when, and which event and event it concerns
- Receive the same notification in the system and by email
- See notifications newest first with unread ones distinguished
- Mark a notification as read

## E11-S03 — Receive reminders about upcoming commitments

- **Sprint**:
- **Points**: 3
- **BDR references**: C-28, O-11
- **Owner**:

### User story

As a Technical Support Staff member, I want reminders about upcoming events I am supporting so that equipment and support are prepared in time.

### Acceptance criteria

#### Scenario 1 — Reminder lists requirements

Given I am assigned to an upcoming event When the reminder point before it is reached Then I receive a reminder listing the equipment and support required

#### Scenario 2 — Cancelled event sends none

Given an event is cancelled before its reminder is due When the reminder point is reached Then no reminder is sent

### Checklist

_No checklist recorded._

## E11-S04 — Alert on incomplete arrangements

- **Sprint**:
- **Points**: 3
- **BDR references**: -
- **Owner**:

### User story

As an Event Coordinator, I want to be alerted when an upcoming event still has incomplete arrangements so that I can act while there is still time.

### Acceptance criteria

#### Scenario 1 — Incomplete items named

Given an upcoming event has an incomplete essential arrangement When the alert point before it is reached Then I receive an alert naming the incomplete items

#### Scenario 2 — No alert when complete

Given all arrangements are completed before the alert point When the alert point is reached Then no alert is sent

### Checklist

_No checklist recorded._
