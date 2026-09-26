// Organiser feature screens (SCRUM-105). Covers the Event Organiser role
// area from Batch 5 minus screens already shipped:
// - Dashboard (/organiser) — landing after sign-in
// - Request List (/organiser/requests) — filterable list of requests
// - Submitted Detail (/organiser/requests/:eventCode) — read-only timeline
// - Clarification Response (/organiser/requests/:eventCode/clarify) —
//   answer coordinator questions and resubmit
//
// The Create Request Wizard already exists as OrganiserRequestFlow.tsx on
// main; the routes below link to it at /organiser/new-request.
//
// All screens use frontend/src/features/organiser/mocks.ts fixtures. No
// backend calls; mutating actions surface a role="status" mock success.

import { useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle, CalendarClock, CheckCircle2, ClipboardList, MessageSquareText, Send,
} from 'lucide-react';
import { findOrganiserEvent, organiserEvents, organiserSummary, type OrganiserStatus } from './mocks';
import './organiser.css';

const statusTone: Record<OrganiserStatus, string> = {
  Draft:                    'neutral',
  Submitted:                'info',
  'Under review':           'info',
  'Clarification requested':'warning',
  Approved:                 'success',
  Planning:                 'info',
  Confirmed:                'success',
  Rejected:                 'danger',
  Cancelled:                'neutral',
};

export function OrganiserDashboard() {
  return (
    <main className="organiser-page">
      <header className="organiser-heading">
        <p className="eyebrow">Event organiser</p>
        <h1>My events</h1>
      </header>
      <section className="organiser-metrics" aria-label="Request status counts">
        <article><span>Drafts</span><strong>{organiserSummary.drafts}</strong></article>
        <article><span>Awaiting review</span><strong>{organiserSummary.awaiting}</strong></article>
        <article><span>Need clarification</span><strong>{organiserSummary.clarify}</strong></article>
        <article><span>Confirmed</span><strong>{organiserSummary.confirmed}</strong></article>
      </section>
      <section className="organiser-list" aria-label="Next actions">
        <h2>Next actions</h2>
        {organiserEvents.filter(event => event.status !== 'Draft').map(event => (
          <Link key={event.eventCode} to={`/organiser/requests/${event.eventCode}`} className="organiser-row">
            <div>
              <strong>{event.title}</strong>
              <small>{event.eventCode} · {event.preferredDate} · {event.attendeeCount} attendees</small>
            </div>
            <span className={`status-pill status-${statusTone[event.status]}`}>{event.status}</span>
          </Link>
        ))}
      </section>
      <p className="organiser-footer">
        <Link to="/organiser/requests"><ClipboardList size={14} aria-hidden="true" /> All requests</Link>
        <Link to="/organiser/drafts">My drafts</Link>
        <Link to="/organiser/new-request" className="primary-action">
          <Send size={14} aria-hidden="true" /> Start a new request
        </Link>
      </p>
    </main>
  );
}

export function RequestList() {
  const [filter, setFilter] = useState<'all' | 'drafts' | 'awaiting' | 'confirmed'>('all');
  const events = useMemo(() => {
    if (filter === 'drafts')    return organiserEvents.filter(event => event.status === 'Draft');
    if (filter === 'awaiting')  return organiserEvents.filter(event => event.status === 'Submitted' || event.status === 'Under review' || event.status === 'Clarification requested');
    if (filter === 'confirmed') return organiserEvents.filter(event => event.status === 'Confirmed' || event.status === 'Approved');
    return organiserEvents;
  }, [filter]);
  return (
    <main className="organiser-page">
      <header className="organiser-heading">
        <p className="eyebrow">Event organiser</p>
        <h1>Requests</h1>
      </header>
      <div className="organiser-filters" role="group" aria-label="Request filter">
        <button type="button" onClick={() => setFilter('all')}       aria-pressed={filter === 'all'}>All ({organiserEvents.length})</button>
        <button type="button" onClick={() => setFilter('drafts')}    aria-pressed={filter === 'drafts'}>Drafts</button>
        <button type="button" onClick={() => setFilter('awaiting')}  aria-pressed={filter === 'awaiting'}>Awaiting review</button>
        <button type="button" onClick={() => setFilter('confirmed')} aria-pressed={filter === 'confirmed'}>Confirmed</button>
      </div>
      <table className="organiser-table">
        <thead>
          <tr><th>Event</th><th>Purpose</th><th>Requested date</th><th>Attendees</th><th>Status</th></tr>
        </thead>
        <tbody>
          {events.map(event => (
            <tr key={event.eventCode}>
              <td><Link to={`/organiser/requests/${event.eventCode}`}>{event.eventCode} — {event.title}</Link></td>
              <td>{event.purpose}</td>
              <td>{event.preferredDate}</td>
              <td>{event.attendeeCount}</td>
              <td><span className={`status-pill status-${statusTone[event.status]}`}>{event.status}</span></td>
            </tr>
          ))}
          {events.length === 0 ? (
            <tr><td colSpan={5}>No requests match this filter.</td></tr>
          ) : null}
        </tbody>
      </table>
    </main>
  );
}

