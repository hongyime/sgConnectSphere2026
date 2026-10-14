// Live E03-S01 (SCRUM-32) Coordinator screens: workload dashboard, review
// queue, assigned-event detail with reassignment, and the reassignment inbox.
// Data comes from coordinatorApi.ts. The decision page is DecisionPanel.tsx
// (E03-S03); the planning, readiness and confirmation screens in
// Coordinator.tsx still use mock data until their stories' backends land. Built on the shared blocks in src/shared (ADR-017).
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock3, Gavel, Loader2, MessageCircleQuestion, PencilLine, Send, UserRoundCheck, Users } from 'lucide-react';
import {
  Alert, Button, ButtonLink, Card, DataTable, EmptyState, ErrorState, FactList, FilterChips, FormActions,
  FormField, LoadingState, PageLayout, StatusPill, formatDate, formatDateRange, isAbort, statusLabel, useLoad,
  type Column, type Failure, type Load,
} from '../../shared';
import { EventEditForm } from '../events/EventEditForm';
import { fieldList } from '../events/eventEditFields';
import { ActivityLog } from '../events/ActivityLog';
import { OutstandingQuestions } from '../events/OutstandingQuestions';
import type { EditableField } from '../events/eventEditApi';
import {
  ACTIVE_STATUSES, eventRef, getAssignedEvent, listAssignedEvents, listColleagues,
  listReassignments, requestReassignment, respondToReassignment,
  type AssignedEventDetail, type AssignedEventSummary, type Colleague, type Reassignment,
} from './coordinatorApi';
import { SUPPORT_VISIBLE, TechnicalSupportCard } from './TechnicalSupport';
import './coordinator.css';

// A refused read sends the Coordinator back to their dashboard.
function LoadError({ failure, onRetry, context }: { failure: Failure; onRetry: () => void; context: string }) {
  return <ErrorState failure={failure} onRetry={onRetry} context={context} backTo="/coordinator" backLabel="Back to dashboard" />;
}

function eventLink(event: { event_code: string | null; id: string }) {
  return `/coordinator/events/${encodeURIComponent(eventRef(event))}`;
}

function EventRow({ event }: { event: AssignedEventSummary }) {
  return (
    <Link to={eventLink(event)} className="coordinator-row">
      <div>
        <strong>{event.title}</strong>
        <small>{event.event_code ?? 'No code'} · {event.organiser_name} · {formatDate(event.starts_at)}</small>
      </div>
      <span className="coordinator-row-meta">
        {event.reassignment_pending ? <StatusPill status="warning" label="Reassignment pending" /> : null}
        <StatusPill status={event.status} />
      </span>
    </Link>
  );
}

// --- Dashboard ----------------------------------------------------------

export function CoordinatorHome() {
  const { result, reload } = useLoad(async signal => {
    const [events, reassignments] = await Promise.all([listAssignedEvents(signal), listReassignments(signal)]);
    if (!events.ok) return events;
    return { ok: true as const, data: { events: events.data, incoming: reassignments.ok ? reassignments.data.incoming : [] } };
  }, []);

  return (
    <PageLayout
      eyebrow="Coordinator workspace"
      title="Workload dashboard"
      actions={(
        <>
          <ButtonLink to="/coordinator/venues">Search venues</ButtonLink>
          <ButtonLink to="/coordinator/calendar">Venue availability calendar</ButtonLink>
        </>
      )}
    >
      {result.state === 'loading' ? <LoadingState label="Loading your assigned events…" /> : null}
      {result.state === 'error' ? <LoadError failure={result.failure} onRetry={reload} context="your assigned events" /> : null}
      {result.state === 'ready' ? <DashboardBody events={result.data.events} incoming={result.data.incoming} /> : null}
    </PageLayout>
  );
}

