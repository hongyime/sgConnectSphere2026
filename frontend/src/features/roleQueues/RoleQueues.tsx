import { useState } from 'react';
import { Button, DataTable, EmptyState, ErrorState, LoadingState, PageLayout, formatDate, formatDateRange, useLoad, type Column } from '../../shared';
import { getSafetyReview, listLeadQueue, listSafetyQueue, SAFETY_FACTORS, submitSafetyDecision, type LeadQueueEvent, type SafetyFactor, type SafetyQueueEvent, type SafetyReview } from './roleQueueApi';

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
  { header: 'Review', cell: event => <SafetyReviewControl event={event} /> },
];

export function LeadQueue() {
  const { result, reload } = useLoad(signal => listLeadQueue(signal), []);
  return (
    <PageLayout eyebrow="Event Coordinator Lead" title="Unassigned queue">
      {result.state === 'loading' ? <LoadingState label="Loading unassigned requests…" rows={4} /> : null}
      {result.state === 'error' ? <ErrorState failure={result.failure} onRetry={reload} context="the unassigned queue" /> : null}
      {result.state === 'ready' && result.data.events.length === 0 ? <EmptyState title="No unassigned requests">Newly submitted requests will appear here for assignment.</EmptyState> : null}
      {result.state === 'ready' && result.data.events.length > 0 ? <DataTable caption="Unassigned event requests, oldest first" columns={leadColumns} rows={result.data.events} rowKey={event => event.id} /> : null}
    </PageLayout>
  );
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

type SafetyAssessment = { satisfactory: boolean; comment: string };

function initialAssessments(): Record<SafetyFactor, SafetyAssessment> {
  return Object.fromEntries(SAFETY_FACTORS.map(factor => [factor, { satisfactory: true, comment: '' }])) as Record<SafetyFactor, SafetyAssessment>;
}

function factorLabel(factor: SafetyFactor) {
  return factor.replaceAll('_', ' ');
}

function SafetyReviewControl({ event }: { event: SafetyQueueEvent }) {
  const [detail, setDetail] = useState<SafetyReview | null>(null);
  const [assessments, setAssessments] = useState(initialAssessments);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function open() {
    const result = await getSafetyReview(event.id);
    if (result.ok) setDetail(result.data.review);
    else setMessage(result.message);
  }
  async function decide(decision: 'approve' | 'request_changes' | 'reject') {
    setBusy(true);
    const result = await submitSafetyDecision(event.id, { decision, factors: assessments, reason });
    setBusy(false);
    setMessage(result.ok ? 'Decision saved; the queue will refresh after reload.' : result.message);
  }
  if (!detail) return <Button onClick={open}>Open review</Button>;
  return <div className="safety-review" aria-label={`Safety review for ${event.title}`}>
    <p><strong>Entered review:</strong> {formatDate(detail.event.status_changed_at, true)}</p>
    <p><strong>Accessibility:</strong> {detail.event.accessibility_note || 'None recorded'}</p>
    <ul>{detail.venues.map(venue => <li key={venue.id}>{venue.name} — capacity {venue.capacity ?? 'unknown'}, {venue.layout || 'layout not recorded'}{venue.restrictions.length ? `; restrictions: ${venue.restrictions.join(', ')}` : ''}</li>)}</ul>
    <ul>{detail.equipment.map(item => <li key={item.id}>{item.name}: {item.reserved} of {item.requested} reserved{item.placement ? ` — ${item.placement}` : ''}</li>)}</ul>
    {SAFETY_FACTORS.map(factor => <label key={factor}><input type="checkbox" checked={assessments[factor].satisfactory} onChange={input => setAssessments(current => ({ ...current, [factor]: { ...current[factor], satisfactory: input.target.checked } }))} /> {factorLabel(factor)}<textarea aria-label={`${factorLabel(factor)} comment`} value={assessments[factor].comment} onChange={input => setAssessments(current => ({ ...current, [factor]: { ...current[factor], comment: input.target.value } }))} /></label>)}
    <label>Reason for rejection or requested changes<textarea aria-label="Safety decision reason" value={reason} onChange={input => setReason(input.target.value)} /></label>
    <div><Button onClick={() => decide('approve')} disabled={busy}>Approve</Button> <Button onClick={() => decide('request_changes')} disabled={busy}>Request changes</Button> <Button onClick={() => decide('reject')} disabled={busy}>Reject safety arrangement</Button></div>
    {message ? <small role="status">{message}</small> : null}
  </div>;
}
