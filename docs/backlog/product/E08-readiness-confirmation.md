# E08 — Readiness & Confirmation

## E08-S01 — View readiness of an event

- **Sprint**:
- **Points**: 3
- **BDR references**: -
- **Owner**:

### User story

As an Event Coordinator, I want to see whether venue, equipment and technical support are ready so that I know what still needs my attention.

### Acceptance criteria

#### Scenario 1 — Arrangement states shown

Given an event is in planning When I open its readiness view Then each arrangement is shown as complete, in progress or not started

#### Scenario 2 — Responsible role identified

Given an arrangement is not started When I view it Then the responsible role and the action required are shown

### Checklist

_No checklist recorded._

## E08-S02 — Track outstanding actions across events

- **Sprint**:
- **Points**: 3
- **BDR references**: C-28
- **Owner**:

### User story

As an Event Coordinator, I want a list of upcoming events with incomplete arrangements so that nothing is overlooked before an event takes place.

### Acceptance criteria

#### Scenario 1 — Incomplete events listed by date

Given I have upcoming events with incomplete arrangements When I open my outstanding actions list Then those events are listed with the specific incomplete items, ordered by event date

#### Scenario 2 — Approaching event highlighted

Given an event is close to its date and arrangements are still incomplete When I view the list Then that event is highlighted as urgent

### Checklist

_No checklist recorded._

## E08-S03 — Confirm an event

- **Sprint**:
- **Points**: 5
- **BDR references**: C-13, C-39, C-59, C-63, T-02, T-24, T-27
- **Owner**:

### User story

As an Event Coordinator, I want to confirm an event once the event's arrangements are complete so that the Event Organiser and Attendees can rely on the details.

### Acceptance criteria

#### Scenario 1 — All arrangements complete, event confirmed

Given the event has a confirmed venue booking and its full requested equipment reserved When I confirm the event Then the status becomes Confirmed and the Event Organiser is notified with the confirmed details

#### Scenario 2 — Missing venue blocks confirmation

Given the event has no confirmed venue When I try to confirm Then confirmation is blocked and the outstanding items are listed

#### Scenario 3 — Partial equipment blocks confirmation

Given the event has only a partial equipment reservation When I try to confirm Then confirmation is blocked and the outstanding quantity is shown

#### Scenario 4 — None required does not block

Given the event was submitted with 'none required' for equipment When I confirm it Then that requirement counts as fulfilled and does not block confirmation

#### Scenario 5 — Outstanding support assignment blocks confirmation

Given the event requested technical support and no staff are assigned When I try to confirm Then confirmation is blocked

#### Scenario 6 — Organiser sees confirmed arrangements

Given an event has been confirmed When the Event Organiser views it Then the confirmed venue, date, time and arrangements are shown

### Checklist

- Confirm an event that has a confirmed venue and full equipment reservation
- Be blocked from confirming while the event lacks a venue
- Be blocked from confirming while an equipment reservation is partial, with the shortfall shown
- Confirm an event whose equipment requirement was recorded as 'none required'
- Be blocked from confirming while a requested technical support assignment is outstanding
- Confirm the Event Organiser is notified with the full confirmed details

## E08-S04 — Revert a confirmed event to planning

- **Sprint**:
- **Points**: 1
- **BDR references**: C-48, T-03, T-28
- **Owner**:

### User story

As an Event Coordinator, I want to return a confirmed event to planning when an arrangement breaks so that its status reflects reality.

### Acceptance criteria

#### Scenario 1 — Reverted with a recorded reason

Given an event is Confirmed When I revert it to Planning and record a reason Then the status becomes Planning and the Event Organiser is notified with the reason

#### Scenario 2 — Registered Attendees notified

Given registered Attendees exist When the event is reverted Then they are notified that arrangements are being revised

#### Scenario 3 — No automatic reversion

Given an arrangement breaks on a confirmed event When no one reverts it Then the status stays Confirmed and the affected arrangement is flagged

### Checklist

- Revert a confirmed event to Planning with a recorded reason
- Confirm the Organiser is notified with the reason
- Confirm registered Attendees are notified
- Confirm the status never reverts automatically
- Confirm the reversion is recorded in the activity log

## E08-S05 — Complete an event

- **Sprint**:
- **Points**: 3
- **BDR references**: T-03, T-26, T-48
- **Owner**:

### User story

As an Event Coordinator, I want an event to become Completed once it has taken place so that attendance can be recorded and the event closed.

### Acceptance criteria

#### Scenario 1 — Auto-completed after the end time

Given an event is Confirmed and its end time has passed When the system next evaluates it Then the status becomes Completed

#### Scenario 2 — Marked complete manually

Given an event is Confirmed and has already started When I mark it complete Then the status becomes Completed

#### Scenario 3 — Premature completion blocked

Given an event is Confirmed and has not yet started When I try to mark it complete Then the action is blocked

#### Scenario 4 — Cancelled event never auto-completes

Given an event is Cancelled When its original end time passes Then it is not auto-completed and remains Cancelled

### Checklist

- Confirm an event auto-completes once its end time has passed
- Mark an event complete manually once it has started
- Be blocked from marking an event complete before it has started
- Confirm a cancelled event is never auto-completed
- Confirm the transition is recorded in the activity log
