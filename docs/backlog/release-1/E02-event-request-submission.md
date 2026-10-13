# E02 — Event Request & Submission

## E02-S01 — Submit an event request

- **Sprint**: Sprint 1
- **Points**: 5
- **BDR references**: C-36, T-11, T-12
- **Owner**: Aaron

### User story

As an Event Organiser, I want to submit an event request so that ConnectSphere can begin planning my event.

### Acceptance criteria

#### Scenario 1 — Complete request submitted

Given I am signed in as an Event Organiser and every mandatory field is complete When I submit the request Then its status becomes Submitted and I receive confirmation

#### Scenario 2 — Missing mandatory fields blocked

Given one or more mandatory fields are empty When I try to submit Then submission is blocked and every missing field is identified

#### Scenario 3 — Past date blocked

Given I enter a preferred date in the past When I try to submit Then submission is blocked with an explanation

#### Scenario 4 — None required satisfies a field

Given my event needs no equipment When I select 'none required' for that field Then the field counts as complete and submission proceeds

### Checklist

- Enter all ten mandatory fields: event name, description, purpose, preferred dates and times, expected attendance, venue requirements, accessibility needs, equipment requirements, layout preference, registration setup
- Be blocked from submitting while any mandatory field is empty, with each missing field named
- Select 'none required' for equipment, layout or registration setup where the event does not need them
- Be blocked from submitting a preferred date in the past
- See the status change to Submitted and receive confirmation

## E02-S02 — Save a draft event request

- **Sprint**: Sprint 1
- **Points**: 3
- **BDR references**: -
- **Owner**: Aaron

### User story

As an Event Organiser, I want to save an incomplete event request as a draft so that I can gather the missing information and complete it later.

### Acceptance criteria

#### Scenario 1 — Draft saved and hidden from Coordinators

Given I have partially completed a request When I save it as a draft Then it is stored with status Draft and is not visible to Event Coordinators

#### Scenario 2 — Draft reopened with values restored

Given I have a saved draft When I reopen it Then all previously entered values are restored

#### Scenario 3 — Draft deleted

Given I have a draft I no longer need When I delete it Then it is removed from my list and is not counted as an active request

#### Scenario 4 — Completed draft submitted

Given a draft has every mandatory field complete When I submit it Then it follows E02-S01 and its status becomes Submitted

### Checklist

- Save an event request without completing all mandatory fields
- View all of my saved drafts, distinguishable from submitted requests
- Reopen a draft and see previously entered values pre-filled
- Continue editing a saved draft
- Delete a draft I no longer need
- Confirm that Event Coordinators cannot see my drafts

## E02-S03 — Match accessibility requirements to venue features

- **Sprint**: Sprint 1
- **Points**: 1
- **BDR references**: T-13, T-45, B-06
- **Owner**: Aaron

### User story

As an Event Organiser, I want to record the accessibility requirements for my event so that ConnectSphere only offers venues that can meet them.

### Acceptance criteria

#### Scenario 1 — Predefined requirements stored

Given I am creating an event request When I select one or more accessibility requirements from the predefined list Then they are stored with the request and shown to the assigned Event Coordinator

#### Scenario 2 — Free-text captured but not matched

Given my requirement is not in the predefined list When I enter it in the free-text box Then it is stored and shown to the Coordinator, and is excluded from automated venue matching

#### Scenario 3 — Search filters on predefined requirements

Given predefined accessibility requirements are recorded for an event When a venue search is run for the event Then venues that do not meet them are excluded or clearly marked unsuitable

### Checklist

- Select one or more accessibility requirements from the predefined list
- Enter an additional requirement in a free-text box
- See the free-text entry passed to the Coordinator but not used for automated matching
- Confirm that predefined requirements filter the venue search results

## E02-S05 — Reuse a previous event's details

- **Sprint**:
- **Points**: 3
- **BDR references**: C-74, T-79, T-87, T-90, O-51
- **Owner**:

### User story

As an Event Organiser, I want to create a new request by copying a previous event so that I do not re-enter the same information for a recurring event.

### Acceptance criteria

#### Scenario 1 — Previous event copied

Given I choose one of my own completed or past events When I copy it Then ConnectSphere creates a new draft with the event requirements and Session structure copied, all event and Session dates/times left blank, and no bookings, reservations, or registrations carried over (assumes O-51)

#### Scenario 2 — Missing reference flagged

Given the copied event references a venue or equipment item that no longer exists When the draft is created Then the affected requirement is flagged for review and identifies its Session rather than being copied silently

#### Scenario 3 — Dates remain subject to current submission policy

Given I later submit the copied draft When I enter event and Session dates Then the current E02-S01 and E02-S07 validation applies; copying does not bypass the two-year horizon or the Coordinator feasibility review

### Checklist

- Copy one of my own completed or past events into a new draft
- Confirm requirements and Session structure are copied while event and Session dates/times are blank
- Confirm bookings, equipment reservations and registrations are not copied (assumes O-51)
- See unavailable venue/equipment references flagged against the relevant Session
- Submit a copied draft subject to the current date rules

## E02-S07 — Validate the event date horizon

- **Sprint**:
- **Points**:
- **BDR references**: C-71, C-72, T-87
- **Owner**:

### User story

As an Event Organiser, I want to submit a request without a fixed minimum lead time while dates more than two years ahead are rejected so that a Coordinator can assess feasibility within a bounded planning horizon.

### Acceptance criteria

#### Scenario 1 — No fixed minimum lead time

Given a requested event date is not in the past and is within the permitted horizon When I submit the request Then ConnectSphere does not reject it solely because it is fewer than a fixed number of days or months away; the assigned Coordinator assesses feasibility

#### Scenario 2 — Dates beyond two years rejected

Given any requested event or Session date is later than two calendar years after the Singapore-local submission date When I submit the request Then submission is blocked and the out-of-range date is identified

#### Scenario 3 — Two-year boundary accepted

Given every requested event and Session date is on or before the date two calendar years after the Singapore-local submission date When I submit an otherwise valid request Then the date-horizon check passes

#### Scenario 4 — Past Event date rule preserved

Given the requested Event date is in the past When I submit the request Then E02-S01 past-date validation still blocks it

#### Scenario 5 — Past Session date rejected

Given any requested Session date is in the past When I submit the request Then submission is blocked and the past Session date is identified

### Checklist

- Submit a feasible request without an invented minimum lead time
- Be blocked when any Event or Session date exceeds two calendar years from submission
- Pass the exact two-year boundary
- Confirm a past Event date remains blocked by E02-S01
- Be blocked when any Session date is in the past
