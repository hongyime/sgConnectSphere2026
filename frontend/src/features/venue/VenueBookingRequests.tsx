import { useParams } from 'react-router-dom';
import { ButtonLink, Card, EmptyState, ErrorState, FactList, LoadingState, PageLayout, StatusPill, formatDateRange, useLoad } from '../../shared';
import { getVenueBookingRequests } from './venueBookingRequestsApi';

export function VenueBookingRequests() {
  const { eventCode = '' } = useParams();
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
        {booking.decision_reason && <p><strong>Decision reason:</strong> {booking.decision_reason}</p>}
      </Card>)}
    </>}
  </PageLayout>;
}
