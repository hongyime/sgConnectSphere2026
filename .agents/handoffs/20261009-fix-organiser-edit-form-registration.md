# Organiser edit form: registration setup and date layout

Fix two gaps in the E03-S07 (SCRUM-37) event edit form found during the
E14-S02 manual run (PR #240 follow-ups): the Organiser could not edit
"Registration setup", and the registration date labels were laid out wrongly
("Opens" pushed outside its box). Follow-up to #175 (Organiser editing) and
#132 (edit endpoint). Owners of the original work: Xiang Ying (#175) and
Amareet (#148, #176).

## Done

- Backend `updateEventInformation` (`backend/src/modules/eventVisibility/service.ts`)
  accepts `registrationSetup`. It is editable by the Organiser before approval
  and restricted after it, like the other requirement fields. It is written to
  `registration_setup`, trimmed, must not be empty, and is audited as
  `Record updated` / `registrationSetup`.
- `getEvent` lists `registrationSetup` in `editableFields` before approval.
- Frontend `EventEditForm` shows a "Registration setup" textarea under
  Registration. The Coordinator form allows it too (E03-S07 Scenario 2, "any
  field").
- The registration dates are now two ordinary fields, "Registration opens" and
  "Registration closes", side by side in the section grid. The nested
  fieldset is gone: the shared `.ui-form-section legend` rule floated its
  legend and pushed "Opens" out of line. No CSS was added.
- Fixtures that copy the backend's editable list (RejectedRequest test, e03
  e2e helper, decisionBackend helper) include `registrationSetup`.

## Not done / for the owners

- `.ui-form-section legend` in `frontend/src/shared/shared.css` matches nested
  legends. Narrowing it to `> legend` is the skeleton owner's call.
