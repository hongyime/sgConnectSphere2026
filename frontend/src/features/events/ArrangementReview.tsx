// E10-S02 (SCRUM-237) Scenarios 3 and 4: before the Coordinator's change takes
// effect, show the Session venue bookings, equipment reservations and staffed
// Technical Support (T-104) it affects and any over-subscription. Nothing is
// saved until they confirm.
import { arrangementReasons } from './arrangementReasons';
import { Alert, ConfirmPanel, formatDateRange } from '../../shared';
import type { AffectedSupport, ChangeCheck, OverSubscription } from './eventEditApi';

// Where the request moves when reconfirmed: the same length, shifted.
function supportMove(support: AffectedSupport) {
  if (support.shiftMs === 0) return `${formatDateRange(support.startsAt, support.endsAt)}, time stays the same`;
  const shifted = (value: string) => new Date(new Date(value).getTime() + support.shiftMs).toISOString();
  return `${formatDateRange(support.startsAt, support.endsAt)} → ${formatDateRange(shifted(support.startsAt), shifted(support.endsAt))}`;
}

function overText(over: OverSubscription) {
  return `${over.scope === 'event' ? 'The whole event' : 'A Session'}: ${over.registered} registered for ${over.capacity} places.`;
}

// Who the save will ask to reconfirm, matching the backend's notice routing.
export function staffToNotify(check: ChangeCheck) {
  return [
    check.impact.bookings.length > 0 ? 'Venue Staff' : null,
    check.impact.reservations.length > 0 || (check.impact.supports ?? []).length > 0 ? 'Technical Support Staff' : null,
  ].filter(Boolean).join(' and ');
}

export function ArrangementReview({ check, changed = false, busy, onConfirm, onCancel }: {
  check: ChangeCheck;
  // The save was refused because this list changed after the first check.
  changed?: boolean;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { bookings, reservations, supports = [] } = check.impact;
  return (
    <ConfirmPanel
      title="Check what this change affects"
      confirmLabel={check.impact.affected ? 'Save and ask staff to reconfirm' : 'Save changes'}
      busyLabel="Saving…"
      busy={busy}
      onConfirm={onConfirm}
      onCancel={onCancel}
      description={<>
        {changed ? <Alert tone="warning">What this change affects has changed since you checked. Review the updated list before saving.</Alert> : null}
        {bookings.length > 0 ? <>
          <h3>Venue bookings to reconfirm</h3>
          <ul>{bookings.map(booking => <li key={booking.id}><strong>{booking.venueName}</strong>: {arrangementReasons(booking)}</li>)}</ul>
        </> : null}
        {reservations.length > 0 ? <>
          <h3>Equipment to reconfirm</h3>
          <ul>{reservations.map(reservation => <li key={reservation.id}><strong>{reservation.equipmentName}</strong>: {arrangementReasons(reservation)}</li>)}</ul>
        </> : null}
        {supports.length > 0 ? <>
          <h3>Technical Support to reconfirm</h3>
          <ul>{supports.map(support => <li key={support.id}><strong>{support.description || 'Technical support'}</strong>: {supportMove(support)}</li>)}</ul>
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
