# E07-S06 technical support request frontend (SCRUM-146)

Goal: the screens for E07-S06 "Request technical support for an event"
(story SCRUM-56, subtask SCRUM-146). The assigned Coordinator sees a
Technical support card on the event page, requests support on a form, or
marks the event as needing none. Stacked on the SCRUM-145 backend (#222);
open as a Draft into `main` until #222 merges, then merge `main` in.
Owner: Amareet.

## Done

- `frontend/src/features/coordinator/supportApi.ts`: GET/POST against
  `/api/venues?task=support`. A reply without a `requests` list counts as
  a failed load, so the card can't take the event page down.
- `frontend/src/features/coordinator/TechnicalSupport.tsx`:
  - `TechnicalSupportCard` on `/coordinator/events/:eventCode`, shown for
    approved, planning, confirmed and completed events
  - `SupportRequestForm` at `/coordinator/events/:eventCode/support`, which
    starts from the event's times
- `CoordinatorWorkspace.tsx` renders the card under Request details. The
  card's key is `support-<id>`; reusing the details panel's key broke the
  edit form.
- `CoordinatorEditing.test.tsx`: its catch-all fake now answers the support
  read like the real endpoint.
- 12 Vitest cases, 100% coverage of the two new files.
- A real-stack dry run (local Docker database `connectsphere_dev_stack`)
  passed all six checks.

## Next

- SCRUM-147: write the E07-S06 click-through script using the seeded
  accounts (see `docs/testing/test-accounts.md`, PR #224). Amareet runs it
  by hand and records it as a manual `frontend/e2e` run, filling in the
  actual result on every row (PR #223).
- Local API on 127.0.0.1:5173 needs
  `ADDITIONAL_ALLOWED_ORIGINS=http://127.0.0.1:5173`, otherwise sign-in is
  rejected by the origin check.
