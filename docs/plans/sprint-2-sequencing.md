# Sprint 2 sequencing and notification routing

Sprint 2 goal: **Coordinators review, decide on, and discuss event requests
against a live venue availability calendar, with every key action notified to
affected users.**

Committed: ~33 points (12 carryover + 12 must + 9 should). Stretch: 13 points.

## Recommended implementation order

Stories are grouped into waves. Within a wave, stories can be worked in
parallel. Each wave's dependencies are satisfied by the previous wave.

### Wave 0 — Carryover (week 1, days 1–3)

| Story | Pts | Owner | First slice |
| --- | ---: | --- | --- |
| E01-S04 SCRUM-19 | 1 | — | Amend backlog AC per T-61; rename TC_E01S04_01; mark Done |
| E02-S01 SCRUM-26 | 5 | — | Write `eventLifecycle.integration.test.ts` (SCRUM-110); close SCRUM-109 local-dev side |
| E02-S02 SCRUM-27 | 3 | — | Retrospective code review by any teammate (not Bryan, not Aaron) |
| E14-S02 SCRUM-86 | 3 | — | Build `GET /api/admin/audit`; wire `AuditLogViewer` to real endpoint; add immutability guard; un-skip TC_E14S02_01/02/04/05 |

### Wave 1 — E03 foundation + notifications infrastructure (week 1, days 2–5)

Start E03-S05 first — it establishes the E03 module structure that S01/S02/S03/S06/S07 all build on.

| Story | Pts | Owner | First slice |
| --- | ---: | --- | --- |
| E03-S05 SCRUM-35 Track status | 1 | — | `GET /api/events/:id/status` read endpoint + organiser-facing status display. Data layer is complete (status + audit_logs writes exist). Easiest story in the sprint. |
| E11-S01 SCRUM-75 Notifications | 5 | — | `GET /api/notifications` (in-app list, read/unread); wire `insertNotificationDelivery` into E03-S01 as the first business-event trigger; enable `NOTIFICATION_RELAY_ENABLED` + schedule worker cron in `vercel.json`. See routing table below. |

### Wave 2 — Coordinator workflow (week 1–2, days 4–9)

All depend on E03-S05's module structure. E03-S01/S02/S03 can run in parallel.

| Story | Pts | Owner | First slice |
| --- | ---: | --- | --- |
| E03-S01 SCRUM-32 Assign coordinator | 3 | — | Fewest-active-events query + assignment endpoint + status → Under Review + notification call |
| E03-S02 SCRUM-33 Request clarification | 3 | — | Insert clarification thread into `event_threads` + status → Awaiting Clarification + notification to organiser |
| E03-S03 SCRUM-34 Decide on request | 3 | — | Completeness check + approve/reject endpoint + mandatory rejection reason + notification to organiser |
| E03-S06 SCRUM-36 Comments | 3 | — | Insert comment thread + chronological read + notification to coordinator |

### Wave 3 — Venue + coordinator editing (week 2, days 8–13)

| Story | Pts | Owner | First slice |
| --- | ---: | --- | --- |
| E05-S03 SCRUM-42 Venue calendar | 5 | — | Availability query joining `venue_bookings` + `venue_blocks` by date range; four-state display (Free/Tentative/Confirmed/Blocked) |
| E03-S07 SCRUM-37 View/update info | 5 | — | Post-approval coordinator edit path + restricted-field enforcement; E10-S01 redirect is a known stub |

### Stretch

| Story | Pts | Owner | First slice |
| --- | ---: | --- | --- |
| E05-S04 SCRUM-43 Block venue | 3 | — | Create block + conflict detection + coordinator notification |
| E06-S01 SCRUM-45 Search venues | 5 | — | Extend `searchVenues()` with date-range + availability filter. **Needs team clarification on "near match" algorithm (Scenario 2).** |

## Notification routing table (for E11-S01 implementer)

Every row is a business event that must call `insertNotificationDelivery`
inside its database transaction. The E11-S01 implementer uses this table to
wire the calls; story implementers use it to verify their transaction includes
the right notification.

| Business event | Source story | Trigger | Who is notified | Channel |
| --- | --- | --- | --- | --- |
| Event submitted | E02-S01 | Status → Submitted | Auto-assigned coordinator (via E03-S01) | in-app + email |
| Coordinator assigned | E03-S01 | `coordinator_id` set on event | Assigned coordinator | in-app + email |
| Clarification requested | E03-S02 | Status → Awaiting Clarification | Organiser | in-app + email |
| Clarification responded | E03-S02 | Status → Under Review (from Awaiting Clarification) | Assigned coordinator | in-app + email |
| Event approved | E03-S03 | Status → Approved | Organiser | in-app + email |
| Event rejected | E03-S03 | Status → Rejected | Organiser | in-app + email |
| New comment | E03-S06 | Comment thread inserted | Other party (coordinator if organiser comments, organiser if coordinator comments) | in-app + email |
| Event info updated | E03-S07 | Event fields changed post-approval | Organiser (if coordinator edits) or coordinator (if organiser edits unrestricted fields) | in-app |
| Venue blocked | E05-S04 | `venue_blocks` row created over a confirmed/pending booking | Affected event's coordinator(s) | in-app + email |
| Status change (generic) | E03-S05 | Any status transition | Organiser + assigned coordinator | in-app |

**Not in Sprint 2** (deferred with their parent stories):
- Booking decision (E06-S04, Sprint 3) → organiser + coordinator
- Registration confirmation (E09-S01, Sprint 3) → attendee
- Place released from waitlist (E09-S04, Sprint 3) → waitlisted attendees

## Open question for team

**E06-S01 Scenario 2 "near match" algorithm**: the AC says "near matches are
returned rather than an empty result" but does not define which criteria are
relaxed or in what order. Before anyone picks up E06-S01, the team must agree:

- Option 1: relax capacity first (show venues within 120% of required attendance), then relax layout
- Option 2: drop one filter at a time in priority order (accessibility → layout → capacity) until results appear
- Option 3: always return top 10 by name regardless of filters, with a "does not meet requirements" flag

Record the decision as a BDR entry (e.g. T-63) before implementation starts.
