// E08-S04 Scenario 4 (SCRUM-243) for Venue Staff: Confirmed bookings flagged
// for reconfirmation (an E10-S02 date or attendance change, an E05-S01
// capacity drop), shown under the Pending requests. Reconfirming moves the
// booking to its Session's current time and clears the flag; when it was a
// reverted event's last arrangement, the event enters Safety Review (SCRUM-242).
import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Alert, Button, Card, ConfirmPanel, DataTable, ErrorState, LoadingState, formatDateRange, useLoad } from '../../shared';
import { listBookingsToReconfirm, reconfirmBooking, type BookingRequest } from './bookingDecisionApi';

const target = (booking: BookingRequest) => booking.reconfirmFor ?? { startsAt: booking.startsAt, endsAt: booking.endsAt };
const sameTime = (booking: BookingRequest) =>
  target(booking).startsAt === booking.startsAt && target(booking).endsAt === booking.endsAt;

function moveText(booking: BookingRequest) {
  const to = formatDateRange(target(booking).startsAt, target(booking).endsAt);
  return sameTime(booking)
    ? `${booking.venue.name} stays booked for ${to}`
    : `${booking.venue.name} moves from ${formatDateRange(booking.startsAt, booking.endsAt)} to ${to}`;
}

export function BookingsToReconfirm() {
  const { result, reload } = useLoad(signal => listBookingsToReconfirm(signal), []);
  const [chosen, setChosen] = useState<BookingRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  function choose(booking: BookingRequest | null) {
    setChosen(booking);
    setRefusal(null);
    if (booking) setDone(null);
  }

  async function confirm(booking: BookingRequest) {
    setBusy(true);
    const outcome = await reconfirmBooking(booking.id);
    setBusy(false);
    if (!outcome.ok) { setRefusal(outcome.message); return; }
    const when = formatDateRange(target(booking).startsAt, target(booking).endsAt);
    setDone([
      `Reconfirmed ${booking.venue.name} for "${booking.event.title}" (${when}).`,
      outcome.data.coordinatorNotified ? 'The Coordinator was notified.' : 'The event has no Coordinator to notify yet.',
      outcome.data.enteredSafetyReview ? 'All its arrangements are confirmed again, so the event is now in Safety Review.' : null,
    ].filter(Boolean).join(' '));
    setChosen(null);
    reload();
  }

  return (
    <Card title="Bookings to reconfirm">
      {done ? <Alert tone="success">{done}</Alert> : null}
      {result.state === 'loading' ? <LoadingState label="Loading bookings to reconfirm…" rows={2} /> : null}
      {result.state === 'error' ? <ErrorState failure={result.failure} context="bookings to reconfirm" onRetry={reload} /> : null}
      {result.state === 'ready' && result.data.length === 0 ? (
        <p>Nothing to reconfirm. When a change to a confirmed event affects one of your bookings, it appears here.</p>
      ) : null}
      {result.state === 'ready' && result.data.length > 0 ? (
        <DataTable<BookingRequest>
          caption="Confirmed bookings to reconfirm, soonest first"
          rows={result.data}
          rowKey={booking => booking.id}
          columns={[
            { header: 'Event', primary: true, cell: booking => <>{booking.event.title}<small>{booking.event.code ?? 'No code'}</small></> },
            { header: 'Venue', cell: booking => booking.venue.name },
            { header: 'Booked for', cell: booking => formatDateRange(booking.startsAt, booking.endsAt) },
            { header: 'Reconfirm for', cell: booking => sameTime(booking) ? 'Same time' : formatDateRange(target(booking).startsAt, target(booking).endsAt) },
            { header: 'Coordinator', cell: booking => booking.event.coordinatorName ?? 'Not yet assigned' },
            {
              header: 'Action', key: 'action',
              cell: booking => (
                <Button icon={<RefreshCw size={14} aria-hidden="true" />} onClick={() => choose(booking)} disabled={busy}
                  aria-label={`Reconfirm ${booking.venue.name} for ${booking.event.title}`}>Reconfirm…</Button>
              ),
            },
          ]}
        />
      ) : null}
      {chosen ? (
        <ConfirmPanel
          title="Reconfirm this booking?"
          description={<p>{moveText(chosen)} for "{chosen.event.title}". It no longer needs reconfirmation, and the Coordinator is notified.</p>}
          confirmLabel="Reconfirm booking"
          busyLabel="Reconfirming…"
          busy={busy}
          error={refusal ?? undefined}
          onConfirm={() => { void confirm(chosen); }}
          onCancel={() => choose(null)}
        />
      ) : null}
    </Card>
  );
}
