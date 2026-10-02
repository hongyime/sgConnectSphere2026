// TEMPLATE: Detail page (one event, booking, reservation...).
// Copy into your feature folder, rename, and:
//   1. Swap `getRequest` for your API module's read function.
//   2. Replace the facts and actions with your story's.
// Keep: useLoad keyed on the route parameter (so a late response for the
// previous record can never replace this one) and the error state, which
// shows the server's 403/404 message as-is.
import { useLocation, useParams } from 'react-router-dom';
import { PencilLine } from 'lucide-react';
import {
  Alert, ButtonLink, Card, ErrorState, FactList, LoadingState, PageLayout, StatusPill, formatDate, useLoad,
} from '../shared';
import { getRequest } from './sampleApi';

export function DetailTemplate() {
  const { id = '' } = useParams();
  const { result, reload } = useLoad(signal => getRequest(id, signal), [id]);
  const item = result.state === 'ready' ? result.data : null;
  // The Form template navigates here with { saved: true } after a save.
  const saved = (useLocation().state as { saved?: boolean } | null)?.saved === true;

  return (
    <PageLayout
      eyebrow={`Template · Detail · ${id}`}
      title={item?.title ?? (result.state === 'error' ? 'Request unavailable' : 'Loading request…')}
      actions={item ? <StatusPill status={item.status} /> : undefined}
    >
      {result.state === 'loading' ? <LoadingState label="Loading request…" rows={3} /> : null}
      {result.state === 'error' ? (
        <ErrorState failure={result.failure} context="this request" onRetry={reload} backTo="/ui-kit/templates/list" backLabel="Back to requests" />
      ) : null}
      {item && saved ? <Alert tone="success">Saved your changes.</Alert> : null}
      {item ? (
        <>
          <Card title="Summary" actions={(
            <>
              <ButtonLink to={`/ui-kit/templates/items/${item.id}/edit`} icon={<PencilLine size={14} aria-hidden="true" />}>Edit</ButtonLink>
              {item.status === 'under_review' ? <ButtonLink to={`/ui-kit/templates/items/${item.id}/decide`} variant="primary">Decide</ButtonLink> : null}
            </>
          )}>
            <FactList columns={2} items={[
              ['Organiser', item.organiser],
              ['Event date', formatDate(item.startsAt, true)],
              ['Expected attendance', item.attendance.toLocaleString('en-SG')],
              ['Notes', item.notes],
              ...(item.decisionReason ? [['Decision reason', item.decisionReason] as [string, string]] : []),
            ]} />
          </Card>
          <p><ButtonLink to="/ui-kit/templates/list">Back to requests</ButtonLink></p>
        </>
      ) : null}
    </PageLayout>
  );
}
