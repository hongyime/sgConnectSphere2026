# E04-S02 manual run evidence

Record Amareet's T-93 manual run of E04-S02 (story SCRUM-39, run subtask
SCRUM-241), TC_E04S02_01 to _05, against the screens in PR #408. It was stacked
on #408 because together they passed the T-101 limit of 40 files. #408 has
merged and this PR now targets `main`.

All five cases passed on 2 November 2026 on the local Docker database, against
`1f2f149`, before #408's review fixes. The TC_E04S02_05 deletion was first done
on EVT-9402 without screenshots, so a copy, EVT-9403, was set up by hand and the
case repeated for the evidence; the record says so.

## Open

- **TC_E04S02_05 was re-run on the merged code** (record `20261102-232300`), because
  `handNeedsToEvent` (a18b6b2) runs when deleting goes from two Sessions to one. The
  other four cases were not repeated. The merged record `20261102-140900` and an
  earlier PR comment wrongly say the first run does not reach changed code; that
  record cannot be edited.
- **Weak screenshots:** `02-2` (Snipping Tool overlay, reload not visible), `03-1`
  and `03-3` (filled criteria not shown). Any re-run is a new record.
- **`20261102-140900` on main** says test case version 311026; 011126 was in force.
  The E04-S02 cases are identical in both.
- **Story question for Bryan:** after deleting down to one Session, the Event keeps
  its wider time and attendance, the editor still says the Session uses the
  Event's requirements, and the Event can have no primary venue (screenshots
  `05-2` to `05-4`). A new story if it needs changing.