function DashboardBody({ events, incoming }: { events: AssignedEventSummary[]; incoming: Reassignment[] }) {
  const active = events.filter(event => ACTIVE_STATUSES.includes(event.status));
  const count = (...statuses: string[]) => events.filter(event => statuses.includes(event.status)).length;
  const upcoming = [...active].sort((a, b) => a.starts_at.localeCompare(b.starts_at)).slice(0, 5);
  return (
    <>
      {incoming.length > 0 ? (
        <section className="card coordinator-callout" aria-label="Reassignment requests">
          <UserRoundCheck size={20} aria-hidden="true" />
          <div>
            <strong>{incoming.length === 1 ? 'A colleague has asked you to take over an event' : `${incoming.length} colleagues have asked you to take over events`}</strong>
            <p>Nothing moves to you until you accept.</p>
          </div>
          <ButtonLink to="/coordinator/reassignments" variant="primary">Review requests</ButtonLink>
        </section>
      ) : null}
      <section className="coordinator-metrics" aria-label="Workload counts">
        <article><span>Active events</span><strong>{active.length}</strong></article>
        <article><span>Needs review</span><strong>{count('submitted', 'under_review')}</strong></article>
        <article><span>Awaiting organiser</span><strong>{count('awaiting_clarification')}</strong></article>
        <article><span>Approved &amp; planning</span><strong>{count('approved', 'planning', 'confirmed')}</strong></article>
      </section>
      {active.length === 0 ? (
        <EmptyState title="No events assigned to you yet">
          When an organiser submits a request, it&apos;s assigned automatically to the Coordinator with the fewest active events. New assignments appear here and in your notifications.
        </EmptyState>
      ) : (
        <section className="coordinator-list" aria-labelledby="upcoming-heading">
          <div className="coordinator-section-heading">
            <h2 id="upcoming-heading">Coming up</h2>
            <Link to="/coordinator/queue">View all {active.length} <ArrowRight size={14} aria-hidden="true" /></Link>
          </div>
          {upcoming.map(event => <EventRow key={event.id} event={event} />)}
        </section>
      )}
    </>
  );
}

// --- Review queue -------------------------------------------------------

const queueFilters = [
  { id: 'all', label: 'All', statuses: null },
  { id: 'review', label: 'Needs review', statuses: ['submitted', 'under_review'] },
  { id: 'clarification', label: 'Awaiting organiser', statuses: ['awaiting_clarification'] },
  { id: 'planning', label: 'Approved & planning', statuses: ['approved', 'planning', 'confirmed'] },
  { id: 'closed', label: 'Closed', statuses: ['rejected', 'cancelled', 'completed'] },
] as const;
type QueueFilter = (typeof queueFilters)[number]['id'];

const queueColumns: Column<AssignedEventSummary>[] = [
  {
    header: 'Event',
    primary: true,
    cell: event => (
      <>
        <Link to={eventLink(event)}>{event.title}</Link>
        <small>{event.event_code ?? 'No code'}{event.reassignment_pending ? ' · Reassignment pending' : ''}</small>
      </>
    ),
  },
  { header: 'Organiser', cell: event => event.organiser_name },
  { header: 'Event date', cell: event => formatDate(event.starts_at) },
  { header: 'Status', cell: event => <StatusPill status={event.status} /> },
  { header: 'Assigned', cell: event => formatDate(event.coordinator_assigned_at) },
];

function matches(statuses: readonly string[] | null, event: AssignedEventSummary) {
  return statuses === null || statuses.includes(event.status);
}

