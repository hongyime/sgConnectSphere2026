// Live E03-S01 (SCRUM-32) Coordinator screens: workload dashboard, review
// queue, assigned-event detail with reassignment, and the reassignment inbox.
// Data comes from coordinatorApi.ts. The decision, planning, readiness and
// confirmation screens in Coordinator.tsx still use mock data until their
// stories' backends land.
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, Clock3, Inbox, Loader2,
  LockKeyhole, RefreshCw, Send, UserRoundCheck, Users,
} from 'lucide-react';
import {
  ACTIVE_STATUSES, eventRef, formatDate, getAssignedEvent, listAssignedEvents, listColleagues,
  listReassignments, requestReassignment, respondToReassignment, statusLabel,
  type AssignedEventDetail, type AssignedEventSummary, type Colleague, type Reassignment,
} from './coordinatorApi';
import './coordinator.css';

type Failure = { status: number; message: string };
type Load<T> = { state: 'loading' } | { state: 'error'; failure: Failure } | { state: 'ready'; data: T };

function isAbort(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}

// Runs `load` whenever `deps` change. The AbortController cancels the
// previous request, so a slow response for an earlier route or retry can
// never overwrite the current one (success or error). A reload after an
// action keeps the current data on screen while it refreshes; only a new
// route (changed deps) or a retry after an error shows the loading state.
function useLoad<T>(load: (signal: AbortSignal) => Promise<{ ok: true; data: T } | ({ ok: false } & Failure)>, deps: unknown[]) {
  const [result, setResult] = useState<Load<T>>({ state: 'loading' });
  const [reloadToken, setReloadToken] = useState(0);
  const depsKey = JSON.stringify(deps);
  const loadedKey = useRef<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    if (loadedKey.current !== depsKey) setResult({ state: 'loading' });
    else setResult(current => current.state === 'ready' ? current : { state: 'loading' });
    load(controller.signal)
      .then(outcome => {
        if (controller.signal.aborted) return;
        loadedKey.current = depsKey;
        setResult(outcome.ok ? { state: 'ready', data: outcome.data } : { state: 'error', failure: outcome });
      })
      .catch(error => {
        if (!isAbort(error) && !controller.signal.aborted) {
          setResult({ state: 'error', failure: { status: 0, message: 'Something went wrong. Please try again.' } });
        }
      });
    return () => controller.abort();
  }, [depsKey, reloadToken]);
  return { result, reload: () => setReloadToken(token => token + 1) };
}

// --- Shared pieces ------------------------------------------------------

function Page({ eyebrow, title, aside, children }: { eyebrow: string; title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <>
      <main className="coordinator-page">
        <header className="page-heading coordinator-page-heading">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
          </div>
          {aside}
        </header>
        {children}
      </main>
    </>
  );
}

export function StatusPill({ status }: { status: string }) {
  return <span className={`status-pill status-${status.replaceAll('_', '-')}`}>{statusLabel(status)}</span>;
}

function LoadingState({ label, rows = 3 }: { label: string; rows?: number }) {
  return (
    <section className="card coordinator-state" aria-busy="true">
      <p role="status" className="coordinator-state-title"><Loader2 size={18} className="coordinator-spin" aria-hidden="true" /> {label}</p>
      <div className="coordinator-skeleton" aria-hidden="true">
        {Array.from({ length: rows }, (_, index) => <span key={index} />)}
      </div>
    </section>
  );
}

function FailureState({ failure, onRetry, context }: { failure: Failure; onRetry?: () => void; context: string }) {
  if (failure.status === 401) {
    return (
      <section className="card coordinator-state" role="alert">
        <p className="coordinator-state-title"><LockKeyhole size={18} aria-hidden="true" /> Sign in to continue</p>
        <p className="coordinator-state-copy">Your session has ended. Sign in again to see {context}.</p>
        <div><Link to="/login" className="primary-action">Sign in</Link></div>
      </section>
    );
  }
  if (failure.status === 403) {
    return (
      <section className="card coordinator-state coordinator-state-refused" role="alert">
        <p className="coordinator-state-title"><LockKeyhole size={18} aria-hidden="true" /> Access refused</p>
        <p className="coordinator-state-copy">{failure.message}</p>
        <div><Link to="/coordinator" className="secondary-action">Back to dashboard</Link></div>
      </section>
    );
  }
  return (
    <section className="card coordinator-state coordinator-state-error" role="alert">
      <p className="coordinator-state-title"><AlertTriangle size={18} aria-hidden="true" /> Couldn&apos;t load {context}</p>
      <p className="coordinator-state-copy">{failure.message}</p>
      {onRetry ? <div><button type="button" className="secondary-action" onClick={onRetry}><RefreshCw size={14} aria-hidden="true" /> Try again</button></div> : null}
    </section>
  );
}

