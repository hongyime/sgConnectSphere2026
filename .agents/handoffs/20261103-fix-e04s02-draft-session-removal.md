# E04-S02: the draft form takes the Event's new details after a Session delete

Follow-up to #415, under E04-S02 (SCRUM-39, reference only). Deleting down to one
Session gives the Event that Session's details (T-108), but an open draft form kept
the old values, so Save draft or Submit sent them back and the 0014 sync trigger
overwrote the remaining Session. Reproduced on a local database through the API:
Session B went from 13 Mar 1:00-4:00 pm, 120, Hall B to 12 Mar 9:00-10:00 am, 40.

## What changed

- `SessionEditor` takes `onSoleSession`, run after a delete leaves one Session.
- `OrganiserRequestFlow` then re-reads the Event and updates the fields a sole
  Session shares with it. Other fields keep what the Organiser typed.
- If that read fails, saving and submitting are blocked with a message to reload,
  because saving the old values would overwrite the Session.
- `sessionSharedFields` and `toLocalInputValue` moved to `OrganiserRequestFlow`, and
  `OrganiserDrafts` reuses them.

## Not done here

- Editing a sole Session's own details doesn't update the Event, so a later Save
  draft can still put the Event's values back on that Session. That already happens
  without this change and is not part of T-108.

## Commands and outcomes

See the PR's Verification section.
