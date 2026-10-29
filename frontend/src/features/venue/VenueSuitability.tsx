import { useParams, useSearchParams } from 'react-router-dom';
import { Alert, ButtonLink, Card, ErrorState, FactList, LoadingState, PageLayout, StatusPill, formatDateRange, useLoad } from '../../shared';
import { getVenueSuitability } from './venueSuitabilityApi';
import { getVenueBookingRequests } from './venueBookingRequestsApi';
import { lostVenueRecoveryState } from './lostVenueRecoveryState';
import { VenueBookingForm } from './VenueBookingForm';

export function VenueSuitability() {
  const { eventCode = '', venueId = '' } = useParams();
  const [params] = useSearchParams();
  const replacementId = params.get('replaces_booking_id') ?? '';
  const requestedSessionId = params.get('session_id') ?? '';
  const recovery = useLoad(signal => replacementId ? getVenueBookingRequests(eventCode, signal) : Promise.resolve({ ok: true as const, data: { event: { id: eventCode, event_code: eventCode, title: '', status: '' }, bookings: [] } }), [eventCode, replacementId]);
  const recoveryBookings = recovery.result.state === 'ready' ? recovery.result.data.bookings : [];
  const source = recoveryBookings.find(b => b.id === replacementId && b.status === 'conflicting' && b.conflict_block_id
    && lostVenueRecoveryState(recoveryBookings, b).canRequest);
  const sessionId = source?.session_id ?? requestedSessionId;
  const { result, reload } = useLoad(signal => getVenueSuitability(eventCode, venueId, signal, sessionId), [eventCode, venueId, sessionId]);
  const data = result.state === 'ready' ? result.data : null;
  const backTo = `/coordinator/events/${encodeURIComponent(eventCode)}/venues${replacementId ? `?replaces_booking_id=${encodeURIComponent(replacementId)}` : ''}`;
  return <PageLayout eyebrow="Coordinator workspace" title="Venue suitability">
    {result.state === 'loading' && <LoadingState label="Checking venue suitability..." />}
    {result.state === 'error' && <ErrorState failure={result.failure} context="venue suitability" onRetry={reload} backTo={backTo} backLabel="Back to venue search" />}
    {data && <>
      <Card title={data.assessment.name} actions={<StatusPill status={data.assessment.suitable ? 'success' : 'warning'} label={data.assessment.suitable ? 'Suitable' : 'Unsuitable'} />}>
        <FactList items={[
          ['Event', data.event.title], ...(data.event.session_title ? [['Session', data.event.session_title] as [string, string]] : []),
          ['Session period', formatDateRange(data.event.start, data.event.end)], ['Location', data.assessment.location],
        ]} />
        <p>Suitability is advisory. An unsuitable venue may still be requested for Venue Staff to review. Availability and booking conflicts are checked separately when a booking is submitted.</p>
        {data.assessment.mismatches.length > 0 && <div><h3>Unmet requirements</h3><ul>{data.assessment.mismatches.map(message => <li key={message}>{message}</li>)}</ul></div>}
        {data.assessment.suitable && <p>This venue meets all recorded requirements.</p>}
      </Card>
      {data.event.accessibility_note && <Alert tone="info" title="Accessibility notes for manual review">{data.event.accessibility_note}</Alert>}
      {replacementId && !source && <Alert tone="warning">Loading or unavailable replacement context. Return to venue recovery if this booking has already changed.</Alert>}
      {(!replacementId || source) && ['approved', 'planning'].includes(data.event.status ?? '') && <VenueBookingForm key={`${eventCode}:${venueId}:${replacementId}:${data.event.session_id}`} replacement={source ? { id: source.id, starts_at: source.starts_at, ends_at: source.ends_at, purpose: source.purpose ?? '', headcount: source.headcount ?? null } : undefined} replacementLabel="Request replacement venue" eventId={data.event.id} eventCode={eventCode} venueId={venueId} sessionId={data.event.session_id} start={data.event.start} end={data.event.end} />}
      {data.assessment.comparisons.map(item => <Card key={item.criterion} title={item.criterion}>
        <FactList columns={2} items={[
          ['Event requirement', item.criterion === 'Operating hours (Singapore time)' ? formatDateRange(data.event.start, data.event.end) : item.required],
          ['Venue provides', item.provided],
        ]} />
      </Card>)}
      <ButtonLink to={backTo}>Back to venue search</ButtonLink>
    </>}
  </PageLayout>;
}
