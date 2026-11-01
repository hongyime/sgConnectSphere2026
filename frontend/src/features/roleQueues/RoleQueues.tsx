import { useState } from 'react';
import { Button, DataTable, EmptyState, ErrorState, LoadingState, PageLayout, formatDate, formatDateRange, useLoad, type Column } from '../../shared';
import { assignQueuedEvent, declineLeadReassignment, listAssignableCoordinators, listLeadReassignmentRequests, listLeadQueue, listSafetyQueue, reassignAsLead, type AssignableCoordinator, type LeadQueueEvent, type LeadReassignmentRequest, type SafetyQueueEvent } from './roleQueueApi';

const leadColumns: Column<LeadQueueEvent>[] = [
  { header: 'Event', primary: true, cell: event => <><strong>{event.title}</strong><small>{event.event_code ?? 'No code'}</small></> },
  { header: 'Client organisation', cell: event => event.organisation_name },
  { header: 'Preferred dates', cell: event => formatDateRange(event.starts_at, event.ends_at) },
  { header: 'Attendance', cell: event => event.expected_attendance },
  { header: 'Submitted', cell: event => formatDate(event.created_at, true) },
];

const safetyColumns: Column<SafetyQueueEvent>[] = [
  { header: 'Event', primary: true, cell: event => <><strong>{event.title}</strong><small>{event.event_code ?? 'No code'}</small></> },
  { header: 'Organiser', cell: event => event.organiser_name },
  { header: 'Coordinator', cell: event => event.coordinator_name ?? 'Unassigned' },
  { header: 'When', cell: event => formatDateRange(event.starts_at, event.ends_at) },
  { header: 'Attendance', cell: event => event.expected_attendance },
];

export function LeadQueue() {
  const queue = useLoad(signal => listLeadQueue(signal), []);
  const coordinators = useLoad(signal => listAssignableCoordinators(signal), []);
  const columns: Column<LeadQueueEvent>[] = [...leadColumns, {
    header: 'Assign', cell: event => <AssignmentControl event={event} coordinators={coordinators.result.state === 'ready' ? coordinators.result.data.coordinators : []} onAssigned={queue.reload} />,
  }];
  return (
    <PageLayout eyebrow="Event Coordinator Lead" title="Unassigned queue">
      {queue.result.state === 'loading' ? <LoadingState label="Loading unassigned requests…" rows={4} /> : null}
      {queue.result.state === 'error' ? <ErrorState failure={queue.result.failure} onRetry={queue.reload} context="the unassigned queue" /> : null}
      {queue.result.state === 'ready' && queue.result.data.events.length === 0 ? <EmptyState title="No unassigned requests">Newly submitted requests will appear here for assignment.</EmptyState> : null}
      {queue.result.state === 'ready' && queue.result.data.events.length > 0 ? <DataTable caption="Unassigned event requests, oldest first" columns={columns} rows={queue.result.data.events} rowKey={event => event.id} /> : null}
      <LeadReassignmentRequests coordinators={coordinators.result.state === 'ready' ? coordinators.result.data.coordinators : []} />
    </PageLayout>
  );
}

