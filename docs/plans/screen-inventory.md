# Release 1 screen inventory

- **Status**: draft for team review
- **Owner**: Amareet (SCRUM-118)
- **Generated from**: `frontend/src/app/routes.tsx` at commit f39e81e plus `docs/backlog/release-1/`
- **Date**: 2026-10-02

This file maps every Release 1 story (47 in total, per the backlog README's
20 September audit) to the role that owns it, the current route or routes
that surface it in the running app, the status of each route (`live`, `mock`,
`coming-soon`, or `none`), and the page pattern from design.md section 4
(`List`, `Detail`, `Form`, `Decision`, plus `Calendar`, `Dashboard` and
`Other` for shapes the four templates do not cover).

It is generated from the code and backlog, not from Amareet's own draft
inventory for SCRUM-118. Amareet's draft is not in the repository, so this
view should be reconciled against it before marking the ticket done.

The authoritative source for routes stays `frontend/src/app/routes.tsx` (one
line per route, with the `status` and `story` recorded there). When a route
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
| E01-S11 | Deactivate my account | system user | Sprint 1 | — | none | Form | No screen yet; expected to live under `/profile` as a danger action. |
| E02-S01 | Submit an event request | Event Organiser | Sprint 1 | `/organiser/new-request` | live | Form | Multi-step request flow. |
| E02-S02 | Save a draft event request | Event Organiser | Sprint 1 | `/organiser/drafts`, `/organiser/drafts/:id` | live, live | List, Form | Drafts list plus draft edit form. |
| E02-S03 | Match accessibility requirements to venue features | Event Organiser | Sprint 1 | — | none | Other | Backend rule; expected to surface in `/organiser/new-request` and `/coordinator/venues`. |
| E03-S01 | Assign an Event Coordinator to a request | Event Organiser | Sprint 2 | `/coordinator`, `/coordinator/queue`, `/coordinator/reassignments`, `/coordinator/events/:eventCode` | live | Dashboard, List, List, Detail | Coordinator workspace covering the whole assignment flow. |
| E03-S02 | Request clarification from the Event Organiser | Event Coordinator | Sprint 2 | `/organiser/requests/:eventCode/clarify` | mock | Form | Organiser-side response; the Coordinator-side ask surfaces inside `/coordinator/events/:eventCode`. |
| E03-S03 | Decide on an event request | Event Coordinator | Sprint 2 | `/coordinator/events/:eventCode/decide` | mock | Decision | Approve, reject with reason, or request clarification. |
| E03-S05 | Track the status of my event | Event Organiser | Sprint 2 | `/events/*`, `/organiser`, `/organiser/requests`, `/organiser/requests/:eventCode` | live | List, Dashboard, List, Detail | Status timeline lives in the request detail. |
| E03-S06 | Discuss an event through comments | Event Organiser | Sprint 2 | — | none | Other | Expected to surface as a comment panel on `/organiser/requests/:eventCode` and `/coordinator/events/:eventCode`; the standalone `/comments` route is a design-review mock. |
| E03-S07 | View and update event information | Event Coordinator | Sprint 2 | `/coordinator/events/:eventCode` | live | Detail | Coordinator editing is folded into the request detail (shipped in #148). |
| E05-S01 | Maintain the venue catalogue | Venue Staff member | Sprint 1 | `/venue/inventory`, `/venue/inventory/new`, `/venue/inventory/:venueId/edit` | live | List, Form, Form | Add, update and retire venues. |
| E05-S02 | Match layout requirements to venue capacity | Venue Staff member | Sprint 1 | `/venue/inventory/new`, `/venue/inventory/:venueId/edit` | live | Form | Layouts are managed inside the venue form (same screens as E05-S01). |
| E05-S03 | View the venue availability calendar | Event Coordinator | Sprint 2 | `/coordinator/calendar`, `/coordinator/venues/:venueId/calendar`, `/venue/availability` | live | Calendar | Shared calendar for Coordinator and Venue Staff audiences. |
| E05-S04 | Block a venue for maintenance | Venue Staff member | Sprint 2 | `/venue/blockout` | mock | List | Skeleton pilot (SCRUM-120); replaces the mock with the real screen built on the shared blocks. |
| E06-S01 | Search for suitable venues | Event Coordinator | Sprint 2 | `/coordinator/venues`, `/coordinator/events/:eventCode/venues` | live | List | Catalogue search with suitability filters. |
| E06-S02 | Check venue suitability against event requirements | Event Coordinator | Sprint 3 | `/coordinator/venues`, `/coordinator/events/:eventCode/venues` | live | List | Suitability flags surface on the search results (same screens as E06-S01). |
| E06-S03 | Request a venue booking | Event Coordinator | Sprint 3 | — | none | Form | Expected to live under `/coordinator/events/:eventCode/venues` or the planning workspace. |
| E06-S04 | Decide on a venue booking request | Venue Staff member | Sprint 3 | `/venue/bookings/:bookingId`, `/venue/bookings/:bookingId/decide` | mock, coming-soon | Detail, Decision | Pending booking detail plus the planned approve-or-reject screen. |
| E06-S05 | Hold a venue tentatively | Event Coordinator | Sprint 3 | — | none | Decision | Expected to surface inside the planning workspace or venue search. |
| E06-S06 | Prevent double-booking of a venue | Venue Staff member | Sprint 3 | — | none | Other | Backend rule; conflicts surface in `/venue/bookings/:bookingId` and the Coordinator venue calendar. |
| E07-S01 | Maintain the equipment catalogue | Technical Support Staff member | Sprint 3 | `/support/catalogue` | mock | List | Add, update and retire equipment. |
| E07-S02 | Request equipment for an event | Event Coordinator | Sprint 3 | `/coordinator/events/:eventCode/plan` | mock | Other | Planning workspace covers equipment, venue and support in one view. |
| E07-S03 | Check equipment availability | Technical Support Staff member | Sprint 3 | `/support/conflicts` | mock | Other | Conflict state surfaces availability clashes. |
| E07-S04 | Reserve equipment for an event | Technical Support Staff member | Sprint 3 | `/support/queue`, `/support/requests/:requestId` | mock | List, Detail | Request queue plus reservation detail. |
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
| E10-S01 | Request a change after submission | Event Organiser | Sprint 4 | `/organiser/requests/:eventCode/change` | mock | Form | Change request form. |
| E10-S02 | Distinguish minor edits from arrangement-affecting changes | Event Coordinator | Sprint 4 | — | none | Other | Backend classification; the result surfaces inside `/coordinator/events/:eventCode`. |
| E10-S04 | Cancel an event | Event Coordinator | Sprint 4 | `/organiser/requests/:eventCode/cancel` | mock | Decision | Organiser-triggered cancellation; the Coordinator decision is expected to surface on the Coordinator request detail. |
| E11-S01 | Notify users about events they are involved in | user involved in an event | Sprint 2 | `/notifications` | live | List | Shared across every signed-in role. |
| E14-S02 | Record significant actions in an activity log | ConnectSphere staff member | Sprint 1 | — | none | List | Backend rule; the standalone `/audit` route is a design-review mock and belongs to no Release 1 story. |

## Routes with no Release 1 story

These routes are registered in `routes.tsx` but no Release 1 story claims
them. They are prototype dashboards, administrator tooling (no Release 1
stories planned), design-review mocks or the shared UI kit; this inventory
lists them so a reader knows they exist and why.

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
| `/admin/audit` | mock | Audit log viewer prototype. |
| `/admin/reports` | mock | Reporting dashboard prototype. |
| `/admin/digest` | mock | Digest preferences prototype. |
| `/admin/recommendations` | mock | Recommendations prototype. |
| `/audit` | mock | Design-review mock for the activity log (E14-S02 is backend-only). |
| `/comments` | mock | Design-review mock for the comments panel (E03-S06 is expected to surface inline, not as a standalone page). |
| `/search` | mock | Design-review mock for a generic search surface. |
| `/ui-states` | mock | Design-review mock showing empty, error and loading states. |

## Counts

- Release 1 stories: 47.
- Routes carrying a Release 1 story: live 23, mock 20, coming-soon 2.
- Release 1 stories with no route (`none`): 18. These are backend rules (visibility, double-booking, capacity, auditing), inline-only surfaces (comments, change classification) and screens not yet in `routes.tsx` (deactivate account, request a booking, hold tentatively, mark equipment unavailable, revert event, complete event, record attendance, view registrations, control registration period). Some stories count as both `live` and `none` because they have one surfaced route and another planned surface; the count above is route-level, not story-level.
- Routes with no Release 1 story: 22 (listed above).

## How to update

Edit `frontend/src/app/routes.tsx` first (change the `status`, add or
remove the `story` reference, or add a new route), then update the
matching row here. Treat `routes.tsx` as the single source of truth for
what the app actually renders.
