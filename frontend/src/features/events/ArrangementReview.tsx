// E10-S02 (SCRUM-237) Scenarios 3 and 4: before the Coordinator's change takes
// effect, show the Session venue bookings and equipment reservations it
// affects and any over-subscription. Nothing is saved until they confirm.
import { Alert, ConfirmPanel } from '../../shared';
import type { AffectedBooking, ChangeCheck, ImpactReason, OverSubscription } from './eventEditApi';

const TIME = 'date or time changed';

function bookingReasons(booking: AffectedBooking) {
  return booking.reasons.map((reason: ImpactReason) => reason === 'time'
    ? TIME
    : `${booking.governingHeadcount} people for ${booking.capacity} places`).join('; ');
}

function overText(over: OverSubscription) {
  return `${over.scope === 'event' ? 'The whole event' : 'A Session'}: ${over.registered} registered for ${over.capacity} places.`;
}

// Who the save will ask to reconfirm, matching the backend's notice routing.
export function staffToNotify(check: ChangeCheck) {
  return [
    check.impact.bookings.length > 0 ? 'Venue Staff' : null,
    check.impact.reservations.length > 0 ? 'Technical Support Staff' : null,
  ].filter(Boolean).join(' and ');
}

export function ArrangementReview({ check, busy, onConfirm, onCancel }: {
  check: ChangeCheck;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { bookings, reservations } = check.impact;
  return (
    <ConfirmPanel
      title="Check what this change affects"
      confirmLabel={check.impact.affected ? 'Save and ask staff to reconfirm' : 'Save changes'}
      busyLabel="Saving…"
      busy={busy}
      onConfirm={onConfirm}
      onCancel={onCancel}
      description={<>
        {bookings.length > 0 ? <>
          <h3>Venue bookings to reconfirm</h3>
          <ul>{bookings.map(booking => <li key={booking.id}><strong>{booking.venueName}</strong>: {bookingReasons(booking)}</li>)}</ul>
        </> : null}
        {reservations.length > 0 ? <>
          <h3>Equipment to reconfirm</h3>
          <ul>{reservations.map(reservation => <li key={reservation.id}><strong>{reservation.equipmentName}</strong>: {TIME}</li>)}</ul>
        </> : null}
        {check.impact.affected ? <p>Saving flags these for reconfirmation and notifies the {staffToNotify(check)}.</p> : null}
        {check.overSubscription.length > 0 ? (
          <Alert tone="warning" title="More people are registered than there are places">
            {check.overSubscription.map(over => <span key={`${over.scope}-${over.sessionId ?? 'event'}`}>{overText(over)} </span>)}
            No one will be removed or moved to the waiting list.
          </Alert>
        ) : null}
        <p>Cancel goes back to your edits without saving.</p>
      </>}
    />
  );
}
