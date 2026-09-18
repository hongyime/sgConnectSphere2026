# C. Open questions and standing assumptions

Items marked Closed were answered by the customer and are retained so the history is visible. Everything else is still carried as a team assumption. Priority reflects how many stories the answer would touch.

| ID | Topic | Where it stands | Refs | Priority |
| --- | --- | --- | --- | --- |
| O-01 | Performance figures | CLOSED in version 5. Team decision T-51: under three seconds for venue search, calendar load and registration submission, recorded in the Definition of Done. No numerical benchmark exists for venue search, calendar load or registration. No release-1 criterion contains one, deliberately. | C-27 | Closed |
| O-02 | Account lockout policy | CLOSED in version 5. Team confirmed the assumption: 5 consecutive failures, emailed reset link. On 18 September 2026, the team confirmed a 30-minute lock with automatic expiry; password reset remains an alternative recovery path. See [ADR-016](../adr/ADR-016-thirty-minute-login-lockout.md). | C-30, T-38 | Closed |
| O-03 | Coordinator assignment basis | CLOSED in version 4 by C-55. The team may choose the rule provided it is fair; fewest active events stands. The system auto-assigns, but no rule was given. Assumed fewest active events. | C-12, C-41, T-14 | Closed |
| O-04 | Reassignment authority | CLOSED in version 4 by C-56. The assigned Coordinator initiates, agreed offline, and the new Coordinator accepts. Assumed only the currently assigned Coordinator may reassign. | T-15 | Closed |
| O-05 | Registration data fields | CLOSED in version 5. Team decision: name, email address and contact number. Assumed name and email only, on PDPA grounds. | C-26, T-32 | Closed |
| O-06 | Mandatory rejection reason | CLOSED in version 5. Team confirmed a rejection reason is mandatory. Assumed required. | C-09, T-39 | Closed |
| O-07 | Session capacity rule | CLOSED in version 4 by C-58. Capacity is the booked venue's capacity; expected attendance is a planning input only. Assumed the lower of the Organiser limit and venue capacity. | C-05, T-31 | Closed |
| O-08 | Attachment types and size | Assumed PDF, PNG, JPEG at 300MB. The size is well above what the stated use cases need. | C-31, T-40 | Low |
| O-09 | Reversing a rejection | CLOSED in version 5. Team confirmed Rejected is terminal; a rejected request is resubmitted as a new one. Assumed terminal. The customer left it open. | C-11, T-41 | Closed |
| O-10 | Multi-session venue rules | CLOSED in version 4 by C-62. There are no multi-session events; each session is set up as a separate event. Assumed each session books independently. Splitting rules were undiscussed. | C-19, T-21 | Closed |
| O-11 | Reminder timing | Left to the team. E11-S03 is out of scope, so no figure was invented. | C-28 | Low |
| O-12 | Clashing registrations | Not detected. Left to developer assumptions and not built. | C-43 | Low |
| O-13 | Event category management | No System Admin role in scope, so E02-S04 is deferred and vocabularies are seeded by migration. | C-32 | Low |
| O-14 | Status vocabulary divergence | CLOSED in version 5. Team confirmed the fuller status list and will defend the divergence from C-49. The team adopted the fuller Week 4 list over the four statuses Claris named. A deliberate, documented divergence. | C-49, T-01 | Closed |
| O-15 | Registration window level | CLOSED in version 4. With sessions withdrawn, registration windows and capacity both sit at event level. Assumed event level while capacity is session level. | C-44, T-42 | Closed |
| O-16 | Waiting list lead time | CLOSED in version 5. Team confirmed no hold window: all waitlisted Attendees are notified and the place is claimed first-come. Left to the team. The design avoids needing one by notifying all waitlisted Attendees and awarding the place first-come. | C-23, T-33 | Closed |
| O-17 | Scalability targets | CLOSED in version 5. Team confirmed the design scale: roughly 500 internal staff and three years of growth, per C-64. Not finalised by the customer. No capacity figure appears anywhere. | C-03 | Closed |
| O-18 | Re-registration after a reschedule | Left to the team. E10-S03 is out of scope. | C-25 | Low |
| O-19 | Ad-hoc live technical support | Not specified. Out of scope. | C-42 | Low |