export function ReviewQueue() {
  const { result, reload } = useLoad(signal => listAssignedEvents(signal), []);
  const [filter, setFilter] = useState<QueueFilter>('all');
  const events = result.state === 'ready' ? result.data : [];
  const active = queueFilters.find(item => item.id === filter) ?? queueFilters[0];
  const shown = useMemo(() => events.filter(event => matches(active.statuses, event)), [events, active]);

  return (
    <PageLayout eyebrow="Coordinator workspace" title="Review queue">
      {result.state === 'loading' ? <LoadingState label="Loading your queue…" rows={5} /> : null}
      {result.state === 'error' ? <LoadError failure={result.failure} onRetry={reload} context="your queue" /> : null}
      {result.state === 'ready' ? (
        <>
          <FilterChips
            label="Filter by status"
            options={queueFilters.map(item => ({ id: item.id, label: item.label, count: events.filter(event => matches(item.statuses, event)).length }))}
            value={filter}
            onChange={setFilter}
          />
          {shown.length === 0 ? (
            <EmptyState title={events.length === 0 ? 'Your queue is empty' : `No events in “${active.label}”`}>
              {events.length === 0
                ? 'Requests assigned to you will appear here as soon as organisers submit them.'
                : 'Choose another filter to see the rest of your assigned events.'}
            </EmptyState>
          ) : (
            <DataTable
              caption={`Events assigned to you, ${active.label.toLowerCase()}`}
              columns={queueColumns}
              rows={shown}
              rowKey={event => event.id}
            />
          )}
        </>
      ) : null}
    </PageLayout>
  );
}

// --- Request detail -----------------------------------------------------

export function RequestDetail() {
  const { eventCode = '' } = useParams();
  const { result, reload } = useLoad(signal => getAssignedEvent(eventCode, signal), [eventCode]);
  const event = result.state === 'ready' ? result.data : null;
  // RequestClarification comes back here with { clarificationSent: true } (E03-S02).
  const clarificationSent = (useLocation().state as { clarificationSent?: boolean } | null)?.clarificationSent === true;

  return (
    <PageLayout
      eyebrow={event?.event_code ?? eventCode}
      title={event?.title ?? (result.state === 'error' ? 'Event unavailable' : 'Loading event…')}
      actions={event ? (
        <>
          {event.status === 'under_review' ? (
            <>
              <ButtonLink to={`${eventLink(event)}/clarify`} icon={<MessageCircleQuestion size={14} aria-hidden="true" />}>Request clarification</ButtonLink>
              {/* E03-S03 (SCRUM-34): navigation, so no ellipsis (D26). */}
              <ButtonLink to={`${eventLink(event)}/decide`} variant="primary" icon={<Gavel size={14} aria-hidden="true" />}>Decide on request</ButtonLink>
            </>
          ) : null}
          {['approved','planning','confirmed'].includes(event.status) ? <ButtonLink to={`${eventLink(event)}/equipment`}>Equipment requests</ButtonLink> : null}
          <StatusPill status={event.status} />
        </>
      ) : undefined}
    >
      {result.state === 'loading' ? <LoadingState label="Loading event…" rows={4} /> : null}
      {result.state === 'error' ? <LoadError failure={result.failure} onRetry={reload} context="this event" /> : null}
      {event ? (
        <>
          {clarificationSent ? <Alert tone="success">Questions sent. The request is now awaiting clarification.</Alert> : null}
          <p className="coordinator-subtle"><Clock3 size={14} aria-hidden="true" /> {statusLabel(event.status)} since {formatDate(event.status_changed_at, true)}</p>
          <OutstandingQuestions questions={event.outstandingQuestions ?? []} />
          <section className="coordinator-detail-grid" aria-label="Event summary">
            <Card title="Summary">
              <FactList
                columns={2}
                items={[
                  ['Assigned Coordinator', <>{event.coordinator_name}<small>Since {formatDate(event.coordinator_assigned_at)}</small></>],
                  ['Organiser', <>{event.organiser_name}<small><a href={`mailto:${event.organiser_email}`}>{event.organiser_email}</a></small></>],
                  ['Event date', formatDateRange(event.starts_at, event.ends_at)],
                  ['Expected attendance', event.expected_attendance.toLocaleString('en-SG')],
                ]}
              />
            </Card>
            <ReassignPanel key={event.id} event={event} onChanged={reload} />
          </section>
          <EventDetailsPanel key={event.id} event={event} onSaved={reload} />
          {/* E07-S06 (SCRUM-146): request technical support, or mark the event as needing none. */}
          {SUPPORT_VISIBLE.includes(event.status) ? <TechnicalSupportCard key={`support-${event.id}`} eventCode={eventRef(event)} /> : null}
          {/* E14-S02 (SCRUM-86, T-75): read-only, so no edit or delete controls. */}
          <ActivityLog entries={event.activityLog ?? []} />
        </>
      ) : null}
    </PageLayout>
  );
}

