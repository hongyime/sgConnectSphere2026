# SCRUM-37 / E03-S07 Organiser editing status

Updated 2 October 2026 for the Organiser editing follow-up.

## Delivered in this PR

- Added the Organiser event edit action on `/events/:id`.
- Reused the shared event edit form for pre-approval editing of all supported
  event fields.
- Added registration opening and closing date inputs.
- Applied the backend-provided `editableFields` list after approval, keeping
  restricted fields read-only and linking them to the future E10-S01 change
  request flow.
- Activated and passed `TC_E03S07_01`, `_03`, `_04`, and `_06` in the browser
  acceptance suite.

## Scope boundary

The backend edit endpoint and organiser read/activity-log contract were already
delivered by #132 and #161. E10-S01's full change-request form is not part of
this PR; the Organiser UI provides the required handoff link for restricted
post-approval fields until that story is implemented.

The acceptance tests use the repository's seeded browser mock harness. A live
Supabase run is not required for this frontend change; backend database evidence
remains recorded in the backend PRs.
