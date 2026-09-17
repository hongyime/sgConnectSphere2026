# E. Out of the first release

Recorded so a reader can see these were considered and excluded rather than overlooked. 24 stories are held in the product backlog for future releases.

| Epic | Story | Why it is out |
| --- | --- | --- |
| E01 Access & Identity | E01-S05 | Out of Release 1. Bryan (G1): system notifications are required for major events, but preference toggles are left to implementation design. All Release 1 notifications are therefore mandatory. |
| E01 Access & Identity | E01-S06 | Out of Release 1 as a user-facing story. A minimal client organisation entity is still required by E01-S02 and is delivered as part of that story. |
| E01 Access & Identity | E01-S07 | Not among the 20 core features required for the first release; retained as future scope. |
| E01 Access & Identity | E01-S09 | Out of Release 1, retained as future scope. Hsu (G2) confirmed a user may hold different roles depending on organisation structure, so this is a real requirement, not speculation. Release 1 assumes one role per account. |
| E02 Event Request & Submission | E02-S04 | Out of Release 1. Bryan (G1): no System Admin role is in scope for master data maintenance, so category management has no owner. |
| E02 Event Request & Submission | E02-S05 | Not among the 20 core features required for the first release; retained as future scope. |
| E02 Event Request & Submission | E02-S06 | Out of Release 1. Bryan (G1) left permitted file types and size caps to team design, so both are team assumptions: PDF, PNG and JPEG, maximum 300MB per file. Note that 300MB is well above what floor plans and programmes normally require, so be ready to justify it if the customer or an instructor asks. |
| E04 Programme & Sessions | E04-S01 | Out of Release 1. Agenda detail adds no capability the core features require; E04-S02 supplies the session structure that venue and equipment booking depend on. |
| E04 Programme & Sessions | E04-S02 | Withdrawn from Release 1 in version 4. Bryan (G1), Week 4 (C-62): multi-session events must be set up as separate events, and the Organiser creates one event per session. Multi-session was never among the twenty core features in the Week 4 instructions, so this realigns the release with them. Retained here as future scope. Withdrawing it also retires ADR-004 and ADR-005. |
| E05 Venue Catalogue & Availability | E05-S05 | Out of Release 1 on explicit customer instruction. Bryan (G1): 'You do not need to consider turnaround time in your implementation for now.' Haziq (G2): 'You do not need to consider turnaround time for this release.' The venue-blocking checklist previously attached to this story belonged to E05-S04 and has been moved there. |
| E08 Readiness & Confirmation | E08-S01 | Out of Release 1. E08-S03 lists outstanding items when confirmation is blocked, which covers the Release 1 need. |
| E08 Readiness & Confirmation | E08-S02 | Out of Release 1. The team's earlier 10-day urgency threshold is a team assumption, not a customer requirement: Bryan (G1) said reminder and alert timing is left to team assumptions. |
| E10 Changes, Rescheduling & Cancellation | E10-S03 | Out of Release 1. E10-S02 already flags date and time changes for reconfirmation, which covers the core requirement. Bryan (G1) said the re-registration workflow after a reschedule is up to team assumptions. |
| E10 Changes, Rescheduling & Cancellation | E10-S05 | Out of Release 1. E05-S04 already notifies affected Coordinators when a block is created over an upcoming event, and E08-S04 provides the reversion path. |
| E11 Notifications & Reminders | E11-S03 | Out of Release 1. Bryan (G1) said reminder timing parameters are up to team assumptions; the team's earlier 1-week and 3-day figures are assumptions, not customer requirements, and should be recorded as such if this story is scheduled. |
| E11 Notifications & Reminders | E11-S04 | Not among the 20 core features required for the first release; retained as future scope. |
| E12 Calendar, Search & Dashboards | E12-S01 | Not among the 20 core features required for the first release; retained as future scope. |
| E12 Calendar, Search & Dashboards | E12-S02 | Not among the 20 core features required for the first release; retained as future scope. |
| E12 Calendar, Search & Dashboards | E12-S03 | Not among the 20 core features required for the first release; retained as future scope. |
| E12 Calendar, Search & Dashboards | E12-S04 | Out of Release 1 as a story, but Week 1 Section 7 requires the system to be desktop- and mobile-friendly. Treat responsive layout as a definition-of-done item on every UI story rather than a separate deliverable. |
| E13 Reporting & Export | E13-S01 | Out of Release 1. The earlier 6-second generation criterion is a team assumption: Bryan (G1) confirmed exact numerical performance benchmarks are left open. Remove or justify the figure before scheduling. |
| E13 Reporting & Export | E13-S02 | Out of Release 1. The 6-second load criterion for 50 venues is a team assumption, not a customer requirement. |
| E13 Reporting & Export | E13-S03 | Out of Release 1. The earlier checklist specified Badge Name, Ticket Type, Dietary Requirements, Check-in Status, NRIC and billing address. None of these fields appears anywhere in the Week 1 briefing, the Week 4 core features or the customer clarifications. They are inventions and should not be reintroduced without asking the customer. E09-S07 covers viewing registrations in Release 1; only export is deferred. |
| E14 Audit & History | E14-S01 | Out of Release 1. E14-S02 records the actions; presenting a full before-and-after change history is deferred. |
