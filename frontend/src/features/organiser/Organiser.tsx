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
