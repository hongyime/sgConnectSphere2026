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
