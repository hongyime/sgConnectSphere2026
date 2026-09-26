import { useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle, CalendarClock, CheckCircle2, ClipboardCheck, ClipboardList,
  Inbox, MessageSquareText, Send,
} from 'lucide-react';
import { coordinatorEvents, coordinatorSummary, findCoordinatorEvent, type CoordinatorStatus } from './mocks';
import './coordinator.css';

const statusTone: Record<CoordinatorStatus, string> = {
  'Draft':                   'neutral',
  'Under review':            'info',
  'Clarification requested': 'warning',
  'Approved':                'success',
  'Planning':                'info',
  'Confirmed':               'success',
  'Rejected':                'danger',
};

function CoordinatorNav({ eventCode }: { eventCode?: string }) {
  return (
    <nav className="coordinator-tabs" aria-label="Event workflow">
      {eventCode ? (
        <>
          <Link to={`/coordinator/events/${eventCode}`}>Overview</Link>
          <Link to={`/coordinator/events/${eventCode}/decide`}>Decide</Link>
          <Link to={`/coordinator/events/${eventCode}/plan`}>Plan</Link>
          <Link to={`/coordinator/events/${eventCode}/readiness`}>Readiness</Link>
          <Link to={`/coordinator/events/${eventCode}/confirm`}>Confirm</Link>
        </>
      ) : null}
    </nav>
  );
}

export function CoordinatorHome() {
  return (
    <main className="coordinator-page">
      <header className="coordinator-heading">
        <p className="eyebrow">Coordinator workspace</p>
        <h1>Workload dashboard</h1>
        <Link to="/coordinator/venues">Search venues</Link>
        <Link to="/coordinator/calendar">Venue availability calendar</Link>
      </header>
      <section className="coordinator-metrics" aria-label="Workload counts">
        <article><span>Assigned</span><strong>{coordinatorSummary.assigned}</strong></article>
        <article><span>Awaiting decision</span><strong>{coordinatorSummary.awaitingDecision}</strong></article>
        <article><span>In planning</span><strong>{coordinatorSummary.inPlanning}</strong></article>
        <article><span>Ready to confirm</span><strong>{coordinatorSummary.readyToConfirm}</strong></article>
      </section>
      <section className="coordinator-list" aria-label="Next actions">
        <h2>Next actions</h2>
        {coordinatorEvents.map(event => (
          <Link key={event.eventCode} to={`/coordinator/events/${event.eventCode}`} className="coordinator-row">
            <div>
              <strong>{event.title}</strong>
              <small>{event.eventCode} · {event.clientOrg} · SLA {event.slaDue}</small>
            </div>
            <span className={`status-pill status-${statusTone[event.status]}`}>{event.status}</span>
          </Link>
        ))}
      </section>
      <p className="coordinator-footer">
        <Link to="/coordinator/queue"><Inbox size={14} aria-hidden="true" /> Full review queue</Link>
      </p>
    </main>
  );
}

