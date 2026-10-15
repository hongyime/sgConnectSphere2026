import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, ButtonLink, Card, EmptyState, ErrorState, FactList, LoadingState, PageLayout, StatusPill, formatDateRange, useLoad } from '../../shared';
import { VenueBookingForm } from './VenueBookingForm';
import { getVenueBookingRequests } from './venueBookingRequestsApi';

export function VenueBookingRequests() {
  const { eventCode = '' } = useParams();
  const [switching, setSwitching] = useState<string | null>(null);
  const { result, reload } = useLoad(signal => getVenueBookingRequests(eventCode, signal), [eventCode]);
  const backTo = `/coordinator/events/${encodeURIComponent(eventCode)}/venues`;
  return <PageLayout eyebrow="Coordinator workspace" title="Venue booking requests">
    {result.state === 'loading' && <LoadingState label="Loading venue booking requests..." />}
    {result.state === 'error' && <ErrorState failure={result.failure} context="venue booking requests" onRetry={reload} backTo="/coordinator" />}
    {result.state === 'ready' && <>
      <Card title={result.data.event.title} actions={<StatusPill status={result.data.event.status} />}>
        <p>Each booking has its own period and status. A Pending request is awaiting a decision; it is not a confirmed booking.</p>
        <ButtonLink to={backTo}>Search venues for this event</ButtonLink>
      </Card>
      {result.data.bookings.length === 0 && <EmptyState title="No venue bookings recorded">This event has no recorded venue bookings.</EmptyState>}
      {result.data.bookings.map(booking => <Card key={booking.id} title={booking.venue_name} actions={<StatusPill status={booking.status} />}>
        <FactList columns={2} items={[
          ['Location', booking.location], ['Booking period', formatDateRange(booking.starts_at, booking.ends_at)],
        ]} />
        {booking.purpose && <p><strong>Purpose:</strong> {booking.purpose}</p>}
        {booking.headcount != null && <p><strong>Booking headcount:</strong> {booking.headcount}</p>}
        {booking.is_primary && <p>Primary venue</p>}
        {!!booking.suitability_snapshot?.mismatches.length && <div><h3>Advisory unmet requirements at submission</h3><ul>{booking.suitability_snapshot.mismatches.map(message => <li key={message}>{message}</li>)}</ul></div>}
        {booking.suggested_venue_name && <p><strong>Suggested venue:</strong> {booking.suggested_venue_name}</p>}
        {booking.status === 'rejected' && booking.suggested_venue_id && !booking.has_replacement && ['approved', 'planning'].includes(result.data.event.status) && <>
          <Button onClick={() => setSwitching(booking.id)}>Request suggested venue</Button>
          {switching === booking.id && <VenueBookingForm key={booking.id} eventId={result.data.event.id} eventCode={eventCode} venueId={booking.suggested_venue_id}
            start={result.data.event.starts_at ?? booking.starts_at} end={result.data.event.ends_at ?? booking.ends_at} replacement={{ id: booking.id, starts_at: booking.starts_at, ends_at: booking.ends_at, purpose: booking.purpose ?? '', headcount: booking.headcount ?? null }} />}
        </>}
        {booking.has_replacement && <p>A replacement request has already been submitted.</p>}
        {booking.decision_reason && <p><strong>Decision reason:</strong> {booking.decision_reason}</p>}
      </Card>)}
    </>}
  </PageLayout>;
}
