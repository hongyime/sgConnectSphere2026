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
// Dashboard, Request List and Submitted Detail read the organiser's own
// requests from the live API (organiserRequestsApi.ts). Clarification
// Response is still backed by mocks.ts fixtures and records a mock success:
// its backend is E03-S02, which has not been built yet.

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle, CalendarClock, CheckCircle2, ClipboardList, MessageSquareText, Send,
} from 'lucide-react';
import { findOrganiserEvent, type OrganiserStatus } from './mocks';
import {
  getRequestDetail, listOwnRequests, type EventStatus, type OwnRequest, type RequestDetail,
} from './organiserRequestsApi';
import './organiser.css';

const statusLabel: Record<EventStatus, string> = {
  draft:                  'Draft',
  submitted:              'Submitted',
  under_review:           'Under review',
  awaiting_clarification: 'Clarification requested',
  approved:               'Approved',
  planning:               'Planning',
  confirmed:              'Confirmed',
  rejected:               'Rejected',
  cancelled:              'Cancelled',
  completed:              'Completed',
};

const statusTone: Record<EventStatus, string> = {
  draft:                  'neutral',
  submitted:              'info',
  under_review:           'info',
  awaiting_clarification: 'warning',
  approved:               'success',
  planning:               'info',
  confirmed:              'success',
  rejected:               'danger',
  cancelled:              'neutral',
  completed:              'neutral',
};

const mockStatusTone: Record<OrganiserStatus, string> = {
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

const awaitingStatuses: EventStatus[] = ['submitted', 'under_review', 'awaiting_clarification'];
const approvedStatuses: EventStatus[] = ['approved', 'planning', 'confirmed'];
const closedStatuses: EventStatus[] = ['draft', 'rejected', 'cancelled', 'completed'];

function StatusPill({ status }: { status: EventStatus }) {
  return (
    <span className={`status-pill status-${statusTone[status] ?? 'neutral'}`}>{statusLabel[status] ?? status}</span>
  );
}

// Event times are Singapore times, whatever the browser's timezone.
const dateFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Singapore' });
const timeFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'Asia/Singapore' });

function formatDate(value: string | null | undefined) {
  return value ? dateFormat.format(new Date(value)) : 'Not set';
}

function formatWhen(startAt?: string, endAt?: string) {
  if (!startAt) return 'Not set';
  const start = new Date(startAt);
  const hours = endAt ? `${timeFormat.format(start)}–${timeFormat.format(new Date(endAt))}` : timeFormat.format(start);
  return `${dateFormat.format(start)}, ${hours}`;
}

function requestTitle(request: OwnRequest) {
  return request.title?.trim() || '(untitled draft)';
}

// Drafts open in the existing draft editor; everything else in the read-only detail.
function requestLink(request: OwnRequest) {
  return request.status === 'draft' ? `/organiser/drafts/${request.id}` : `/organiser/requests/${request.id}`;
}

function byStartDate(a: OwnRequest, b: OwnRequest) {
  return (a.startAt ?? '').localeCompare(b.startAt ?? '');
}

type RequestsState =
  | { status: 'loading' }
  | { status: 'loaded'; requests: OwnRequest[] }
  | { status: 'error'; message: string };

function useOwnRequests() {
  const [state, setState] = useState<RequestsState>({ status: 'loading' });
  const [reloadToken, setReloadToken] = useState(0);
  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    listOwnRequests().then(result => {
      if (active) setState(result.ok ? { status: 'loaded', requests: result.requests } : { status: 'error', message: result.message });
    });
    return () => { active = false; };
  }, [reloadToken]);
  return { state, reload: () => setReloadToken(token => token + 1) };
}

// The current own-request API returns the 100 most recently updated rows.
function RequestWindowNote({ count }: { count: number }) {
  return count >= 100 ? (
    <p role="note">Showing the 100 most recently updated requests. Counts and filters apply to these requests.</p>
  ) : null;
}

function LoadProblem({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="login-error">
      {message}{' '}
      <button type="button" className="secondary-action" onClick={onRetry}>Try again</button>
    </div>
  );
}