// E03-S07 (SCRUM-37) Scenarios 2 and 5: only the assigned Coordinator can
// open this page (the read refuses anyone else), and the server accepts
// their edits only once the event is approved or later.
const EDITABLE_AFTER_APPROVAL = ['approved', 'planning', 'confirmed', 'completed'];
const COORDINATOR_EDITABLE: ReadonlySet<EditableField> = new Set<EditableField>([
  'title', 'description', 'purpose', 'startAt', 'endAt', 'expectedAttendance',
  'venueRequirements', 'accessibilityNote', 'equipmentRequirements', 'layoutPreference',
]);

function EventDetailsPanel({ event, onSaved }: { event: AssignedEventDetail; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const canEdit = EDITABLE_AFTER_APPROVAL.includes(event.status);

  // After saving (or cancelling) a long form, return to the details card
  // so the confirmation and updated values are in view.
  useEffect(() => {
    if (!editing && saved) anchorRef.current?.scrollIntoView?.({ block: 'start' });
  }, [editing, saved]);

  if (editing) {
    return (
      <EventEditForm
        eventId={event.id}
        values={event}
        editable={COORDINATOR_EDITABLE}
        intro={<p>Changes are saved straight to the event and recorded in its activity log under your name.</p>}
        onCancel={() => setEditing(false)}
        onSaved={fields => {
          setEditing(false);
          setSaved(`Saved your changes to the ${fieldList(fields)}. They're recorded in the event's activity log.`);
          onSaved();
        }}
      />
    );
  }

  return (
    <div ref={anchorRef} className="coordinator-anchor">
      <Card
        title="Request details"
        actions={canEdit ? (
          <Button icon={<PencilLine size={14} aria-hidden="true" />} onClick={() => { setEditing(true); setSaved(null); }}>Edit details</Button>
        ) : undefined}
      >
        <div aria-live="polite" className="coordinator-live">
          {saved ? <Alert tone="success">{saved}</Alert> : null}
        </div>
        {!canEdit ? (
          <p className="coordinator-subtle">You can edit these details once the event is approved. Until then, the Organiser keeps them up to date.</p>
        ) : null}
        <FactList
          columns={2}
          items={[
            ['Description', event.description], ['Purpose', event.purpose],
            ['Venue requirements', event.venue_requirements], ['Accessibility needs', event.accessibility_note],
            ['Equipment', event.equipment_requirements], ['Layout', event.layout_preference],
            ['Registration', event.registration_setup],
          ]}
        />
      </Card>
    </div>
  );
}

function ReassignPanel({ event, onChanged }: { event: AssignedEventDetail; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [colleagues, setColleagues] = useState<Load<Colleague[]> | null>(null);
  const [choice, setChoice] = useState('');
  const [missing, setMissing] = useState(false);
  const [sending, setSending] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const pending = event.pendingReassignment;
  const reassignable = ACTIVE_STATUSES.includes(event.status);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setColleagues({ state: 'loading' });
    listColleagues(controller.signal)
      .then(outcome => { if (!controller.signal.aborted) setColleagues(outcome.ok ? { state: 'ready', data: outcome.data } : { state: 'error', failure: outcome }); })
      .catch(err => { if (!isAbort(err)) setColleagues({ state: 'error', failure: { status: 0, message: 'Unable to load your colleagues.' } }); });
    return () => controller.abort();
  }, [open]);

  function close() {
    setOpen(false);
    setChoice('');
    setMissing(false);
    setRefusal(null);
  }

  async function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (!choice) { setMissing(true); return; }
    setSending(true);
    setRefusal(null);
    const outcome = await requestReassignment(event.id, choice);
    setSending(false);
    if (!outcome.ok) { setRefusal(outcome.message); return; }
    setSent(`Request sent to ${outcome.data.toCoordinator.name}. You stay assigned until they accept.`);
    close();
    onChanged();
  }

  return (
    <Card title="Reassignment">
      <div aria-live="polite" className="coordinator-live">
        {sent ? <Alert tone="success">{sent}</Alert> : null}
      </div>
      {pending ? (
        <Alert tone="info" title={`Waiting for ${pending.toCoordinator.name} to respond`}>
          Requested {formatDate(pending.requestedAt, true)}. {pending.fromCoordinator.name} stays the assigned Coordinator until {pending.toCoordinator.name} accepts.
        </Alert>
      ) : !reassignable ? (
        <p className="coordinator-subtle">This event is {statusLabel(event.status).toLowerCase()}, so it can no longer be reassigned.</p>
      ) : !open ? (
        <>
          <p className="coordinator-subtle">Hand this event to a colleague. They must accept before it moves to them.</p>
          <div><Button icon={<Users size={14} aria-hidden="true" />} onClick={() => { setOpen(true); setSent(null); }}>Reassign event</Button></div>
        </>
      ) : (
        <form onSubmit={submit} className="coordinator-reassign-form" noValidate>
          {colleagues?.state === 'loading' ? <p role="status" className="coordinator-subtle"><Loader2 size={14} className="ui-spin" aria-hidden="true" /> Loading colleagues…</p> : null}
          {colleagues?.state === 'error' ? <Alert tone="error">{colleagues.failure.message}</Alert> : null}
          {colleagues?.state === 'ready' && colleagues.data.length === 0 ? (
            <p className="coordinator-subtle">No other Coordinators are available to take this event right now.</p>
          ) : null}
          {colleagues?.state === 'ready' && colleagues.data.length > 0 ? (
            <FormField label="Colleague" error={missing ? 'Choose the colleague to reassign this event to.' : undefined}>
              {props => (
                <select {...props} value={choice} onChange={change => { setChoice(change.target.value); setMissing(false); }}>
                  <option value="">Choose a colleague</option>
                  {colleagues.data.map(colleague => (
                    <option key={colleague.id} value={colleague.id}>
                      {colleague.full_name} — {colleague.active_events} active {colleague.active_events === 1 ? 'event' : 'events'}
                    </option>
                  ))}
                </select>
              )}
            </FormField>
          ) : null}
          {refusal ? <Alert tone="error">{refusal}</Alert> : null}
          <FormActions>
            <Button onClick={close}>Cancel</Button>
            <Button
              type="submit"
              variant="primary"
              icon={<Send size={14} aria-hidden="true" />}
              busy={sending}
              busyLabel="Sending…"
              disabled={colleagues?.state !== 'ready' || colleagues.data.length === 0}
            >
              Send request
            </Button>
          </FormActions>
        </form>
      )}
    </Card>
  );
}

