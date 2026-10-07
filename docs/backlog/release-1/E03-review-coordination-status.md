# E03 — Review, Coordination & Status

## E03-S01 — Assign an Event Coordinator to a request

- **Sprint**: Sprint 2
- **Points**: 3
- **BDR references**: C-12, C-41, C-55, C-56, T-14, T-15, C-69, T-70, T-74
- **Owner**:

### User story

As an Event Organiser, I want my submitted request to be assigned an Event Coordinator automatically so that my event has one clear internal owner from the outset.

Done in Sprint 2 (#141, #147) and kept Done (T-74). The Week 7 Customer Changes (C-69) end automatic assignment: Scenarios 1 and 2 and the first two checklist items are superseded by E03-S08, which puts new requests in an unassigned queue worked by the Event Coordinator Lead. They stay here as the record of what was delivered. Scenarios 3 to 6 remain in force; E03-S09 adds the Lead as a second actor who may reassign directly.

### Acceptance criteria

#### Scenario 1 — [Superseded by E03-S08 (C-69)] Exactly one Coordinator assigned

Given a request is submitted When submission completes Then the system assigns exactly one Event Coordinator, the status becomes Under Review, and that Coordinator is notified

#### Scenario 2 — [Superseded by E03-S08 (C-69)] Fewest active events wins

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

- Confirm that exactly one Event Coordinator is assigned on submission (superseded by E03-S08, C-69)
- Confirm the assigned Coordinator is the one with the fewest active events (superseded by E03-S08, C-69; the count is now shown to the Lead as advice)
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

## E03-S08 — Assign a queued request to an Event Coordinator as the Lead

- **Sprint**: Sprint 3
- **Points**:
- **BDR references**: C-69, T-70, T-72, T-73, T-74, O-35, O-38
- **Owner**:

### User story

As an Event Coordinator Lead, I want newly submitted event requests to enter an unassigned queue that I work through, assigning each to a suitable Event Coordinator, so that incoming work is distributed deliberately rather than automatically.

New story from the Week 7 Customer Changes (C-69). It replaces the automatic assignment delivered by E03-S01 Scenarios 1 and 2, which stay recorded there as superseded (T-74). Estimate at Sprint 3 planning (T-73). Scenarios tagged "(assumes O-xx)" are written to the default recorded in `docs/bdr/C-open-questions.md`.

### Acceptance criteria

#### Scenario 1 — Submission enters the unassigned queue

Given an Event Organiser submits a request When submission completes Then no Event Coordinator is assigned, the event's status stays Submitted, the request appears in the unassigned queue, and the Event Coordinator Lead is notified (replaces E03-S01 Scenarios 1 and 2)

#### Scenario 2 — Queue shows basic event information, oldest first

Given requests are in the unassigned queue When I open it Then each shows the event name, the Organiser's client organisation, preferred dates, expected attendance and the time submitted, oldest first, and the queue is visible to Event Coordinator Leads only (assumes O-38)

#### Scenario 3 — Lead assigns a Coordinator

Given a request is in the queue When I choose an Event Coordinator and assign Then exactly one Coordinator is assigned, the status becomes Under Review, the Coordinator and the Organiser are notified, the request leaves the queue, and the activity log records who assigned it and when

#### Scenario 4 — Workload shown while choosing

Given I am choosing a Coordinator When the list of Coordinators is shown Then each shows their count of active events, so the fewest-active-events rule the system used to apply (T-14) is available as advice without being enforced

#### Scenario 5 — Only a Lead may assign from the queue

Given I am an Event Coordinator or any role other than Event Coordinator Lead When I attempt to assign a queued request Then the action is refused and the refusal is recorded in the activity log

#### Scenario 6 — Status transition and Organiser view unchanged

Given a request has been assigned from the queue When the Organiser tracks the event (E03-S05) Then the status history shows Submitted followed by Under Review exactly as it did under automatic assignment, so E03-S01's delivered transition still holds

### Checklist

- Confirm a newly submitted request has no Coordinator, stays Submitted and appears in the unassigned queue
- Confirm the Lead is notified of each new queued request
- See each queued request's basic information, oldest first, as a Lead only
- Assign exactly one Coordinator from the queue, moving the event to Under Review with the Coordinator and Organiser notified and the action logged
- See each Coordinator's active-event count while choosing
- Be refused as a non-Lead when attempting to assign from the queue
- Confirm the Submitted to Under Review transition recorded by E03-S01 is unchanged

## E03-S09 — Reassign an event as the Lead

- **Sprint**: Sprint 3
- **Points**:
- **BDR references**: C-69, C-56, T-15, T-70, T-73, T-74, O-36, O-37
- **Owner**:

### User story

As an Event Coordinator Lead, I want to reassign an event to a different Event Coordinator where necessary so that workload, absences and conflicts can be managed without waiting on the current Coordinator.

New story from the Week 7 Customer Changes (C-69). The Coordinator-initiated reassignment with acceptance delivered by E03-S01 Scenarios 3 to 6 stays in force (T-15 amended, not replaced). Estimate at Sprint 3 planning (T-73). Scenarios tagged "(assumes O-xx)" are written to the default recorded in `docs/bdr/C-open-questions.md`.

### Acceptance criteria

#### Scenario 1 — Lead reassignment takes effect immediately

Given an event is assigned to a Coordinator When I, as the Lead, reassign it to another Coordinator Then the change takes effect at once without an acceptance step, the outgoing and incoming Coordinators and the Organiser are notified, and the activity log records who reassigned it and when (assumes O-36)

#### Scenario 2 — Coordinator-initiated reassignment unchanged

Given I am the assigned Coordinator and a reassignment has been agreed offline When I request reassignment to a named colleague Then E03-S01 Scenarios 3, 4 and 5 apply unchanged: I remain assigned until the colleague accepts, and a decline leaves me assigned

#### Scenario 3 — Coordinator may ask the Lead to reassign

Given I am the assigned Coordinator When I request reassignment without naming a colleague Then the request appears to the Lead with my reason, I remain assigned until the Lead acts, and the Lead may reassign (Scenario 1) or decline, which notifies me (assumes O-37)

#### Scenario 4 — Only the assigned Coordinator or a Lead may reassign

Given I am a Coordinator not assigned to the event When I attempt to reassign it Then the action is refused, exactly as in E03-S01 Scenario 6

### Checklist

- Reassign an event directly as the Lead, with both Coordinators and the Organiser notified and the change logged
- Confirm Coordinator-to-Coordinator reassignment still requires the colleague's acceptance
- Ask the Lead to reassign my event without naming a colleague, and be told the outcome
- Be refused when attempting to reassign an event I am not assigned to and am not the Lead for

## E03-S10 — Oversee coordinator assignments and active events as the Lead

- **Sprint**: Sprint 3
- **Points**:
- **BDR references**: C-69, T-70, T-73, O-35
- **Owner**:

### User story

As an Event Coordinator Lead, I want to view every coordinator assignment and every active event under my supervision so that I can see workload across the team and step in where needed.

New story from the Week 7 Customer Changes (C-69). Estimate at Sprint 3 planning (T-73). Scenarios tagged "(assumes O-xx)" are written to the default recorded in `docs/bdr/C-open-questions.md`.

### Acceptance criteria

#### Scenario 1 — Every active event and its Coordinator listed

Given events exist in every status When I open the oversight view Then every event whose status is Submitted, Under Review, Awaiting Clarification, Approved, Planning, Safety Review or Confirmed is listed with its assigned Coordinator or "Unassigned", and I can filter by Coordinator and by status

#### Scenario 2 — Workload per Coordinator

Given Coordinators have events assigned When I open the workload summary Then each Coordinator is shown with their count of active events and the list of those events

#### Scenario 3 — One Lead sees everything

Given there is one Event Coordinator Lead in Release 1 When I open the oversight view Then every assignment and active event is included regardless of which Coordinator holds it (assumes O-35)

#### Scenario 4 — Coordinators cannot open the oversight view

Given I am an Event Coordinator When I navigate to the oversight view Then access is refused and the attempt is recorded in the activity log

### Checklist

- See every active event with its assigned Coordinator or Unassigned, filterable by Coordinator and status
- See each Coordinator's active-event count and events
- Confirm the view covers every assignment, not a subset
- Be refused as a Coordinator
