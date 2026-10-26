import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Alert, Button, ButtonLink, Card, ConfirmPanel, EmptyState, ErrorState, FactList, LoadingState, PageLayout, StatusPill, formatDateRange, useLoad } from '../../shared';
import { VenueBookingForm } from './VenueBookingForm';
import { getVenueBookingRequests, setPrimaryVenueBooking, withdrawVenueBooking } from './venueBookingRequestsApi';

export function VenueBookingRequests() {
  const { eventCode = '' } = useParams();
  const [switching, setSwitching] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const [selectingPrimary, setSelectingPrimary] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState('');
  const [notice, setNotice] = useState('');
  const { result, reload } = useLoad(signal => getVenueBookingRequests(eventCode, signal), [eventCode]);
  const backTo = `/coordinator/events/${encodeURIComponent(eventCode)}/venues`;
  async function selectPrimary(id: string) {
    if (busy) return;
    setBusy(true); setFailure(''); setNotice('');
    const response = await setPrimaryVenueBooking(id);
    setBusy(false);
    if (response.ok) {
      setSelectingPrimary(null); setNotice('Primary venue updated. Booking statuses are unchanged.'); reload();
    } else setFailure(response.message);
  }
  async function withdraw(id: string) {
    if (busy) return;
    setBusy(true); setFailure(''); setNotice('');
    const response = await withdrawVenueBooking(id);
    setBusy(false);
    if (response.ok) {
      setWithdrawing(null); setSwitching(null);
      setNotice('Booking request withdrawn. Other bookings are unchanged.'); reload();
    } else setFailure(response.message);
  }
  return <PageLayout eyebrow="Coordinator workspace" title="Venue booking requests">
    {notice && <Alert tone="success">{notice}</Alert>}
    {result.state === 'loading' && <LoadingState label="Loading venue booking requests..." />}
    {result.state === 'error' && <ErrorState failure={result.failure} context="venue booking requests" onRetry={reload} backTo="/coordinator" />}
    {result.state === 'ready' && <>
      <Card title={result.data.event.title} actions={<StatusPill status={result.data.event.status} />}>
        <p>Each booking has its own period and status. A Pending request is awaiting a decision; it is not a confirmed booking.</p>
        <ButtonLink to={backTo}>Search venues for this event</ButtonLink>
        {result.data.bookings.some(b => b.status === 'conflicting' && b.conflict_block_id) && <ButtonLink to={`/coordinator/events/${encodeURIComponent(eventCode)}/venue-recovery`}>Recover a lost venue</ButtonLink>}
      </Card>
      {result.data.bookings.length === 0 && <EmptyState title="No venue bookings recorded">This event has no recorded venue bookings.</EmptyState>}
      {result.data.bookings.map(booking => <Card key={booking.id} title={booking.venue_name} actions={<StatusPill status={booking.status} />}>
        <FactList columns={2} items={[
          ['Location', booking.location], ['Booking period', formatDateRange(booking.starts_at, booking.ends_at)],
        ]} />
        {booking.purpose && <p><strong>Purpose:</strong> {booking.purpose}</p>}
        {booking.headcount != null && <p><strong>Booking headcount:</strong> {booking.headcount}</p>}
        {booking.is_primary && <p>Primary venue</p>}
        {booking.status === 'confirmed' && !booking.is_primary && ['approved', 'planning', 'safety_review', 'confirmed'].includes(result.data.event.status) && <>
          <Button disabled={busy} onClick={() => { setSelectingPrimary(booking.id); setWithdrawing(null); setFailure(''); }}>Set as primary venue</Button>
          {selectingPrimary === booking.id && <ConfirmPanel title={`Make ${booking.venue_name} the primary venue?`}
            description="This replaces the current primary designation. All bookings keep their existing periods and statuses."
            confirmLabel="Set primary venue" busyLabel="Updating..." busy={busy} error={failure}
            onCancel={() => setSelectingPrimary(null)} onConfirm={() => void selectPrimary(booking.id)} />}
          {selectingPrimary === booking.id && failure && <Button onClick={() => { setSelectingPrimary(null); reload(); }}>Refresh booking list</Button>}
        </>}
        {!!booking.suitability_snapshot?.mismatches.length && <div><h3>Advisory unmet requirements at submission</h3><ul>{booking.suitability_snapshot.mismatches.map(message => <li key={message}>{message}</li>)}</ul></div>}
        {booking.suggested_venue_name && <p><strong>Suggested venue:</strong> {booking.suggested_venue_name}</p>}
        {booking.status === 'rejected' && booking.suggested_venue_id && !booking.has_replacement && ['approved', 'planning'].includes(result.data.event.status) && <>
          <Button onClick={() => setSwitching(booking.id)}>Request suggested venue</Button>
          {switching === booking.id && <VenueBookingForm key={booking.id} eventId={result.data.event.id} eventCode={eventCode} venueId={booking.suggested_venue_id}
            onSubmitted={() => { setSwitching(null); setNotice('Replacement booking request submitted. The new request is Pending.'); reload(); }}
            start={result.data.event.starts_at ?? booking.starts_at} end={result.data.event.ends_at ?? booking.ends_at} replacement={{ id: booking.id, starts_at: booking.starts_at, ends_at: booking.ends_at, purpose: booking.purpose ?? '', headcount: booking.headcount ?? null }} />}
        </>}
        {booking.has_replacement && <p>A replacement request has already been submitted.</p>}
        {booking.decision_reason && <p><strong>Decision reason:</strong> {booking.decision_reason}</p>}
        {booking.status === 'pending' && <>
          <Button disabled={busy} onClick={() => { setWithdrawing(booking.id); setSelectingPrimary(null); setFailure(''); }}>Withdraw request</Button>
          {withdrawing === booking.id && <ConfirmPanel title={`Withdraw request for ${booking.venue_name}?`}
            description="This releases this Pending request. Other bookings and the event status stay unchanged. A converted hold will not be restored."
            confirmLabel="Confirm withdrawal" busyLabel="Withdrawing..." danger busy={busy} error={failure}
            onCancel={() => setWithdrawing(null)} onConfirm={() => void withdraw(booking.id)} />}
          {withdrawing === booking.id && failure && <Button onClick={() => { setWithdrawing(null); reload(); }}>Refresh booking list</Button>}
        </>}
      </Card>)}
    </>}
  </PageLayout>;
}
