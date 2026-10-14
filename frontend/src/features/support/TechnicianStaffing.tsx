// E07-S07 (SCRUM-57, frontend SCRUM-150): Technical Support Staff assign
// colleagues to events' technical support requests.
//   - StaffingQueue       /support/technicians             requests needing or having technicians
//   - StaffingRequestPage /support/technicians/:requestId  who is on it, who is free, assign and remove
//   - MySchedule          /support/schedule                the signed-in technician's assignments
// Data comes from staffingApi.ts; the server runs the overlap check.
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarClock, UserMinus, UserPlus } from 'lucide-react';
import {
  Alert, Button, ButtonLink, Card, ConfirmPanel, DataTable, EmptyState, ErrorState, FactList, FilterChips,
  LoadingState, PageLayout, StatusPill, formatDateRange, statusLabel, useLoad, type Column,
} from '../../shared';
import {
  assignTechnician, getMySchedule, getStaffingRequest, listStaffingQueue, removeAssignment,
  type Candidate, type Conflict, type StaffingRequest,
} from './staffingApi';
import './support.css';

const QUEUE = '/support/technicians';

export function eventName(event: { eventCode: string | null; eventTitle?: string; title?: string }) {
  const title = event.eventTitle ?? event.title ?? '';
  return event.eventCode && !title.startsWith(event.eventCode) ? `${event.eventCode} ${title}` : title;
}

function RequestPill({ request }: { request: Pick<StaffingRequest, 'status'> }) {
  return request.status === 'staffed'
    ? <StatusPill status="confirmed" label="Staffed" />
    : <StatusPill status="warning" label="Needs a technician" />;
}

type QueueFilter = 'open' | 'staffed' | 'all';
const filters: { id: QueueFilter; label: string }[] = [
  { id: 'open', label: 'Needs a technician' }, { id: 'staffed', label: 'Staffed' }, { id: 'all', label: 'All' },
];

export function StaffingQueue() {
  const { result, reload } = useLoad(listStaffingQueue, []);
  const [filter, setFilter] = useState<QueueFilter>('open');
  const requests = result.state === 'ready' ? result.data.requests : [];
  const shown = useMemo(() => requests.filter(request => filter === 'all' || request.status === filter), [requests, filter]);
  const columns: Column<StaffingRequest>[] = [
    { header: 'Event', primary: true, cell: request => <Link to={`${QUEUE}/${request.id}`}>{eventName(request)}</Link> },
    { header: 'Support needed', cell: request => request.description },
    { header: 'When', cell: request => formatDateRange(request.startsAt, request.endsAt) },
    { header: 'Technicians', cell: request => request.assignees.length ? request.assignees.map(person => person.name).join(', ') : 'None yet' },
    { header: 'Status', cell: request => <RequestPill request={request} /> },
  ];

  return (
    <PageLayout eyebrow="Technical support" title="Technician staffing"
      actions={<ButtonLink to="/support/schedule" icon={<CalendarClock size={14} aria-hidden="true" />}>My schedule</ButtonLink>}>
      {result.state === 'loading' ? <LoadingState label="Loading support requests…" rows={4} /> : null}
      {result.state === 'error' ? <ErrorState failure={result.failure} onRetry={reload} context="support requests" backTo="/support" backLabel="Back to dashboard" /> : null}
      {result.state === 'ready' ? (
        <>
          <FilterChips label="Filter by staffing" value={filter} onChange={setFilter}
            options={filters.map(item => ({ ...item, count: requests.filter(request => item.id === 'all' || request.status === item.id).length }))} />
          {shown.length === 0 ? (
            <EmptyState title={requests.length === 0 ? 'No technical support requested' : `Nothing in “${filters.find(item => item.id === filter)!.label}”`}>
              {requests.length === 0
                ? 'When an Event Coordinator requests technical support for an approved event, it appears here.'
                : 'Choose another filter to see the rest of the requests.'}
            </EmptyState>
          ) : (
            <DataTable caption="Technical support requests" columns={columns} rows={shown} rowKey={request => request.id} />
          )}
        </>
      ) : null}
    </PageLayout>
  );
}

function clashText(conflict: Conflict) {
  return `${eventName(conflict)}, ${formatDateRange(conflict.startsAt, conflict.endsAt)}`;
}

type Pending = { kind: 'assign'; candidate: Candidate } | { kind: 'remove'; assignmentId: string; name: string };

