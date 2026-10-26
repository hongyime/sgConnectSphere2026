import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Alert, Button, ButtonLink, Card, ConfirmPanel, EmptyState, ErrorState, FactList, LoadingState, PageLayout, StatusPill, formatDateRange, useLoad } from '../../shared';
import { cancelLostVenueBooking, getVenueBookingRequests } from './venueBookingRequestsApi';

export function LostVenueRecovery() {
  const { eventCode = '' } = useParams();
  const { result, reload } = useLoad(signal => getVenueBookingRequests(eventCode, signal), [eventCode]);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const [notice, setNotice] = useState('');
  async function cancel(id: string) {
    if (busy) return;
    setBusy(true); setFailure('');
    const response = await cancelLostVenueBooking(id);
    setBusy(false);
    if (response.ok) { setCancelling(null); setNotice('Original booking cancelled.'); reload(); }
    else setFailure(response.message);
  }
  return <PageLayout eyebrow="Coordinator workspace" title="Recover a lost venue">
    {notice && <Alert tone="success">{notice}</Alert>}
    {result.state === 'loading' && <LoadingState label="Loading venue recovery..." />}
    {result.state === 'error' && <ErrorState failure={result.failure} context="venue recovery" onRetry={reload} />}
    {result.state === 'ready' && <>
      <Card title={result.data.event.title}><p>Request a replacement on this Event. The original booking stays Conflicting until you cancel it after a replacement is Confirmed.</p></Card>
      {!result.data.bookings.some(b => b.status === 'conflicting' && b.conflict_block_id) && <EmptyState title="No lost venues to recover">View venue bookings for the current arrangements.</EmptyState>}
      {result.data.bookings.filter(b => b.status === 'conflicting' && b.conflict_block_id).map(booking => {
        const replacements = result.data.bookings.filter(b => b.replaces_booking_id === booking.id);
        const confirmed = replacements.some(b => b.status === 'confirmed' && !b.requires_reconfirmation);
        return <Card key={booking.id} title={booking.venue_name} actions={<StatusPill status={booking.status} />}>
          <FactList items={[
            ['Original booking period', formatDateRange(booking.starts_at, booking.ends_at)],
            ['Reason category', booking.conflict_category?.replaceAll('_', ' ') ?? 'Not recorded'],
            ['Reason', booking.conflict_reason ?? 'Not recorded'],
            ['Unavailable period', booking.conflict_starts_at ? (booking.conflict_ends_at ? formatDateRange(booking.conflict_starts_at, booking.conflict_ends_at) : `From ${new Date(booking.conflict_starts_at).toLocaleString()} (no end recorded)`) : 'Not recorded'],
            ['Purpose', booking.purpose ?? 'Not recorded'], ['Headcount', booking.headcount ?? 'Event attendance'],
          ]} />
          {replacements.map(replacement => <p key={replacement.id}>Replacement: {replacement.venue_name} ? {replacement.status}</p>)}
          {!booking.has_replacement && ['approved', 'planning'].includes(result.data.event.status) && <ButtonLink to={`/coordinator/events/${encodeURIComponent(eventCode)}/venues?replaces_booking_id=${encodeURIComponent(booking.id)}`}>Search for a replacement venue</ButtonLink>}
          {confirmed && <Button disabled={busy} onClick={() => { setCancelling(booking.id); setFailure(''); }}>Cancel original booking</Button>}
          {cancelling === booking.id && <ConfirmPanel title={`Cancel the original booking for ${booking.venue_name}?`} description="The confirmed replacement stays booked. This cancellation cannot be undone." confirmLabel="Confirm cancellation" busyLabel="Cancelling..." danger busy={busy} error={failure} onCancel={() => setCancelling(null)} onConfirm={() => void cancel(booking.id)} />}
        </Card>;
      })}
    </>}
    <ButtonLink to={`/coordinator/events/${encodeURIComponent(eventCode)}/venue-bookings`}>Back to venue bookings</ButtonLink>
  </PageLayout>;
}
