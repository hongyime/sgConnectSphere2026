import { useParams } from 'react-router-dom';
import { Alert, ButtonLink, Card, ErrorState, FactList, LoadingState, PageLayout, StatusPill, formatDateRange, useLoad } from '../../shared';
import { getVenueSuitability } from './venueSuitabilityApi';

export function VenueSuitability() {
  const { eventCode = '', venueId = '' } = useParams();
  const { result, reload } = useLoad(signal => getVenueSuitability(eventCode, venueId, signal), [eventCode, venueId]);
  const data = result.state === 'ready' ? result.data : null;
  const backTo = `/coordinator/events/${encodeURIComponent(eventCode)}/venues`;
  return <PageLayout eyebrow="Coordinator workspace" title="Venue suitability">
    {result.state === 'loading' && <LoadingState label="Checking venue suitability..." />}
    {result.state === 'error' && <ErrorState failure={result.failure} context="venue suitability" onRetry={reload} backTo={backTo} backLabel="Back to venue search" />}
    {data && <>
      <Card title={data.assessment.name} actions={<StatusPill status={data.assessment.suitable ? 'success' : 'warning'} label={data.assessment.suitable ? 'Suitable' : 'Unsuitable'} />}>
        <FactList items={[
          ['Event', data.event.title], ['Event period', formatDateRange(data.event.start, data.event.end)], ['Location', data.assessment.location],
        ]} />
        <p>Suitability is advisory. An unsuitable venue may still be requested for Venue Staff to review. Availability and booking conflicts are checked separately when a booking is submitted.</p>
        {data.assessment.mismatches.length > 0 && <div><h3>Unmet requirements</h3><ul>{data.assessment.mismatches.map(message => <li key={message}>{message}</li>)}</ul></div>}
        {data.assessment.suitable && <p>This venue meets all recorded requirements.</p>}
      </Card>
      {data.event.accessibility_note && <Alert tone="info" title="Accessibility notes for manual review">{data.event.accessibility_note}</Alert>}
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
