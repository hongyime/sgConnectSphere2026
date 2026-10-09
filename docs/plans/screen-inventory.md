# Release 1 screen inventory

- **Status**: draft for team review
- **Owner**: Amareet (SCRUM-118)
- **Audited against**: `frontend/src/app/routes.tsx` and its rendered components at main commit `139217e`, plus `docs/backlog/release-1/`
- **Date**: 2026-10-02
- **E07-S03 branch refresh**: 2026-10-07, SCRUM-53 equipment availability routes; other rows were not re-audited.
- **E07-S04 branch refresh**: 2026-10-08, SCRUM-54 reservation routes; other rows and the counts were not re-audited.
- **Focused refresh**: E05-S04 route status checked against main commit `1c1be82` after PR #185 merged on 2026-10-03; other rows were not re-audited.

This file maps every Release 1 story (47 in total, per the backlog README's
20 September audit) to the role that owns it, the current route or routes
that surface it in the running app, the status of each route (`live`, `mock`,
`coming-soon`, or `none`), and the page pattern from design.md section 4
(`List`, `Detail`, `Form`, `Decision`, plus `Calendar`, `Dashboard` and
`Other` for shapes the four templates do not cover).

This is a manual inventory of the code and backlog, reconciled with Amareet's
SCRUM-118 draft through her review on [PR #183](https://github.com/hongyime/sgConnectSphere2026/pull/183).
Route status describes the screen, not completion of every acceptance criterion
of the associated story. The story owner still verifies its Definition of Done.

The authoritative source for routes stays `frontend/src/app/routes.tsx` (one
entry per route, with the `status` and primary `story` recorded there). A screen
can also serve other stories through inline controls; check its rendered
component before concluding that an untagged story has no screen. When a route
is added, changed or retired, update `routes.tsx` first, then this file.

Related plans: `docs/plans/group-c-per-role-functional-screens.md` seeded the
Coordinator, Venue, Technical Support and Admin surface area; this inventory
should not contradict it. The Admin screens have no Release 1 story and sit
in the second table below.

---

## Stories

| Story | Title | Primary role | Sprint | Route(s) | Status | Page pattern | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| E01-S01 | Log in to the system | Event Organiser | Sprint 1 | `/login`, `/forgot-password`, `/reset-password`, `/home` | live, live, live, redirect | Form | `/home` redirects to the signed-in role's home per `roles.ts`. |
| E01-S02 | Restrict event visibility to my own client | Event Organiser | Sprint 1 | `/events`, `/events/*` | live | List | Visibility is enforced in the API; the Organiser event list surfaces the rule. |
| E01-S03 | Hide internal planning information from Attendees | Attendee | Sprint 1 | `/attendee/events`, `/attendee/events/*`, `/internal/*` | live | List | Hiding is enforced in the API; the Attendee event list is the surface. |
| E01-S04 | Update my account details | system user | Sprint 1 | `/profile` | live | Form | Shared across all roles. |
| E01-S08 | Create an account | Attendee | Sprint 1 | `/register`, `/verify` | live | Form | Two-step: register then verify by email. |
| E01-S11 | Deactivate my account | system user | Sprint 1 | `/profile` | live | Form, Decision | `ProfileForm` includes account deactivation and an explicit confirmation step; covered by `tests/e2e/deactivation.spec.ts`. |
| E02-S01 | Submit an event request | Event Organiser | Sprint 1 | `/organiser/new-request` | live | Form | Multi-step request flow. |
| E02-S02 | Save a draft event request | Event Organiser | Sprint 1 | `/organiser/drafts`, `/organiser/drafts/:id` | live, live | List, Form | Drafts list plus draft edit form. |
| E02-S03 | Match accessibility requirements to venue features | Event Organiser | Sprint 1 | `/organiser/new-request` | live | Form | `OrganiserRequestFlow` loads predefined accessibility features from the API as a checklist. Venue matching surfaces under E06-S01/S02. |
| E03-S01 | Assign an Event Coordinator to a request | Event Organiser | Sprint 2 | `/coordinator`, `/coordinator/queue`, `/coordinator/reassignments`, `/coordinator/events/:eventCode` | live | Dashboard, List, List, Detail | Coordinator workspace covering the whole assignment flow. |
| E03-S02 | Request clarification from the Event Organiser | Event Coordinator | Sprint 2 | `/coordinator/events/:eventCode/clarify`, `/organiser/requests/:eventCode/clarify` | live | Form | `RequestClarification` sends the Coordinator's questions; `AnswerQuestions` submits the Organiser's response. Both routes are live at the audited commit. |
| E03-S03 | Decide on an event request | Event Coordinator | Sprint 2 | `/coordinator/events/:eventCode/decide` | live | Decision | `DecisionPanel` lets the assigned Coordinator approve, or reject with a required reason; "Request clarification" links to E03-S02's question page. The Organiser's request page (`/organiser/requests/:eventCode`) shows a rejection's date and reason. Live since #193. |
| E03-S05 | Track the status of my event | Event Organiser | Sprint 2 | `/events/*`, `/organiser`, `/organiser/requests`, `/organiser/requests/:eventCode` | live | List, Dashboard, List, Detail | Status timeline lives in the request detail. |
| E03-S06 | Discuss an event through comments | Event Organiser | Sprint 2 | `/events/*` | live | Detail | `ClientEvents` shows comments and Add a comment on `/events/:id`; TC_E03S06_01..03 are live in `tests/e2e/e03.spec.ts`. The standalone `/comments` remains a design-review mock. |
| E03-S07 | View and update event information | Event Coordinator | Sprint 2 | `/coordinator/events/:eventCode`, `/events/*` | live | Detail | Coordinator edits in the request detail (#148); the Organiser's Edit event on `/events/:id` (#175). |
| E05-S01 | Maintain the venue catalogue | Venue Staff member | Sprint 1 | `/venue/inventory`, `/venue/inventory/new`, `/venue/inventory/:venueId/edit` | live | List, Form, Form | Add, update and retire venues. |
| E05-S02 | Match layout requirements to venue capacity | Venue Staff member | Sprint 1 | `/venue/inventory/new`, `/venue/inventory/:venueId/edit` | live | Form | Layouts are managed inside the venue form (same screens as E05-S01). |
| E05-S03 | View the venue availability calendar | Event Coordinator | Sprint 2 | `/coordinator/calendar`, `/coordinator/venues/:venueId/calendar`, `/venue/availability` | live | Calendar | Shared calendar for Coordinator and Venue Staff audiences. |
| E05-S04 | Block a venue for maintenance | Venue Staff member | Sprint 2 | `/venue/blockout` | live | Form, List | The live `VenueBlockout` form and block list are in merged PR #185 (SCRUM-120; merge `9584c77`). Route status does not imply the story Definition of Done is met. |
| E06-S01 | Search for suitable venues | Event Coordinator | Sprint 2 | `/coordinator/venues`, `/coordinator/events/:eventCode/venues` | live | List | Catalogue search with suitability filters. |
| E06-S02 | Check venue suitability against event requirements | Event Coordinator | Sprint 3 | `/coordinator/venues`, `/coordinator/events/:eventCode/venues` | live | List | Suitability flags surface on the search results (same screens as E06-S01). This remains a Sprint 3 story; its owner must verify all acceptance criteria before treating it as done. |
| E06-S03 | Request a venue booking | Event Coordinator | Sprint 3 | — | none | Form | Expected to live under `/coordinator/events/:eventCode/venues` or the planning workspace. |
| E06-S04 | Decide on a venue booking request | Venue Staff member | Sprint 3 | `/venue/bookings`, `/venue/bookings/:bookingId`, `/venue/bookings/:bookingId/decide` | live | List, Detail, Decision | `BookingRequests`, `BookingDetail` and `BookingDecision` on the shared blocks (SCRUM-48). The buffered-window check and the Coordinator's switch to a suggested venue are still to come. Route status does not imply the story Definition of Done is met. |
| E06-S05 | Hold a venue tentatively | Event Coordinator | Sprint 3 | — | none | Decision | Expected to surface inside the planning workspace or venue search. |
| E06-S06 | Prevent double-booking of a venue | Venue Staff member | Sprint 3 | — | none | Other | Backend rule; conflicts surface in `/venue/bookings/:bookingId` and the Coordinator venue calendar. |
| E07-S01 | Maintain the equipment catalogue | Technical Support Staff member | Sprint 3 | `/support/catalogue` | mock | List | Add, update and retire equipment. |
| E07-S02 | Request equipment for an event | Event Coordinator | Sprint 3 | `/coordinator/events/:eventCode/plan` | mock | Other | Planning workspace covers equipment, venue and support in one view. |
| E07-S03 | Check equipment availability | Technical Support Staff member | Sprint 3 | `/support/availability`, `/support/conflicts` | live | List, Form | Read-only period check shows total, simultaneous commitments and minimum free quantity; location is informational. |
| E07-S04 | Reserve equipment for an event | Technical Support Staff member | Sprint 3 | `/support/events/:eventCode/equipment`, `/support/events/:eventCode/equipment/:requestId/reserve`, `/support/queue`, `/support/requests/:requestId` | live, live, redirect, redirect | List, Form | Reserve, change and release per request line on E07-S02's event equipment page, plus a reserve form; the old mock queue and reservation detail go to `/support/equipment-requests`. Route status does not imply the story Definition of Done is met. |
| E07-S05 | Mark equipment as unavailable | Technical Support Staff member | Sprint 3 | — | none | Form | Expected to surface inside `/support/catalogue` as an item action. |
| E07-S06 | Request technical support for an event | Event Coordinator | Sprint 3 | `/coordinator/events/:eventCode/plan` | mock | Other | Part of the planning workspace (same screen as E07-S02). |
| E07-S07 | Assign and manage technical staff for an event | Technical Support Staff member | Sprint 3 | `/support/technicians` | mock | List | Technician assignment list. |
| E08-S03 | Confirm an event | Event Coordinator | Sprint 3 | `/coordinator/events/:eventCode/readiness`, `/coordinator/events/:eventCode/confirm` | mock | Other, Decision | Readiness checklist then final confirmation. |
| E08-S04 | Revert a confirmed event to planning | Event Coordinator | Sprint 4 | — | none | Decision | Expected to surface as an action on `/coordinator/events/:eventCode/confirm`. |
| E08-S05 | Complete an event | Event Coordinator | Sprint 4 | — | none | Decision | Expected to surface as an action on the Coordinator request detail. |
| E09-S01 | Register for an event | Attendee | Sprint 4 | `/attendee/discover`, `/attendee/discover/:eventCode`, `/attendee/register/:eventCode` | mock | List, Detail, Form | Discovery, event detail and registration form. |
| E09-S02 | Enforce registration capacity | Event Organiser | Sprint 4 | — | none | Other | Backend rule; capacity reached surfaces in `/attendee/discover/:eventCode` and `/attendee/register/:eventCode`. |
| E09-S03 | Control the registration period | Event Organiser | Sprint 4 | — | none | Form | Expected to surface inside the Organiser request flow or request detail. |
| E09-S04 | Join the waiting list | Attendee | Sprint 4 | `/attendee/waitlist/:eventCode` | coming-soon | Detail | Placeholder page shows the standard ComingSoon summary. |
| E09-S05 | Withdraw my registration | Attendee | Sprint 4 | `/attendee/withdraw/:eventCode` | mock | Decision | Withdrawal confirmation. |
| E09-S06 | Record attendance | Event Coordinator | Sprint 4 | — | none | Form | Expected to live under `/coordinator/events/:eventCode` as an attendance panel. |
| E09-S07 | View registrations for my event | Event Organiser | Sprint 4 | — | none | List | Expected to live under `/organiser/requests/:eventCode` or a dedicated roster screen. |
| E10-S01 | Request a change after submission | Event Organiser | Sprint 4 | `/change-requests/new`, `/organiser/requests/:eventCode/change` | coming-soon, mock | Form | `/change-requests/new` is where restricted edits and the edit API's 409 `changeRequestUrl` send the Organiser until E10-S01 builds the form (#175). |
| E10-S02 | Distinguish minor edits from arrangement-affecting changes | Event Coordinator | Sprint 4 | — | none | Other | Backend classification; the result surfaces inside `/coordinator/events/:eventCode`. |
| E10-S04 | Cancel an event | Event Coordinator | Sprint 4 | `/organiser/requests/:eventCode/cancel` | mock | Decision | Organiser-triggered cancellation; the Coordinator decision is expected to surface on the Coordinator request detail. |
| E11-S01 | Notify users about events they are involved in | user involved in an event | Sprint 2 | `/notifications` | live | List | Shared across every signed-in role. |
| E14-S02 | Record significant actions in an activity log | ConnectSphere staff member | Sprint 1 | `/admin/audit` | mock | List | `AuditLogViewer` is a viewer prototype, not an authorised Admin role or live log reader. Recording and immutability are also part of the story. Pending PR #192 records the Coordinator reader decision and Sprint 3 carryover; reconcile this row after it merges. |

## Routes with no primary story tag

These routes have no primary `story` tag in `routes.tsx`. They are prototype
dashboards, administrator tooling (no Release 1 Admin role), design-review
mocks or the shared UI kit. `/admin/audit` is also mapped to E14-S02 above
as a viewer prototype; listing a prototype does not authorise its role or API.

| Route | Status | Purpose |
| --- | --- | --- |
| `/` | live | Public landing page. |
| `/permission-denied` | live | Standard access-denied page for guarded routes. |
| `/ui-kit` | live | Reference page for the shared building blocks (sample data, no API calls). |
| `/ui-kit/templates/list` | mock | Copyable `ListTemplate` running on in-memory sample data. |
| `/ui-kit/templates/new` | mock | Copyable `FormTemplate` in create mode. |
| `/ui-kit/templates/items/:id` | mock | Copyable `DetailTemplate`. |
| `/ui-kit/templates/items/:id/edit` | mock | Copyable `FormTemplate` in edit mode. |
| `/ui-kit/templates/items/:id/decide` | mock | Copyable `DecisionTemplate`. |
| `/attendee/feedback/:eventCode` | mock | Attendee feedback form; no Release 1 story owns it. |
| `/venue` | mock | Venue Staff dashboard prototype. |
| `/support` | mock | Technical Support dashboard prototype. |
| `/admin` | mock | Administrator dashboard prototype (no Release 1 story planned for Admin). |
| `/admin/users` | mock | User management prototype. |
| `/admin/users/:userId/role` | mock | Role assignment prototype. |
| `/admin/audit` | mock | `AuditLogViewer` prototype associated with E14-S02 above; no primary route story tag or authorised Admin reader. |
| `/admin/reports` | mock | Reporting dashboard prototype. |
| `/admin/digest` | mock | Digest preferences prototype. |
| `/admin/recommendations` | mock | Recommendations prototype. |
| `/audit` | mock | Generic `AuditHistory` design-review mock, distinct from the `/admin/audit` viewer prototype. |
| `/comments` | mock | Standalone comments design-review mock; E03-S06 is implemented inline on `/events/*`. |
| `/search` | mock | Design-review mock for a generic search surface. |
| `/ui-states` | mock | Design-review mock showing empty, error and loading states. |

## Counts

- Release 1 stories: 47.
- Routes with a primary Release 1 story tag: live 32, mock 17, coming-soon 3, redirect 1 (53 total).
- Release 1 stories with no current route (`none`): 11, counted from the story table. These are E06-S03/S05/S06, E07-S05, E08-S04/S05, E09-S02/S03/S06/S07 and E10-S02. A proposed future surface in the Notes column is not counted as a current route.
- Routes with no primary story tag: 22 (listed above). Together with the 53 tagged routes, this accounts for all 75 entries in `routes.tsx` at `139217e`.
- Route counts count each registered path once. Story rows may share a route, so route totals and story totals measure different things.

## How to update

Edit `frontend/src/app/routes.tsx` first (change the `status`, add or
remove the `story` reference, or add a new route), then update the
matching row here. For inline features, also inspect the component rendered
by the route. Recount the story rows and route entries separately, record
the audited commit, and keep unmerged proposals labelled as pending.
