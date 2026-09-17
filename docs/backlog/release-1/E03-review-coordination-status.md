# E03 — Review, Coordination & Status

## E03-S01 — Assign an Event Coordinator to a request

- **Sprint**: Sprint 2
- **Points**: 3
- **BDR references**: C-12, C-41, C-55, C-56, T-14, T-15
- **Owner**:

### User story

As an Event Organiser, I want my submitted request to be assigned an Event Coordinator automatically so that my event has one clear internal owner from the outset.

### Acceptance criteria

#### Scenario 1 — Exactly one Coordinator assigned

Given a request is submitted When submission completes Then the system assigns exactly one Event Coordinator, the status becomes Under Review, and that Coordinator is notified

#### Scenario 2 — Fewest active events wins

Given several Event Coordinators are available When the system assigns one Then it selects the Coordinator with the fewest active events

#### Scenario 3 — Reassignment requested

Given I am the assigned Coordinator and a reassignment has been agreed offline When I request reassignment to a named colleague Then the request is recorded, that colleague is notified, and I remain assigned until they accept

#### Scenario 4 — Reassignment accepted

Given a reassignment request is awaiting my acceptance When I accept it Then I become the assigned Coordinator, the previous assignment ends, and the change is recorded in the activity log

#### Scenario 5 — Reassignment declined

Given a reassignment request is awaiting acceptance When the named colleague declines it Then the original Coordinator remains assigned and is notified of the refusal

#### Scenario 6 — Unassigned Coordinator refused

Given I am not the assigned Coordinator When I attempt to reassign the event Then the action is refused

### Checklist

- Confirm that exactly one Event Coordinator is assigned on submission
- Confirm the assigned Coordinator is the one with the fewest active events
- Confirm the status moves from Submitted to Under Review
- Request reassignment to a named colleague as the assigned Coordinator
- Confirm the original Coordinator stays assigned until the colleague accepts
- Accept a reassignment request and take ownership of the event
- Decline a reassignment request, leaving the original Coordinator assigned
- Be refused when attempting to reassign an event assigned to someone else

## E03-S02 — Request clarification from the Event Organiser

- **Sprint**: Sprint 2
- **Points**: 3
- **BDR references**: C-10, B-02
- **Owner**:

### User story

As an Event Coordinator, I want to return a request to the Event Organiser with specific questions so that unclear requirements are corrected before planning begins.

### Acceptance criteria

#### Scenario 1 — Questions sent, status changes

Given I am reviewing a request with status Under Review When I record my questions and send them Then the status becomes Awaiting Clarification and the Event Organiser is notified with the questions

#### Scenario 2 — Organiser responds, review resumes

Given a request is Awaiting Clarification When the Event Organiser responds and resubmits Then the status returns to Under Review and I am notified

#### Scenario 3 — Outstanding questions visible

Given a request is Awaiting Clarification When I view it Then the outstanding questions and the date they were raised are shown

### Checklist

- Record one or more questions against a request under review
- Confirm the status becomes Awaiting Clarification and the Organiser is notified
- See the outstanding questions and the date raised on the event record
- Confirm the status returns to Under Review when the Organiser responds
- Filter my events by clarification status

## E03-S03 — Decide on an event request

- **Sprint**: Sprint 2
- **Points**: 3
- **BDR references**: C-09, T-39, T-41, T-43, O-06
- **Owner**:

### User story

As an Event Coordinator, I want to approve or reject a request and record my reasoning so that the Event Organiser receives a clear, traceable decision.

### Acceptance criteria

#### Scenario 1 — Approved to planning

Given a request has status Under Review and the required information is complete When I approve it Then the status becomes Approved and the Event Organiser is notified

#### Scenario 2 — Incomplete request blocked

Given required information is still incomplete When I try to approve the request Then approval is blocked and the missing items are listed

#### Scenario 3 — Rejected with reason

Given a request is under review When I reject it and record a reason Then the status becomes Rejected, the reason is stored and the Event Organiser is notified

#### Scenario 4 — Rejection without reason blocked