function LeadReassignmentRequests({ coordinators }: { coordinators: AssignableCoordinator[] }) {
  const requests = useLoad(signal => listLeadReassignmentRequests(signal), []);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<Record<string, string>>({});
  const requestItems = requests.result.state === 'ready' && Array.isArray(requests.result.data.requests)
    ? requests.result.data.requests : [];

  async function reassign(request: LeadReassignmentRequest) {
    const coordinatorId = choices[request.id];
    if (!coordinatorId) return;
    const outcome = await reassignAsLead(request.eventId, coordinatorId);
    if (!outcome.ok) { setMessage(current => ({ ...current, [request.id]: outcome.message })); return; }
    setMessage(current => ({ ...current, [request.id]: 'Reassigned' }));
    requests.reload();
  }

  async function decline(request: LeadReassignmentRequest) {
    const outcome = await declineLeadReassignment(request.id);
    if (!outcome.ok) { setMessage(current => ({ ...current, [request.id]: outcome.message })); return; }
    setMessage(current => ({ ...current, [request.id]: 'Declined' }));
    requests.reload();
  }

  return <section aria-labelledby="lead-reassignment-heading" style={{ marginTop: '2rem' }}>
    <h2 id="lead-reassignment-heading">Coordinator requests <span className="ui-count">{requestItems.length}</span></h2>
    {requests.result.state === 'loading' ? <LoadingState label="Loading Coordinator requests…" rows={2} /> : null}
    {requests.result.state === 'error' ? <ErrorState failure={requests.result.failure} onRetry={requests.reload} context="Coordinator requests" /> : null}
    {requests.result.state === 'ready' && requestItems.length === 0 ? <EmptyState title="No Coordinator requests">Requests to review will appear here.</EmptyState> : null}
    {requests.result.state === 'ready' ? requestItems.map(request => (
      <article key={request.id} className="card" aria-label={`Reassignment request for ${request.eventTitle}`}>
        <strong>{request.eventTitle}</strong>
        <p>{request.coordinator.name} asked for reassignment: {request.reason}</p>
        <small>Requested {formatDate(request.requestedAt, true)}</small>
        <div>
          <select aria-label={`New Coordinator for ${request.eventTitle}`} value={choices[request.id] ?? ''} onChange={event => setChoices(current => ({ ...current, [request.id]: event.target.value }))}>
            <option value="">Choose Coordinator</option>
            {coordinators.filter(coordinator => coordinator.id !== request.coordinator.id).map(coordinator => <option key={coordinator.id} value={coordinator.id}>{coordinator.full_name}</option>)}
          </select>{' '}
          <Button onClick={() => reassign(request)} disabled={!choices[request.id]}>Reassign</Button>{' '}
          <Button onClick={() => decline(request)}>Decline</Button>
          {message[request.id] ? <small role="status">{message[request.id]}</small> : null}
        </div>
      </article>
    )) : null}
  </section>;
}

function AssignmentControl({ event, coordinators, onAssigned }: { event: LeadQueueEvent; coordinators: AssignableCoordinator[]; onAssigned: () => void }) {
  const [choice, setChoice] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  async function submit() {
    if (!choice) return;
    const result = await assignQueuedEvent(event.id, choice);
    if (result.ok) { setMessage('Assigned'); onAssigned(); }
    else setMessage(result.message);
  }
  return <div><select aria-label={`Assign ${event.title}`} value={choice} onChange={e => setChoice(e.target.value)}>
    <option value="">Choose Coordinator</option>
    {coordinators.map(coordinator => <option key={coordinator.id} value={coordinator.id}>{coordinator.full_name} ({coordinator.active_events})</option>)}
  </select> <Button onClick={submit} disabled={!choice}>Assign</Button>{message ? <small role="status">{message}</small> : null}</div>;
}

export function SafetyQueue() {
  const { result, reload } = useLoad(signal => listSafetyQueue(signal), []);
  return (
    <PageLayout eyebrow="Safety Officer" title="Safety review queue">
      {result.state === 'loading' ? <LoadingState label="Loading safety review events…" rows={4} /> : null}
      {result.state === 'error' ? <ErrorState failure={result.failure} onRetry={reload} context="the safety review queue" /> : null}
      {result.state === 'ready' && result.data.events.length === 0 ? <EmptyState title="No events awaiting safety review">Events submitted for an Operational Safety Check will appear here.</EmptyState> : null}
      {result.state === 'ready' && result.data.events.length > 0 ? <DataTable caption="Events awaiting Operational Safety Check" columns={safetyColumns} rows={result.data.events} rowKey={event => event.id} /> : null}
    </PageLayout>
  );
}
