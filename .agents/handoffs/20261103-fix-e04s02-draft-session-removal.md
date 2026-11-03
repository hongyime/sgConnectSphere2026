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

## Ji Ning's review fixes

- Save draft and Submit are blocked from the start of a delete that would leave one Session
  until the Event's new details are in the form, with a short "saving is paused" message.
- The block stays if the re-read fails. A delete refused by the server unblocks once the
  Session list shows both Sessions are still there. If the reply was lost, or the list can't be
  read, the form re-reads the Event, so a delete that did go through can't be missed.
- The manual record `20261103-143400-amareetkm2024-del-frontend-e2e` and its 18 screenshots
  moved here from #415, byte for byte. Its `pr` field still says 415, because records aren't edited.

## Not done here

- A Save draft already on its way when the delete starts isn't stopped; only saves started
  after it are. Read in the code, not run.

- Editing a sole Session's own details doesn't update the Event, so a later Save
  draft can still put the Event's values back on that Session. That already happens
  without this change and is not part of T-108.

## Commands and outcomes

See the PR's Verification section.