export function SubmittedDetail() {
  const { eventCode } = useParams();
  const event = findOrganiserEvent(eventCode ?? '');
  if (!event) return <NotFound eventCode={eventCode} />;
  return (
    <main className="organiser-page">
      <header className="organiser-heading">
        <p className="eyebrow">{event.eventCode}</p>
        <h1>{event.title}</h1>
        <span className={`status-pill status-${statusTone[event.status]}`}>{event.status}</span>
      </header>
      <section className="organiser-detail-grid" aria-label="Request summary">
        <article>
          <h2>Summary</h2>
          <dl>
            <dt>Purpose</dt><dd>{event.purpose}</dd>
            <dt>Preferred date</dt><dd>{event.preferredDate}</dd>
            <dt>Window</dt><dd>{event.preferredWindow}</dd>
            <dt>Expected attendees</dt><dd>{event.attendeeCount}</dd>
            <dt>Venue</dt><dd>{event.venue ?? 'To be booked'}</dd>
          </dl>
        </article>
        <article>
          <h2>Timeline</h2>
          {event.timeline.length === 0 ? (
            <p>No activity recorded yet.</p>
          ) : (
            <ul className="organiser-timeline">
              {event.timeline.map(entry => (
                <li key={entry.at}>
                  <strong>{entry.actor}</strong> · <span>{entry.at}</span>
                  <p>{entry.note}</p>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
      {event.status === 'Clarification requested' ? (
        <p className="organiser-alert">
          <AlertTriangle size={16} aria-hidden="true" />
          Coordinator has requested clarification.{' '}
          <Link to={`/organiser/requests/${event.eventCode}/clarify`}>Respond now</Link>.
        </p>
      ) : null}
    </main>
  );
}

export function ClarificationResponse() {
  const { eventCode } = useParams();
  const event = findOrganiserEvent(eventCode ?? '');
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  if (!event) return <NotFound eventCode={eventCode} />;
  if (event.clarificationQuestions.length === 0) {
    return (
      <main className="organiser-page">
        <header className="organiser-heading">
          <p className="eyebrow">{event.eventCode}</p>
          <h1>No clarification pending</h1>
        </header>
        <p>This request has no open questions from the coordinator.</p>
        <Link to={`/organiser/requests/${event.eventCode}`} className="primary-action">Back to request</Link>
      </main>
    );
  }
  function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (Object.keys(answers).length < event!.clarificationQuestions.length) return;
    if (Object.values(answers).some(value => !value.trim())) return;
    setSubmitted(true);
  }
  return (
    <main className="organiser-page">
      <header className="organiser-heading">
        <p className="eyebrow">{event.eventCode}</p>
        <h1>Respond to clarification</h1>
      </header>
      <p><MessageSquareText size={16} aria-hidden="true" /> Answer every question below and resubmit for review.</p>
      <form className="organiser-form" onSubmit={submit}>
        {event.clarificationQuestions.map((question, index) => (
          <div key={index} className="organiser-form-row">
            <label htmlFor={`answer-${index}`}>{index + 1}. {question}</label>
            <textarea
              id={`answer-${index}`}
              required
              rows={3}
              value={answers[index] ?? ''}
              onChange={changeEvent => setAnswers(previous => ({ ...previous, [index]: changeEvent.target.value }))}
            />
          </div>
        ))}
        <button type="submit" className="primary-action">
          <Send size={14} aria-hidden="true" /> Resubmit for review
        </button>
        <div role="status" aria-live="polite">
          {submitted ? <><CheckCircle2 size={14} aria-hidden="true" /> Responses recorded (mock, no backend call).</> : null}
        </div>
      </form>
    </main>
  );
}

function NotFound({ eventCode }: { eventCode: string | undefined }) {
  return (
    <main className="organiser-page">
      <header className="organiser-heading">
        <p className="eyebrow">Organiser</p>
        <h1>Request not found</h1>
      </header>
      <p>No request matches {eventCode ?? 'the requested identifier'} in your list.</p>
      <Link to="/organiser" className="primary-action">
        <CalendarClock size={14} aria-hidden="true" /> Back to my events
      </Link>
    </main>
  );
}

// ─── ChangeRequest ─────────────────────────────────────────────────────────────

export function ChangeRequest() {
  const { eventCode } = useParams();
  const event = findOrganiserEvent(eventCode ?? '');
  const [what, setWhat] = useState('');
  const [reason, setReason] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!event) return <NotFound eventCode={eventCode} />;

  function validate() {
    const errs: Record<string, string> = {};
    if (what.trim().length < 20) errs.what = 'Please describe the change in at least 20 characters.';
    if (reason.trim().length < 20) errs.reason = 'Please provide a reason of at least 20 characters.';
    return errs;
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <main className="organiser-page">
        <header className="organiser-heading">
          <p className="eyebrow">{event.eventCode}</p>
          <h1>Change request submitted</h1>
        </header>
        <div role="status" className="organiser-change-success">
          <CheckCircle2 size={20} aria-hidden="true" />
          <p>Your change request has been submitted and is pending coordinator review.</p>
          <Link to={`/organiser/requests/${event.eventCode}`} className="secondary-action">
            Back to request
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="organiser-page">
      <header className="organiser-heading">
        <p className="eyebrow">{event.eventCode}</p>
        <h1>Request a change</h1>
      </header>

      <div className="organiser-change-layout">
        <form className="organiser-change-form" onSubmit={submit} noValidate>
          <div className="organiser-form-section">
            <h2>What needs to change</h2>
            <div className="organiser-form-row">
              <label htmlFor="change-what">Description of change <span aria-hidden="true">*</span></label>
              <textarea
                id="change-what"
                rows={4}
                value={what}
                onChange={e => setWhat(e.target.value)}
                placeholder="Describe what you would like to change about this event…"
                aria-describedby={errors.what ? 'what-error' : undefined}
                aria-invalid={Boolean(errors.what)}
                required
              />
              {errors.what && <span id="what-error" role="alert" className="organiser-field-error">{errors.what}</span>}
            </div>
          </div>

          <div className="organiser-form-section">
            <h2>Reason for change</h2>
            <div className="organiser-form-row">
              <label htmlFor="change-reason">Reason <span aria-hidden="true">*</span></label>
              <textarea
                id="change-reason"
                rows={4}
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Explain why this change is needed…"
                aria-describedby={errors.reason ? 'reason-error' : undefined}
                aria-invalid={Boolean(errors.reason)}
                required
              />
              {errors.reason && <span id="reason-error" role="alert" className="organiser-field-error">{errors.reason}</span>}
            </div>
          </div>

          <div className="organiser-form-section">
            <h2>Preferred timeline</h2>
            <div className="organiser-date-row">
              <div className="organiser-form-row">
                <label htmlFor="change-from">Earliest date</label>
                <input id="change-from" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              </div>
              <div className="organiser-form-row">
                <label htmlFor="change-to">Latest date</label>
                <input id="change-to" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="organiser-form-actions">
            <Link to={`/organiser/requests/${event.eventCode}`} className="secondary-action">Cancel</Link>
            <button type="submit" className="primary-action">
              <Send size={14} aria-hidden="true" /> Submit change request
            </button>
          </div>
        </form>

        <aside className="organiser-review-rail" aria-label="Current event details">
          <h2>Current event details</h2>
          <dl className="organiser-review-dl">
            <dt>Event code</dt><dd>{event.eventCode}</dd>
            <dt>Title</dt><dd>{event.title}</dd>
            <dt>Status</dt>
            <dd><span className={`status-pill status-${statusTone[event.status]}`}>{event.status}</span></dd>
            <dt>Date</dt><dd>{event.preferredDate}</dd>
            <dt>Time</dt><dd>{event.preferredWindow}</dd>
            <dt>Attendees</dt><dd>{event.attendeeCount}</dd>
            <dt>Venue</dt><dd>{event.venue ?? 'Not yet assigned'}</dd>
          </dl>
        </aside>
      </div>
    </main>
  );
}

// ─── CancellationForm ────────────────────────────────────────────────────────

export function CancellationForm() {
  const { eventCode } = useParams();
  const event = findOrganiserEvent(eventCode ?? '');
  const [reason, setReason] = useState('');
  const [notifyAttendees, setNotifyAttendees] = useState(true);
  const [confirmation, setConfirmation] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!event) return <NotFound eventCode={eventCode} />;

  const canSubmit =
    reason.trim().length >= 30 &&
    confirmation === event.title;

  function validate() {
    const errs: Record<string, string> = {};
    if (reason.trim().length < 30) errs.reason = 'Please provide a reason of at least 30 characters.';
    if (confirmation !== event!.title) errs.confirmation = 'The event name does not match. Please type it exactly.';
    return errs;
  }

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <main className="organiser-page">
        <header className="organiser-heading">
          <p className="eyebrow">{event.eventCode}</p>
          <h1>Event cancelled</h1>
        </header>
        <div role="status" className="organiser-cancelled-banner">
          <AlertTriangle size={20} aria-hidden="true" />
          <p>The event has been marked as cancelled (mock, no backend call).</p>
          <Link to="/organiser" className="secondary-action">Back to my events</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="organiser-page" style={{ maxWidth: '42rem' }}>
      <header className="organiser-heading">
        <p className="eyebrow">{event.eventCode}</p>
        <h1>Cancel event</h1>
      </header>

      <div className="organiser-danger-banner" role="alert">
        <AlertTriangle size={18} aria-hidden="true" />
        <p>This action cannot be undone. The event will be permanently cancelled and all attendees will be notified.</p>
      </div>

      <form className="organiser-cancel-form" onSubmit={submit} noValidate>
        <div className="organiser-form-section">
          <div className="organiser-form-row">
            <label htmlFor="cancel-reason">Reason for cancellation <span aria-hidden="true">*</span></label>
            <textarea
              id="cancel-reason"
              rows={5}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Explain why this event is being cancelled…"
              aria-describedby={errors.reason ? 'cancel-reason-error' : 'cancel-reason-hint'}
              aria-invalid={Boolean(errors.reason)}
              required
            />
            <span id="cancel-reason-hint" className="organiser-field-hint">Minimum 30 characters ({reason.trim().length} / 30)</span>
            {errors.reason && <span id="cancel-reason-error" role="alert" className="organiser-field-error">{errors.reason}</span>}
          </div>
        </div>

        <div className="organiser-form-section">
          <label className="organiser-checkbox-label">
            <input
              type="checkbox"
              checked={notifyAttendees}
              onChange={e => setNotifyAttendees(e.target.checked)}
            />
            Notify registered attendees by email
          </label>
        </div>

        <div className="organiser-form-section">
          <div className="organiser-form-row">
            <label htmlFor="cancel-confirm">
              Type <strong>{event.title}</strong> to confirm
            </label>
            <input
              id="cancel-confirm"
              type="text"
              value={confirmation}
              onChange={e => setConfirmation(e.target.value)}
              placeholder={event.title}
              aria-describedby={errors.confirmation ? 'cancel-confirm-error' : 'cancel-confirm-hint'}
              aria-invalid={Boolean(errors.confirmation)}
            />
            <span id="cancel-confirm-hint" className="organiser-field-hint">Must match exactly.</span>
            {errors.confirmation && <span id="cancel-confirm-error" role="alert" className="organiser-field-error">{errors.confirmation}</span>}
          </div>
        </div>

        <div className="organiser-form-actions">
          <Link to={`/organiser/requests/${event.eventCode}`} className="secondary-action">
            Keep the event
          </Link>
          <button
            type="submit"
            className="primary-action"
            disabled={!canSubmit}
            style={canSubmit ? { background: 'var(--red)', color: '#ffffff' } : {}}
          >
            <AlertTriangle size={14} aria-hidden="true" /> Cancel this event
          </button>
        </div>
      </form>
    </main>
  );
}