function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="card coordinator-state coordinator-state-empty">
      <span className="coordinator-state-icon" aria-hidden="true">{icon}</span>
      <p className="coordinator-state-title">{title}</p>
      <p className="coordinator-state-copy">{children}</p>
    </section>
  );
}

function eventDates(event: { starts_at: string; ends_at: string }) {
  const start = formatDate(event.starts_at, true);
  const sameDay = new Date(event.starts_at).toDateString() === new Date(event.ends_at).toDateString();
  const end = sameDay
    ? new Date(event.ends_at).toLocaleTimeString('en-SG', { hour: 'numeric', minute: '2-digit' })
    : formatDate(event.ends_at, true);
  return `${start} – ${end}`;
}

function EventRow({ event }: { event: AssignedEventSummary }) {
  return (
    <Link to={`/coordinator/events/${encodeURIComponent(eventRef(event))}`} className="coordinator-row">
      <div>
        <strong>{event.title}</strong>
        <small>{event.event_code ?? 'No code'} · {event.organiser_name} · {formatDate(event.starts_at)}</small>
      </div>
      <span className="coordinator-row-meta">
        {event.reassignment_pending ? <span className="status-pill status-warning">Reassignment pending</span> : null}
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
    <Page
      eyebrow="Coordinator workspace"
      title="Workload dashboard"
      aside={(
        <div className="coordinator-actions">
          <Link to="/coordinator/venues" className="secondary-action">Search venues</Link>
          <Link to="/coordinator/calendar" className="secondary-action">Venue availability calendar</Link>
        </div>
      )}
    >
      {result.state === 'loading' ? <LoadingState label="Loading your assigned events…" /> : null}
      {result.state === 'error' ? <FailureState failure={result.failure} onRetry={reload} context="your assigned events" /> : null}
      {result.state === 'ready' ? <DashboardBody events={result.data.events} incoming={result.data.incoming} /> : null}
    </Page>
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
          <Link to="/coordinator/reassignments" className="primary-action">Review requests</Link>
        </section>
      ) : null}
      <section className="coordinator-metrics" aria-label="Workload counts">
        <article><span>Active events</span><strong>{active.length}</strong></article>
        <article><span>Needs review</span><strong>{count('submitted', 'under_review')}</strong></article>
        <article><span>Awaiting organiser</span><strong>{count('awaiting_clarification')}</strong></article>
        <article><span>Approved &amp; planning</span><strong>{count('approved', 'planning', 'confirmed')}</strong></article>
      </section>
      {active.length === 0 ? (
        <EmptyState icon={<Inbox size={22} />} title="No events assigned to you yet">
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

export function ReviewQueue() {
  const { result, reload } = useLoad(signal => listAssignedEvents(signal), []);
  const [filter, setFilter] = useState<(typeof queueFilters)[number]['id']>('all');
  const events = result.state === 'ready' ? result.data : [];
  const active = queueFilters.find(item => item.id === filter) ?? queueFilters[0];
  const shown = useMemo(
    () => active.statuses ? events.filter(event => (active.statuses as readonly string[]).includes(event.status)) : events,
    [events, active],
  );

  return (
    <Page eyebrow="Coordinator workspace" title="Review queue">
      {result.state === 'loading' ? <LoadingState label="Loading your queue…" rows={5} /> : null}
      {result.state === 'error' ? <FailureState failure={result.failure} onRetry={reload} context="your queue" /> : null}
      {result.state === 'ready' ? (
        <>
          <div className="coordinator-filters" role="group" aria-label="Filter by status">
            {queueFilters.map(item => {
              const total = item.statuses ? events.filter(event => (item.statuses as readonly string[]).includes(event.status)).length : events.length;
              return (
                <button key={item.id} type="button" onClick={() => setFilter(item.id)} aria-pressed={filter === item.id}>
                  {item.label} <span className="coordinator-count">{total}</span>
                </button>
              );
            })}
          </div>
          {shown.length === 0 ? (
            <EmptyState icon={<Inbox size={22} />} title={events.length === 0 ? 'Your queue is empty' : `No events in “${active.label}”`}>
              {events.length === 0
                ? 'Requests assigned to you will appear here as soon as organisers submit them.'
                : 'Choose another filter to see the rest of your assigned events.'}
            </EmptyState>
          ) : (
            <div className="coordinator-table-wrap">
              <table className="coordinator-table">
                <caption className="visually-hidden">Events assigned to you, {active.label.toLowerCase()}</caption>
                <thead><tr><th scope="col">Event</th><th scope="col">Organiser</th><th scope="col">Event date</th><th scope="col">Status</th><th scope="col">Assigned</th></tr></thead>
                <tbody>
                  {shown.map(event => (
                    <tr key={event.id}>
                      <td data-label="Event">
                        <Link to={`/coordinator/events/${encodeURIComponent(eventRef(event))}`}>{event.title}</Link>
                        <small>{event.event_code ?? 'No code'}{event.reassignment_pending ? ' · Reassignment pending' : ''}</small>
                      </td>
                      <td data-label="Organiser">{event.organiser_name}</td>
                      <td data-label="Event date">{formatDate(event.starts_at)}</td>
                      <td data-label="Status"><StatusPill status={event.status} /></td>
                      <td data-label="Assigned">{formatDate(event.coordinator_assigned_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </Page>
  );
}

// --- Request detail -----------------------------------------------------

export function RequestDetail() {
  const { eventCode = '' } = useParams();
  const { result, reload } = useLoad(signal => getAssignedEvent(eventCode, signal), [eventCode]);
  const event = result.state === 'ready' ? result.data : null;

  return (
    <Page
      eyebrow={event?.event_code ?? eventCode}
      title={event?.title ?? (result.state === 'error' ? 'Event unavailable' : 'Loading event…')}
      aside={event ? <StatusPill status={event.status} /> : undefined}
    >
      {result.state === 'loading' ? <LoadingState label="Loading event…" rows={4} /> : null}
      {result.state === 'error' ? <FailureState failure={result.failure} onRetry={reload} context="this event" /> : null}
      {event ? (
        <>
          <p className="coordinator-subtle"><Clock3 size={14} aria-hidden="true" /> {statusLabel(event.status)} since {formatDate(event.status_changed_at, true)}</p>
          <section className="coordinator-grid" aria-label="Event summary">
            <article className="card">
              <h2>Summary</h2>
              <dl className="coordinator-facts">
                <dt>Assigned Coordinator</dt>
                <dd>{event.coordinator_name}<small>Since {formatDate(event.coordinator_assigned_at)}</small></dd>
                <dt>Organiser</dt>
                <dd>{event.organiser_name}<small><a href={`mailto:${event.organiser_email}`}>{event.organiser_email}</a></small></dd>
                <dt>Event date</dt><dd>{eventDates(event)}</dd>
                <dt>Expected attendance</dt><dd>{event.expected_attendance.toLocaleString('en-SG')}</dd>
              </dl>
            </article>
            <ReassignPanel key={event.id} event={event} onChanged={reload} />
          </section>
          <section className="card" aria-labelledby="requirements-heading">
            <h2 id="requirements-heading">Request details</h2>
            <dl className="coordinator-facts coordinator-facts-wide">
              {([
                ['Description', event.description], ['Purpose', event.purpose],
                ['Venue requirements', event.venue_requirements], ['Accessibility needs', event.accessibility_note],
                ['Equipment', event.equipment_requirements], ['Layout', event.layout_preference],
                ['Registration', event.registration_setup],
              ] as const).map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd className={value ? undefined : 'coordinator-none'}>{value || 'None recorded'}</dd>
                </div>
              ))}
            </dl>
          </section>
        </>
      ) : null}
    </Page>
  );
}

function ReassignPanel({ event, onChanged }: { event: AssignedEventDetail; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [colleagues, setColleagues] = useState<Load<Colleague[]> | null>(null);
  const [choice, setChoice] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  async function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (!choice) { setError('Choose the colleague to reassign this event to.'); return; }
    setSending(true);
    setError(null);
    const outcome = await requestReassignment(event.id, choice);
    setSending(false);
    if (!outcome.ok) { setError(outcome.message); return; }
    setSent(`Request sent to ${outcome.data.toCoordinator.name}. You stay assigned until they accept.`);
    setOpen(false);
    onChanged();
  }

  return (
    <article className="card" aria-labelledby="reassign-heading">
      <h2 id="reassign-heading">Reassignment</h2>
      <div role="status" aria-live="polite" className="coordinator-inline-status">
        {sent ? <p className="coordinator-success"><CheckCircle2 size={16} aria-hidden="true" /> {sent}</p> : null}
      </div>
      {pending ? (
        <div className="coordinator-pending">
          <Clock3 size={18} aria-hidden="true" />
          <div>
            <strong>Waiting for {pending.toCoordinator.name} to respond</strong>
            <p>Requested {formatDate(pending.requestedAt, true)}. {pending.fromCoordinator.name} stays the assigned Coordinator until {pending.toCoordinator.name} accepts.</p>
          </div>
        </div>
      ) : !reassignable ? (
        <p className="coordinator-state-copy">This event is {statusLabel(event.status).toLowerCase()}, so it can no longer be reassigned.</p>
      ) : !open ? (
        <>
          <p className="coordinator-state-copy">Hand this event to a colleague. They must accept before it moves to them.</p>
          <div><button type="button" className="secondary-action" onClick={() => { setOpen(true); setSent(null); }}><Users size={14} aria-hidden="true" /> Reassign event</button></div>
        </>
      ) : (
        <form onSubmit={submit} className="coordinator-reassign-form" noValidate>
          {colleagues?.state === 'loading' ? <p role="status" className="coordinator-subtle"><Loader2 size={14} className="coordinator-spin" aria-hidden="true" /> Loading colleagues…</p> : null}
          {colleagues?.state === 'error' ? <p role="alert" className="coordinator-error">{colleagues.failure.message}</p> : null}
          {colleagues?.state === 'ready' && colleagues.data.length === 0 ? (
            <p className="coordinator-state-copy">No other Coordinators are available to take this event right now.</p>
          ) : null}
          {colleagues?.state === 'ready' && colleagues.data.length > 0 ? (
            <div className="field-control">
              <label htmlFor="reassign-colleague">Colleague</label>
              <select id="reassign-colleague" value={choice} onChange={change => { setChoice(change.target.value); setError(null); }} aria-invalid={Boolean(error) || undefined} aria-describedby={error ? 'reassign-error' : undefined}>
                <option value="">Choose a colleague</option>
                {colleagues.data.map(colleague => (
                  <option key={colleague.id} value={colleague.id}>
                    {colleague.full_name} — {colleague.active_events} active {colleague.active_events === 1 ? 'event' : 'events'}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {error ? <p id="reassign-error" role="alert" className="coordinator-error"><AlertTriangle size={14} aria-hidden="true" /> {error}</p> : null}
          <div className="coordinator-actions">
            <button type="button" className="secondary-action" onClick={() => { setOpen(false); setError(null); setChoice(''); }}>Cancel</button>
            <button type="submit" className="primary-action" disabled={sending || colleagues?.state !== 'ready' || colleagues.data.length === 0}>
              <Send size={14} aria-hidden="true" /> {sending ? 'Sending…' : 'Send request'}
            </button>
          </div>
        </form>
      )}
    </article>
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
    <Page eyebrow="Coordinator workspace" title="Reassignment requests">
      <div role="status" aria-live="polite">
        {outcome?.tone === 'success' ? (
          <p className="card coordinator-banner coordinator-banner-success">
            <CheckCircle2 size={18} aria-hidden="true" /> <span>{outcome.text}</span>
            {outcome.link ? <Link to={outcome.link.to}>{outcome.link.label}</Link> : null}
          </p>
        ) : null}
      </div>
      {outcome?.tone === 'error' ? (
        <p role="alert" className="card coordinator-banner coordinator-banner-error"><AlertTriangle size={18} aria-hidden="true" /> <span>{outcome.text}</span></p>
      ) : null}
      {result.state === 'loading' ? <LoadingState label="Loading reassignment requests…" /> : null}
      {result.state === 'error' ? <FailureState failure={result.failure} onRetry={reload} context="reassignment requests" /> : null}
      {result.state === 'ready' ? (
        <>
          <section className="coordinator-list" aria-labelledby="incoming-heading">
            <div className="coordinator-section-heading">
              <h2 id="incoming-heading">Waiting for your answer <span className="coordinator-count">{result.data.incoming.length}</span></h2>
            </div>
            {result.data.incoming.length === 0 ? (
              <EmptyState icon={<Inbox size={22} />} title="Nothing waiting for you">
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
                  <button type="button" className="secondary-action" disabled={busy !== null} onClick={() => respond(item, 'decline')}>
                    {busy?.id === item.id && busy.decision === 'decline' ? 'Declining…' : 'Decline'}
                  </button>
                  <button type="button" className="primary-action" disabled={busy !== null} onClick={() => respond(item, 'accept')}>
                    <CheckCircle2 size={14} aria-hidden="true" /> {busy?.id === item.id && busy.decision === 'accept' ? 'Accepting…' : 'Accept'}
                  </button>
                </div>
              </article>
            ))}
          </section>
          <section className="coordinator-list" aria-labelledby="outgoing-heading">
            <div className="coordinator-section-heading">
              <h2 id="outgoing-heading">Sent by you <span className="coordinator-count">{result.data.outgoing.length}</span></h2>
            </div>
            {result.data.outgoing.length === 0 ? (
              <p className="coordinator-subtle">You have no reassignment requests awaiting a colleague&apos;s answer.</p>
            ) : result.data.outgoing.map(item => (
              <Link key={item.id} to={`/coordinator/events/${encodeURIComponent(item.eventCode ?? item.eventId)}`} className="coordinator-row">
                <div>
                  <strong>{item.eventTitle}</strong>
                  <small>{item.eventCode ?? 'No code'} · sent {formatDate(item.requestedAt, true)}</small>
                </div>
                <span className="status-pill status-warning"><CalendarDays size={12} aria-hidden="true" />&nbsp;Waiting for {item.toCoordinator.name}</span>
              </Link>
            ))}
          </section>
        </>
      ) : null}
    </Page>
  );
}