export function OrganiserDashboard() {
  const { state, reload } = useOwnRequests();
  const requests = state.status === 'loaded' ? state.requests : [];
  const count = (statuses: EventStatus[]) => requests.filter(request => statuses.includes(request.status)).length;
  const nextActions = requests.filter(request => !closedStatuses.includes(request.status)).sort(byStartDate).slice(0, 5);
  const metric = (value: number) => (state.status === 'loaded' ? value : '–');

  return (
    <main className="organiser-page">
      <header className="organiser-heading">
        <p className="eyebrow">Event organiser</p>
        <h1>My events</h1>
      </header>
      <section className="organiser-metrics" aria-label="Request status counts">
        <article><span>Drafts</span><strong>{metric(count(['draft']))}</strong></article>
        <article><span>Awaiting review</span><strong>{metric(count(awaitingStatuses))}</strong></article>
        <article><span>Need clarification</span><strong>{metric(count(['awaiting_clarification']))}</strong></article>
        <article><span>Approved</span><strong>{metric(count(approvedStatuses))}</strong></article>
      </section>
      <RequestWindowNote count={requests.length} />
      <section className="organiser-list" aria-label="Next actions">
        <h2>Next actions</h2>
        {state.status === 'loading' ? <p role="status">Loading your requests…</p> : null}
        {state.status === 'error' ? <LoadProblem message={state.message} onRetry={reload} /> : null}
        {state.status === 'loaded' && nextActions.length === 0 ? (
          <p>No requests in progress. Start a new request to get going.</p>
        ) : null}
        {nextActions.map(request => (
          <Link key={request.id} to={requestLink(request)} className="organiser-row">
            <div>
              <strong>{requestTitle(request)}</strong>
              <small>
                {formatWhen(request.startAt, request.endAt)}
                {request.expectedAttendance ? ` · ${request.expectedAttendance} attendees` : ''}
              </small>
            </div>
            <StatusPill status={request.status} />
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

type RequestFilter = 'all' | 'drafts' | 'awaiting' | 'approved';

export function RequestList() {
  const { state, reload } = useOwnRequests();
  const [filter, setFilter] = useState<RequestFilter>('all');
  const requests = useMemo(() => (state.status === 'loaded' ? [...state.requests].sort(byStartDate) : []), [state]);
  const visible = useMemo(() => {
    if (filter === 'drafts')   return requests.filter(request => request.status === 'draft');
    if (filter === 'awaiting') return requests.filter(request => awaitingStatuses.includes(request.status));
    if (filter === 'approved') return requests.filter(request => approvedStatuses.includes(request.status));
    return requests;
  }, [filter, requests]);

  const filterButton = (value: RequestFilter, label: string) => (
    <button type="button" onClick={() => setFilter(value)} aria-pressed={filter === value}>{label}</button>
  );

  return (
    <main className="organiser-page">
      <header className="organiser-heading">
        <p className="eyebrow">Event organiser</p>
        <h1>Requests</h1>
      </header>
      <RequestWindowNote count={requests.length} />
      <div className="organiser-filters" role="group" aria-label="Request filter">
        {filterButton('all', state.status === 'loaded' ? `All (${requests.length})` : 'All')}
        {filterButton('drafts', 'Drafts')}
        {filterButton('awaiting', 'Awaiting review')}
        {filterButton('approved', 'Approved')}
      </div>
      {state.status === 'loading' ? <p role="status">Loading your requests…</p> : null}
      {state.status === 'error' ? <LoadProblem message={state.message} onRetry={reload} /> : null}
      {state.status === 'loaded' ? (
        <div className="organiser-table-wrap">
          <table className="organiser-table organiser-table-stack">
            <thead>
              <tr><th>Event</th><th>Purpose</th><th>Requested date</th><th>Attendees</th><th>Status</th></tr>
            </thead>
            <tbody>
              {visible.map(request => (
                <tr key={request.id}>
                  <td data-label="Event"><Link to={requestLink(request)}>{requestTitle(request)}</Link></td>
                  <td data-label="Purpose">{request.purpose || '—'}</td>
                  <td data-label="Requested date">{formatWhen(request.startAt, request.endAt)}</td>
                  <td data-label="Attendees">{request.expectedAttendance ?? '—'}</td>
                  <td data-label="Status"><StatusPill status={request.status} /></td>
                </tr>
              ))}
              {visible.length === 0 ? (
                <tr><td colSpan={5}>{requests.length === 0 ? 'You have no requests yet.' : 'No requests match this filter.'}</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      ) : null}
    </main>
  );
}

type DetailState =
  | { status: 'loading' }
  | { status: 'loaded'; request: RequestDetail }
  | { status: 'not-found'; message: string }
  | { status: 'error'; message: string };

export function SubmittedDetail() {
  const { eventCode: identifier = '' } = useParams();
  const [state, setState] = useState<DetailState>({ status: 'loading' });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    getRequestDetail(identifier).then(result => {
      // A previous route or retry may finish after this request. Its success
      // and error responses must both be ignored once the effect is obsolete.
      if (!active) return;
      if (result.ok) setState({ status: 'loaded', request: result.request });
      else setState({ status: result.notFound ? 'not-found' : 'error', message: result.message });
    });
    return () => { active = false; };
  }, [identifier, reloadToken]);

  if (state.status === 'loading') {
    return <main className="organiser-page"><p role="status">Loading request…</p></main>;
  }
  if (state.status === 'not-found') return <NotFound eventCode={identifier} message={state.message} />;
  if (state.status === 'error') {
    return <main className="organiser-page"><LoadProblem message={state.message} onRetry={() => setReloadToken(token => token + 1)} /></main>;
  }

  const { request } = state;
  // Newest first, matching the order the timeline used before.
  const history = [...request.statusHistory].reverse();
  const optional: Array<[string, string | null | undefined]> = [
    ['Venue needs', request.venueRequirements],
    ['Accessibility', request.accessibilityNote],
    ['Equipment', request.equipmentRequirements],
    ['Layout', request.layoutPreference],
  ];
  return (
    <main className="organiser-page">
      <header className="organiser-heading">
        <p className="eyebrow">{request.eventCode ?? 'Request'}</p>
        <h1>{requestTitle(request)}</h1>
        <StatusPill status={request.status} />
        {request.statusChangedAt ? <small>Since {formatDate(request.statusChangedAt)}</small> : null}
      </header>
      {request.status === 'awaiting_clarification' ? (
        <p className="organiser-alert">
          <AlertTriangle size={16} aria-hidden="true" />
          Your coordinator has requested clarification. Check your notifications and the event's comments for their questions.
        </p>
      ) : null}
      <section className="organiser-detail-grid" aria-label="Request summary">
        <article>
          <h2>Summary</h2>
          <dl>
            <dt>Purpose</dt><dd>{request.purpose || '—'}</dd>
            <dt>When</dt><dd>{formatWhen(request.startAt, request.endAt)}</dd>
            <dt>Expected attendees</dt><dd>{request.expectedAttendance ?? '—'}</dd>
            {optional.filter(([, value]) => value).map(([label, value]) => (
              <div key={label} className="organiser-dl-row"><dt>{label}</dt><dd>{value}</dd></div>
            ))}
          </dl>
        </article>
        <article>
          <h2>Timeline</h2>
          {history.length === 0 ? (
            <p>No status changes recorded yet.</p>
          ) : (
            <ul className="organiser-timeline">
              {history.map((entry, index) => (
                <li key={`${entry.occurred_at}-${index}`}>
                  <strong>
                    {entry.old_value ? `${statusLabel[entry.old_value as EventStatus] ?? entry.old_value} → ` : ''}
                    {statusLabel[entry.new_value as EventStatus] ?? entry.new_value}
                  </strong>
                  {' · '}<span>{formatDate(entry.occurred_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
      <section aria-label="Comments" className="organiser-comments">
        <h2><MessageSquareText size={16} aria-hidden="true" /> Comments ({request.comments.length})</h2>
        <p>
          <Link to={`/events/${encodeURIComponent(request.eventCode ?? request.id)}`}>
            Read and post comments on the event page
          </Link>
        </p>
      </section>
      <p className="organiser-footer">
        <Link to="/organiser/requests"><ClipboardList size={14} aria-hidden="true" /> All requests</Link>
      </p>
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

function NotFound({ eventCode, message }: { eventCode: string | undefined; message?: string }) {
  return (
    <main className="organiser-page">
      <header className="organiser-heading">
        <p className="eyebrow">Organiser</p>
        <h1>Request not found</h1>
      </header>
      <p>{message ?? `No request matches ${eventCode ?? 'the requested identifier'} in your list.`}</p>
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
            <dd><span className={`status-pill status-${mockStatusTone[event.status]}`}>{event.status}</span></dd>
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