// --- Reassignment inbox -------------------------------------------------

type Outcome = { tone: 'success' | 'error'; text: string; link?: { to: string; label: string } };

export function Reassignments() {
  const { result, reload } = useLoad(signal => listReassignments(signal), []);
  const [busy, setBusy] = useState<{ id: string; decision: 'accept' | 'decline' } | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  async function respond(item: Reassignment, decision: 'accept' | 'decline') {
    setBusy({ id: item.id, decision });
    setOutcome(null);
    const response = await respondToReassignment(item.id, decision);
    setBusy(null);
    if (!response.ok) {
      setOutcome({ tone: 'error', text: response.message });
    } else if (decision === 'accept') {
      setOutcome({
        tone: 'success',
        text: `You accepted. ${item.eventTitle} is now assigned to you.`,
        link: { to: `/coordinator/events/${encodeURIComponent(item.eventCode ?? item.eventId)}`, label: 'Open event' },
      });
    } else {
      setOutcome({ tone: 'success', text: `You declined. ${item.fromCoordinator.name} remains the assigned Coordinator for ${item.eventTitle} and has been notified.` });
    }
    reload();
  }

  return (
    <PageLayout eyebrow="Coordinator workspace" title="Reassignment requests">
      <div aria-live="polite" className="coordinator-live">
        {outcome?.tone === 'success' ? (
          <Alert tone="success" action={outcome.link ? <Link to={outcome.link.to}>{outcome.link.label}</Link> : undefined}>{outcome.text}</Alert>
        ) : null}
      </div>
      {outcome?.tone === 'error' ? <Alert tone="error">{outcome.text}</Alert> : null}
      {result.state === 'loading' ? <LoadingState label="Loading reassignment requests…" /> : null}
      {result.state === 'error' ? <LoadError failure={result.failure} onRetry={reload} context="reassignment requests" /> : null}
      {result.state === 'ready' ? (
        <>
          <section className="coordinator-list" aria-labelledby="incoming-heading">
            <div className="coordinator-section-heading">
              <h2 id="incoming-heading">Waiting for your answer <span className="ui-count">{result.data.incoming.length}</span></h2>
            </div>
            {result.data.incoming.length === 0 ? (
              <EmptyState title="Nothing waiting for you">
                When a colleague asks you to take over one of their events, it appears here for you to accept or decline.
              </EmptyState>
            ) : result.data.incoming.map(item => (
              <article key={item.id} className="card coordinator-request" aria-label={`Reassignment of ${item.eventTitle}`}>
                <div>
                  <strong>{item.eventTitle}</strong>
                  <small>{item.eventCode ?? 'No code'} · from {item.fromCoordinator.name} · {formatDate(item.requestedAt, true)}</small>
                  <p>{item.fromCoordinator.name} stays assigned unless you accept.</p>
                </div>
                <div className="coordinator-actions">
                  <Button
                    disabled={busy !== null}
                    busy={busy?.id === item.id && busy.decision === 'decline'}
                    busyLabel="Declining…"
                    onClick={() => respond(item, 'decline')}
                  >
                    Decline
                  </Button>
                  <Button
                    variant="primary"
                    icon={<CheckCircle2 size={14} aria-hidden="true" />}
                    disabled={busy !== null}
                    busy={busy?.id === item.id && busy.decision === 'accept'}
                    busyLabel="Accepting…"
                    onClick={() => respond(item, 'accept')}
                  >
                    Accept
                  </Button>
                </div>
              </article>
            ))}
          </section>
          <section className="coordinator-list" aria-labelledby="outgoing-heading">
            <div className="coordinator-section-heading">
              <h2 id="outgoing-heading">Sent by you <span className="ui-count">{result.data.outgoing.length}</span></h2>
            </div>
            {result.data.outgoing.length === 0 ? (
              <p className="coordinator-subtle">You have no reassignment requests awaiting a colleague&apos;s answer.</p>
            ) : result.data.outgoing.map(item => (
              <Link key={item.id} to={`/coordinator/events/${encodeURIComponent(item.eventCode ?? item.eventId)}`} className="coordinator-row">
                <div>
                  <strong>{item.eventTitle}</strong>
                  <small>{item.eventCode ?? 'No code'} · sent {formatDate(item.requestedAt, true)}</small>
                </div>
                <StatusPill status="warning" label={`Waiting for ${item.toCoordinator.name}`} />
              </Link>
            ))}
          </section>
        </>
      ) : null}
    </PageLayout>
  );
}
