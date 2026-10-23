# E10-S04 human manual acceptance

SCRUM-73. Human manual execution and T-93 screenshots remain pending. Automated
browser images are explicitly not manual screenshots. Test only the reviewed
application head plus verified migration 0022; record both source heads. Never
reset or seed a shared/production database for these cases.

Use a disposable local PostgreSQL stack with two Sessions for one Planning or
Confirmed event. Prepare a confirmed venue booking and reserved equipment on
each Session, assigned venue and technical staff, one registered and one waitlisted
attendee with a public snapshot, two additional Pending change requests and one
non-Pending request. Fixture setup is separate from human UI observations.
The dedicated automated browser test creates a similar fixture locally; it does
not substitute for performing this checklist by hand.

Seeded local accounts: Organiser organiser_a@clienta.com; Coordinator
coord_a@connectsphere.com; second Coordinator coord_b@connectsphere.com;
Venue Staff venue_a@connectsphere.com; technician tech_a@connectsphere.com.
Use the public seed test password from tests/seed/SEED_DATA.md. Do not capture
passwords in screenshots. Normal/private browser windows keep roles separate.

| Case | Human action | Observe and capture |
| --- | --- | --- |
| TC_E10S04_05 | Owning Organiser opens `/organiser/requests/<code>/cancel`, requests cancellation with a reason | Request confirmation, event still Planning/Confirmed, resources still committed; Coordinator inbox notice. Save 05-1 and 05-2 |
| TC_E10S04_01 | Assigned Coordinator opens `/coordinator/events/<code>/cancel`; inspect Organiser reason, open confirmation; try empty reason, cancel panel, then confirm with a reason | Required reason; no write when backing out; final Cancelled result. Save 01-1 and 01-2 |
| TC_E10S04_01 | Inspect both Sessions' venue/equipment records, venue calendar and Technical Support availability for the same periods | All active arrangements Released; free availability restored; affected staff notices. Capture enough images for both Sessions and each reader, 01-3 onward |
| TC_E10S04_03 | Sign in separately as registered attendee and waitlisted attendee; open notifications | Each receives cancellation notification without internal planning text; capture 03-1 and 03-2 |
| TC_E10S04_04 | Reload Coordinator, owning Organiser and registered-attendee event views; attempt old edit actions/API writes separately if authorised | Reason/date retained; no edit/comment controls; server refuses writes; other users retain only their existing authorised access. Capture 04-1 onward |
| TC_E10S04_06 | Open the cancellation page as the owning Organiser or assigned Coordinator and inspect Change request history | Each Pending request is Obsolete with actor/time and Pending-to-Obsolete history, not Rejected; non-Pending requests unchanged. Capture 06-1 onward; distinguish SQL inspection from a human screen observation |
| MULTIPLE | Repeat cancellation; open an unassigned event as Coordinator B; inspect at 393px | No duplicate notices/history; access refused; reason and confirmation fit the screen. Record observed results and limits |

Canonical E10.md currently places a second happy-path narrative inside TC_01
without a separate TC_02 heading; this guide retains its actual published IDs.
The cancellation page displays only the Pending-to-Obsolete transitions made for
this event. The broader E10-S01 request-management UI remains a separate story.

Store original human PNG/JPG files below 1000 KB under
`docs/testing/runs/evidence/<actual-session-stem>/`, named `TC_E10S04_01-1.png`,
etc. Create one T-65 manual record with actual time/head/tester and observed
outcomes; do not fill PASS in advance. The implementation PR remains draft until
human acceptance and independent review are complete. Do not merge #298 merely
because cancellation code exists; execute its actual TC_E06S04_07 integration.