export function ReviewQueue() {
  const [filter, setFilter] = useState<'all' | 'needs-decision' | 'overdue'>('all');
  const events = useMemo(() => {
    if (filter === 'needs-decision') return coordinatorEvents.filter(e => e.status === 'Under review' || e.status === 'Clarification requested');
    if (filter === 'overdue') return coordinatorEvents.filter(e => e.slaDue === 'overdue');
    return coordinatorEvents;
  }, [filter]);
  return (
    <main className="coordinator-page">
      <header className="coordinator-heading">
        <p className="eyebrow">Coordinator queue</p>
        <h1>Review queue</h1>
      </header>
      <div className="coordinator-filters" role="group" aria-label="Queue filter">
        <button type="button" onClick={() => setFilter('all')} aria-pressed={filter === 'all'}>All ({coordinatorEvents.length})</button>
        <button type="button" onClick={() => setFilter('needs-decision')} aria-pressed={filter === 'needs-decision'}>Needs decision</button>
        <button type="button" onClick={() => setFilter('overdue')} aria-pressed={filter === 'overdue'}>Overdue</button>
      </div>
      <table className="coordinator-table">
        <thead><tr><th>Event</th><th>Organiser</th><th>Requested</th><th>Status</th><th>SLA</th></tr></thead>
        <tbody>
          {events.map(event => (
            <tr key={event.eventCode}>
              <td><Link to={`/coordinator/events/${event.eventCode}`}>{event.eventCode} — {event.title}</Link></td>
              <td>{event.organiser}</td>
              <td>{event.requestedDate}</td>
              <td><span className={`status-pill status-${statusTone[event.status]}`}>{event.status}</span></td>
              <td>{event.slaDue}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

export function RequestDetail() {
  const { eventCode } = useParams();
  const event = findCoordinatorEvent(eventCode ?? '');
  if (!event) return <PermissionOrNotFound eventCode={eventCode} />;
  return (
    <main className="coordinator-page">
      <header className="coordinator-heading">
        <p className="eyebrow">{event.eventCode}</p>
        <h1>{event.title}</h1>
        <span className={`status-pill status-${statusTone[event.status]}`}>{event.status}</span>
      </header>
      <CoordinatorNav eventCode={event.eventCode} />
      <section className="coordinator-grid" aria-label="Event summary">
        <article>
          <h2>Summary</h2>
          <dl>
            <dt>Organiser</dt><dd>{event.organiser} ({event.clientOrg})</dd>
            <dt>Requested date</dt><dd>{event.requestedDate}</dd>
            <dt>Expected attendees</dt><dd>{event.capacity}</dd>
            <dt>Venue</dt><dd>{event.venue ?? 'To be booked'}</dd>
          </dl>
        </article>
        <article>
          <h2>Requirements</h2>
          <ul>
            {event.requirements.map(requirement => (<li key={requirement}>{requirement}</li>))}
          </ul>
        </article>
      </section>
      <section aria-label="Audit trail">
        <h2><MessageSquareText size={16} aria-hidden="true" /> Activity</h2>
        <ul className="coordinator-audit">
          {event.auditTrail.map(entry => (
            <li key={entry.at}><strong>{entry.actor}</strong> · <span>{entry.at}</span><p>{entry.note}</p></li>
          ))}
        </ul>
      </section>
    </main>
  );
}

export function DecisionPanel() {
  const { eventCode } = useParams();
  const event = findCoordinatorEvent(eventCode ?? '');
  const [choice, setChoice] = useState<'approve' | 'reject' | 'clarify' | ''>('');
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState<null | string>(null);
  if (!event) return <PermissionOrNotFound eventCode={eventCode} />;
  function submit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    if (!choice) return;
    if (choice !== 'approve' && !reason.trim()) return;
    setSubmitted(`${choice} recorded (mock, no backend call).`);
  }
  return (
    <main className="coordinator-page">
      <header className="coordinator-heading">
        <p className="eyebrow">{event.eventCode}</p>
        <h1>Decision</h1>
      </header>
      <CoordinatorNav eventCode={event.eventCode} />
      <form onSubmit={submit} className="coordinator-form" aria-labelledby="decision-heading">
        <h2 id="decision-heading">Choose an outcome</h2>
        {(['approve', 'clarify', 'reject'] as const).map(option => (
          <label key={option} className="coordinator-radio">
            <input type="radio" name="decision" value={option} checked={choice === option} onChange={() => setChoice(option)} />
            <span>{option === 'approve' ? 'Approve' : option === 'clarify' ? 'Request clarification' : 'Reject'}</span>
          </label>
        ))}
        {choice && choice !== 'approve' ? (
          <>
            <label htmlFor="reason">Reason (required)</label>
            <textarea id="reason" value={reason} onChange={changeEvent => setReason(changeEvent.target.value)} required rows={4} />
          </>
        ) : null}
        <button type="submit" className="primary-action" disabled={!choice || (choice !== 'approve' && !reason.trim())}>
          <Send size={14} aria-hidden="true" /> Record decision
        </button>
        <div role="status" aria-live="polite">{submitted}</div>
      </form>
    </main>
  );
}

export function PlanningWorkspace() {
  const { eventCode } = useParams();
  const event = findCoordinatorEvent(eventCode ?? '');
  if (!event) return <PermissionOrNotFound eventCode={eventCode} />;
  return (
    <main className="coordinator-page">
      <header className="coordinator-heading">
        <p className="eyebrow">{event.eventCode}</p>
        <h1>Planning workspace</h1>
      </header>
      <CoordinatorNav eventCode={event.eventCode} />
      <section className="coordinator-grid" aria-label="Planning status">
        <PlanningRow icon={CalendarClock} label="Venue" state={event.planning.venue} link={`/coordinator/events/${event.eventCode}/venues`} />
        <PlanningRow icon={ClipboardList} label="Equipment" state={event.planning.equipment} link="/support" />
        <PlanningRow icon={ClipboardCheck} label="Technical support" state={event.planning.technicalSupport} link="/support" />
      </section>
    </main>
  );
}

export function ReadinessChecklist() {
  const { eventCode } = useParams();
  const event = findCoordinatorEvent(eventCode ?? '');
  if (!event) return <PermissionOrNotFound eventCode={eventCode} />;
  const blockers = [
    event.planning.venue !== 'Confirmed' ? 'Venue is not confirmed.' : null,
    event.planning.equipment !== 'Complete' ? 'Equipment reservation is incomplete.' : null,
    event.planning.technicalSupport !== 'Assigned' ? 'Technical support is not assigned.' : null,
  ].filter((value): value is string => value !== null);
  const canConfirm = blockers.length === 0;
  return (
    <main className="coordinator-page">
      <header className="coordinator-heading">
        <p className="eyebrow">{event.eventCode}</p>
        <h1>Readiness checklist</h1>
      </header>
      <CoordinatorNav eventCode={event.eventCode} />
      <section>
        {canConfirm ? (
          <p className="coordinator-ready"><CheckCircle2 size={18} aria-hidden="true" /> All prerequisites met. Ready to confirm.</p>
        ) : (
          <>
            <p className="coordinator-blocked"><AlertTriangle size={18} aria-hidden="true" /> Confirmation blocked. Resolve the items below.</p>
            <ul className="coordinator-blockers">
              {blockers.map(blocker => (<li key={blocker}>{blocker}</li>))}
            </ul>
          </>
        )}
      </section>
      <Link to={`/coordinator/events/${event.eventCode}/confirm`} className={canConfirm ? 'primary-action' : 'primary-action primary-action-disabled'} aria-disabled={!canConfirm}>
        <Send size={14} aria-hidden="true" /> Go to final confirmation
      </Link>
    </main>
  );
}

export function FinalConfirmation() {
  const { eventCode } = useParams();
  const event = findCoordinatorEvent(eventCode ?? '');
  const [confirmed, setConfirmed] = useState(false);
  if (!event) return <PermissionOrNotFound eventCode={eventCode} />;
  const canConfirm = event.planning.venue === 'Confirmed' && event.planning.equipment === 'Complete' && event.planning.technicalSupport === 'Assigned';
  return (
    <main className="coordinator-page">
      <header className="coordinator-heading">
        <p className="eyebrow">{event.eventCode}</p>
        <h1>Final confirmation</h1>
      </header>
      <CoordinatorNav eventCode={event.eventCode} />
      {confirmed ? (
        <p role="status" className="coordinator-ready">
          <CheckCircle2 size={18} aria-hidden="true" /> Event confirmed (mock). Attendee notifications queued.
        </p>
      ) : (
        <>
          <p>Confirming publishes the event to attendees and queues notification deliveries. This action is recorded in the audit log.</p>
          <button type="button" className="primary-action" disabled={!canConfirm} onClick={() => setConfirmed(true)}>
            <Send size={14} aria-hidden="true" /> Confirm event
          </button>
          {!canConfirm ? (
            <p className="coordinator-blocked"><AlertTriangle size={14} aria-hidden="true" /> Complete the readiness checklist first.</p>
          ) : null}
        </>
      )}
    </main>
  );
}

function PlanningRow({ icon: Icon, label, state, link }: { icon: typeof CalendarClock; label: string; state: string; link: string }) {
  const ready = ['Confirmed', 'Complete', 'Assigned'].includes(state);
  return (
    <article className={`coordinator-plan-row ${ready ? 'coordinator-plan-ready' : 'coordinator-plan-pending'}`}>
      <Icon size={20} aria-hidden="true" />
      <div>
        <strong>{label}</strong>
        <span>{state}</span>
      </div>
      <Link to={link} className="coordinator-plan-link">Open</Link>
    </article>
  );
}

function PermissionOrNotFound({ eventCode }: { eventCode: string | undefined }) {
  return (
    <main className="coordinator-page">
      <header className="coordinator-heading">
        <p className="eyebrow">Coordinator</p>
        <h1>Event not found</h1>
      </header>
      <p>No event matches {eventCode ?? 'the requested identifier'} in your assigned queue.</p>
      <Link to="/coordinator" className="primary-action">Back to dashboard</Link>
    </main>
  );
}
