# E10-S05 combined manual acceptance

Run against the combined integration branch on a disposable local database.
Use the canonical TC_E10S05_01–04 in `docs/testing/cases/E10.md` for acceptance.
These steps are a guide, not a completed run or substitute for those cases.

## Preconditions

- An active assigned Coordinator, the Organiser, Venue Staff and a registered Attendee.
- A published, Confirmed Event with a Confirmed primary venue booking, future dates and known requirements.
- An available replacement venue with assigned Venue Staff.
- Record initial Event details, publication venue and notification counts.

## Human run

1. As Venue Staff, create unavailability overlapping the original booking.
   Confirm the Coordinator receives the loss notice, the booking becomes Conflicting,
   the Event becomes Planning, and its original details remain intact (TC_01).
2. As Coordinator, open the Event's **Venue bookings**, then its recovery link.
   Check the reason/category, unavailable period, original venue and booking dates.
   Start the same-Event venue search and check the preserved requirements (TC_02).
3. Request a replacement. Check that the original remains Conflicting, publication
   still names the original venue, and no public venue-change notification appears.
   Cancellation of the original must remain unavailable before confirmation (TC_03/04).
4. As Venue Staff, reject the replacement. As Coordinator, request a retry from
   recovery. Approve that retry as Venue Staff. Check publication now names the
   replacement and the Organiser/registered Attendee receive the venue-change notice
   only at this point. Check the Coordinator's approval notice and retained rejection history.
5. Lift the original unavailability as Venue Staff. Confirm the original still
   remains Conflicting, the replacement remains Confirmed and publication is unchanged.
   Check no duplicate public venue-change notice appears.
6. As Coordinator, explicitly cancel the original lost booking. Check it is Released,
   the replacement remains Confirmed, and the Event remains Planning.

Save hand-taken screenshots by TC_ID under
`docs/testing/runs/evidence/<manual-record-filename-without-md>/`.
Create the manual T-65 record from observed results only. Capture the tested commit,
roles, observed notice timing and any refresh needed. Do not mark the story Done
before independent review and PO/documented delegate acceptance.