Given I attempt to reject without recording a reason When I confirm Then the rejection is blocked

#### Scenario 5 — Rejected record is read-only

Given a request has been rejected When the Event Organiser views it Then the reason and the date of the decision are shown and the request is read-only

### Checklist

- Approve a request whose required information is complete
- Confirm an approval sets the status to Approved and notifies the Organiser
- Be blocked from approving an incomplete request, with the missing items listed
- Reject a request under review with a recorded reason
- Be blocked from rejecting without a recorded reason
- Confirm a rejection sets the status to Rejected and notifies the Organiser
- See the reason and decision date in plain language as the Organiser
- Confirm a rejected request is read-only

## E03-S05 — Track the status of my event

- **Sprint**: Sprint 2
- **Points**: 1
- **BDR references**: B-03
- **Owner**:

### User story

As an Event Organiser, I want to see the current status of my event so that I know what stage planning has reached without contacting my Coordinator.

### Acceptance criteria

#### Scenario 1 — Current status in plain language

Given my event is at any stage When I open it Then the current status and the date it was reached are shown in plain language

#### Scenario 2 — New status and history entry

Given my event's status changes When I next open the event Then the new status is shown and the change appears in the event history

### Checklist

- See the current status in plain language
- See the date the current status was reached
- See the new status when the event reaches a new stage
- See the full status history for my event, drawn from the activity log (E14-S02)

## E03-S06 — Discuss an event through comments

- **Sprint**: Sprint 2
- **Points**: 3
- **BDR references**: C-15, C-47, B-02
- **Owner**:

### User story

As an Event Organiser, I want to post comments and questions on my event record so that planning conversations with my Coordinator are kept with the event rather than scattered across email.

### Acceptance criteria

#### Scenario 1 — Comment posted and Coordinator notified

Given I have access to an event When I post a comment Then it appears on the event with my name and the time it was posted, and the assigned Coordinator is notified

#### Scenario 2 — Comments in chronological order

Given a comment exists on my event When I view the event Then all comments are shown in chronological order

#### Scenario 3 — Comment on inaccessible event refused

Given I do not have access to an event When I attempt to post a comment Then the action is refused

### Checklist

- Post a comment on an event I have access to
- See my name and the posting time against each comment
- See all comments in chronological order
- Confirm the assigned Coordinator is notified of a new comment
- Be refused when posting on an event I cannot access

## E03-S07 — View and update event information

- **Sprint**: Sprint 2
- **Points**: 5
- **BDR references**: C-52, T-16
- **Owner**:

### User story

As an Event Coordinator, I want to view and update event information while planning is underway so that the record stays accurate as details are settled.

### Acceptance criteria

#### Scenario 1 — Organiser edits before approval

Given an event has not yet been approved When the Event Organiser edits any field Then the change is saved directly against the event

#### Scenario 2 — Coordinator edits after approval

Given an event has been approved When I edit any field as the assigned Coordinator Then the change is saved and recorded in the activity log

#### Scenario 3 — Organiser edits unrestricted fields

Given an event has been approved When the Event Organiser edits the event name, description, purpose or registration dates Then the change is saved directly

#### Scenario 4 — Restricted edit routed to change request

Given an event has been approved When the Event Organiser attempts to change the date, time, expected attendance, venue requirements, accessibility needs, equipment requirements or layout Then direct editing is refused and they are directed to raise a change request (E10-S01)

#### Scenario 5 — Unassigned Coordinator refused

Given I am not the assigned Coordinator When I attempt to edit an approved event Then the action is refused

### Checklist

- Edit any field as the Organiser while the event is Draft, Submitted, Under Review or Awaiting Clarification
- Edit any field as the assigned Coordinator once the event is Approved or later
- Edit name, description, purpose and registration dates as the Organiser after approval
- Be refused as the Organiser when directly editing date, time, attendance, venue requirements, accessibility needs, equipment requirements or layout after approval
- Be redirected to the change request flow (E10-S01) when a restricted edit is attempted
- Confirm every post-approval edit is recorded in the activity log