export function StaffingRequestPage() {
  const { requestId = '' } = useParams();
  const { result, reload } = useLoad(signal => getStaffingRequest(requestId, signal), [requestId]);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const detail = result.state === 'ready' ? result.data : null;
  const request = detail?.request;

  function choose(next: Pending) {
    setPending(next);
    setRefusal(null);
    setDone(null);
  }

  // ConfirmPanel disables its buttons while busy, so this can't run twice.
  async function confirm(target: Pending, on: StaffingRequest) {
    setBusy(true);
    const outcome = target.kind === 'assign'
      ? await assignTechnician(on.id, target.candidate.staffId)
      : await removeAssignment(target.assignmentId);
    setBusy(false);
    if (outcome.ok) {
      setDone(target.kind === 'assign'
        ? `${target.candidate.name} is assigned and has been notified. It's on their schedule.`
        : `${target.name} is no longer assigned and has been notified. Their time is free again.`);
      setPending(null);
      reload();
    } else {
      setRefusal(outcome.message);
    }
  }

  const free = detail?.candidates.filter(person => !person.assigned) ?? [];
  return (
    <PageLayout
      eyebrow={request?.eventCode ?? 'Technical support'}
      title={request ? request.eventTitle : result.state === 'error' ? 'Support request unavailable' : 'Loading support request…'}
      actions={request ? <RequestPill request={request} /> : undefined}
    >
      {result.state === 'loading' ? <LoadingState label="Loading support request…" rows={4} /> : null}
      {result.state === 'error' ? <ErrorState failure={result.failure} onRetry={reload} context="this support request" backTo={QUEUE} backLabel="Back to staffing" /> : null}
      {request && detail ? (
        <>
          <div aria-live="polite" className="support-live">
            {done ? <Alert tone="success">{done}</Alert> : null}
          </div>
          {pending ? (
            <ConfirmPanel
              title={pending.kind === 'assign' ? `Assign ${pending.candidate.name}?` : `Remove ${pending.name}?`}
              description={pending.kind === 'assign'
                ? `${pending.candidate.name} will be notified and the event added to their schedule for ${formatDateRange(request.startsAt, request.endsAt)}.`
                : `${pending.name} will be notified, and their time is freed for other events.`}
              confirmLabel={pending.kind === 'assign' ? 'Assign technician' : 'Remove assignment'}
              busyLabel={pending.kind === 'assign' ? 'Assigning…' : 'Removing…'}
              danger={pending.kind === 'remove'}
              busy={busy}
              error={refusal ?? undefined}
              onConfirm={() => confirm(pending, request)}
              onCancel={() => { setPending(null); setRefusal(null); }}
            />
          ) : null}
          <Card title="Support needed">
            <FactList columns={2} items={[
              ['What', request.description],
              ['When', formatDateRange(request.startsAt, request.endsAt)],
              ['Event status', statusLabel(request.eventStatus)],
            ]} />
          </Card>
          <Card title="Assigned technicians">
            {request.assignees.length === 0 ? (
              <p className="support-subtle">Nobody is assigned yet.</p>
            ) : (
              <ul className="staffing-list" aria-label="Assigned technicians">
                {request.assignees.map(person => (
                  <li key={person.assignmentId}>
                    <strong>{person.name}</strong>
                    {/* The visible label stays short on phones; the accessible name says who. */}
                    <Button icon={<UserMinus size={14} aria-hidden="true" />} disabled={busy} aria-label={`Remove ${person.name}…`}
                      onClick={() => choose({ kind: 'remove', assignmentId: person.assignmentId, name: person.name })}>
                      Remove…
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Colleagues">
            {!detail.canAssign ? (
              <Alert tone="info">Technicians can only be assigned to approved, planning or confirmed events.</Alert>
            ) : free.length === 0 ? (
              <p className="support-subtle">Every active colleague is already on this request.</p>
            ) : (
              <ul className="staffing-list" aria-label="Colleagues">
                {free.map(person => (
                  <li key={person.staffId}>
                    <div>
                      <strong>{person.name}</strong>
                      {person.conflicts.length ? (
                        <small className="staffing-busy">Busy: {person.conflicts.map(clashText).join('; ')}</small>
                      ) : (
                        <small>Free for these times</small>
                      )}
                    </div>
                    <span className="staffing-actions">
                      {person.conflicts.length
                        ? <StatusPill status="warning" label="Overlapping assignment" />
                        : <StatusPill status="confirmed" label="Available" />}
                      <Button icon={<UserPlus size={14} aria-hidden="true" />} disabled={busy} aria-label={`Assign ${person.name}…`}
                        onClick={() => choose({ kind: 'assign', candidate: person })}>
                        Assign…
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      ) : null}
      {/* Also after a failed load: a missing request has nothing to retry. */}
      {result.state !== 'loading' ? <div><ButtonLink to={QUEUE}>Back to all support requests</ButtonLink></div> : null}
    </PageLayout>
  );
}

export function MySchedule() {
  const { result, reload } = useLoad(getMySchedule, []);
  const now = Date.now();
  const assignments = result.state === 'ready' ? result.data.assignments : [];
  const upcoming = assignments.filter(item => new Date(item.endsAt).getTime() >= now);
  const past = assignments.filter(item => new Date(item.endsAt).getTime() < now);
  const list = (items: typeof assignments, label: string) => (
    <ul className="staffing-list" aria-label={label}>
      {items.map(item => (
        <li key={item.id}>
          <div>
            <strong><Link to={`${QUEUE}/${item.requestId}`}>{eventName(item)}</Link></strong>
            <small>{formatDateRange(item.startsAt, item.endsAt)} · {item.description}</small>
          </div>
          <StatusPill status={item.eventStatus} />
        </li>
      ))}
    </ul>
  );

  return (
    <PageLayout eyebrow="Technical support" title="My schedule"
      actions={<ButtonLink to={QUEUE}>Technician staffing</ButtonLink>}>
      {result.state === 'loading' ? <LoadingState label="Loading your schedule…" rows={3} /> : null}
      {result.state === 'error' ? <ErrorState failure={result.failure} onRetry={reload} context="your schedule" backTo="/support" backLabel="Back to dashboard" /> : null}
      {result.state === 'ready' ? (
        assignments.length === 0 ? (
          <EmptyState title="Nothing on your schedule">When a colleague assigns you to an event's technical support, it appears here.</EmptyState>
        ) : (
          <>
            <Card title="Upcoming">{upcoming.length ? list(upcoming, 'Upcoming assignments') : <p className="support-subtle">No upcoming assignments.</p>}</Card>
            {past.length ? <Card title="Past">{list(past, 'Past assignments')}</Card> : null}
          </>
        )
      ) : null}
    </PageLayout>
  );
}
