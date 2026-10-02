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
// requests from the live API (organiserRequestsApi.ts) and are built on the
// shared blocks in src/shared (ADR-017). Clarification Response is still
// backed by mocks.ts fixtures and records a mock success: its backend is
// E03-S02, which has not been built yet.

import { useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertTriangle, CalendarClock, CheckCircle2, ClipboardList, MessageSquareText, Send,
} from 'lucide-react';
import {
  Alert, ButtonLink, Card, DataTable, EmptyState, ErrorState, FactList, FilterChips, LoadingState, PageLayout,
  StatusPill, formatDate, formatDateRange, statusLabel, useLoad, type Column, type Failure,
} from '../../shared';
import { findOrganiserEvent, type OrganiserStatus } from './mocks';
import {
  getRequestDetail, listOwnRequests, type EventStatus, type OwnRequest, type StatusHistoryEntry,
} from './organiserRequestsApi';
import './organiser.css';

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

// When the request is planned for. Missing dates read "Not set" (a draft may
// not have them yet).
function formatWhen(startAt?: string, endAt?: string) {
  if (!startAt) return 'Not set';
  return endAt ? formatDateRange(startAt, endAt) : formatDate(startAt, true);
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

// A refused read sends the Organiser back to their own home page.
function LoadError({ failure, onRetry, context }: { failure: Failure; onRetry: () => void; context: string }) {
  return <ErrorState failure={failure} onRetry={onRetry} context={context} backTo="/organiser" backLabel="Back to my events" />;
}

// The current own-request API returns the 100 most recently updated rows.
function RequestWindowNote({ count }: { count: number }) {
  return count >= 100 ? (
    <p role="note" className="organiser-note">Showing the 100 most recently updated requests. Counts and filters apply to these requests.</p>
  ) : null;
}

const newRequestLink = (
  <ButtonLink to="/organiser/new-request" variant="primary" icon={<Send size={14} aria-hidden="true" />}>Start a new request</ButtonLink>
);

export function OrganiserDashboard() {
  const { result, reload } = useLoad(signal => listOwnRequests(signal), []);
  const requests = result.state === 'ready' ? result.data : [];
  const count = (statuses: EventStatus[]) => requests.filter(request => statuses.includes(request.status)).length;
  const nextActions = requests.filter(request => !closedStatuses.includes(request.status)).sort(byStartDate).slice(0, 5);
  const metric = (value: number) => (result.state === 'ready' ? value : '–');

  return (
    <PageLayout
      eyebrow="Event organiser"
      title="My events"
      actions={<><ButtonLink to="/organiser/drafts">My drafts</ButtonLink>{newRequestLink}</>}
    >
      <section className="organiser-metrics" aria-label="Request status counts">
        <article><span>Drafts</span><strong>{metric(count(['draft']))}</strong></article>
        <article><span>Awaiting review</span><strong>{metric(count(awaitingStatuses))}</strong></article>
        <article><span>Need clarification</span><strong>{metric(count(['awaiting_clarification']))}</strong></article>
        <article><span>Approved</span><strong>{metric(count(approvedStatuses))}</strong></article>
      </section>
      <RequestWindowNote count={requests.length} />
      <section className="organiser-list" aria-labelledby="next-actions-heading">
        <div className="organiser-section-heading">
          <h2 id="next-actions-heading">Next actions</h2>
          <Link to="/organiser/requests"><ClipboardList size={14} aria-hidden="true" /> All requests</Link>
        </div>
        {result.state === 'loading' ? <LoadingState label="Loading your requests…" /> : null}
        {result.state === 'error' ? <LoadError failure={result.failure} onRetry={reload} context="your requests" /> : null}
        {result.state === 'ready' && nextActions.length === 0 ? (
          <EmptyState title="No requests in progress">
            Start a new request to get going. Requests you&apos;ve submitted appear here until they&apos;re closed.
          </EmptyState>
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
    </PageLayout>
  );
}

type RequestFilter = 'all' | 'drafts' | 'awaiting' | 'approved';

const requestFilters: { id: RequestFilter; label: string; matches: (request: OwnRequest) => boolean }[] = [
  { id: 'all', label: 'All', matches: () => true },
  { id: 'drafts', label: 'Drafts', matches: request => request.status === 'draft' },
  { id: 'awaiting', label: 'Awaiting review', matches: request => awaitingStatuses.includes(request.status) },
  { id: 'approved', label: 'Approved', matches: request => approvedStatuses.includes(request.status) },
];

const requestColumns: Column<OwnRequest>[] = [
  { header: 'Event', primary: true, cell: request => <Link to={requestLink(request)}>{requestTitle(request)}</Link> },
  { header: 'Purpose', cell: request => request.purpose || '—' },
  { header: 'Requested date', cell: request => formatWhen(request.startAt, request.endAt) },
  { header: 'Attendees', cell: request => request.expectedAttendance ?? '—' },
  { header: 'Status', cell: request => <StatusPill status={request.status} /> },
];

export function RequestList() {
  const { result, reload } = useLoad(signal => listOwnRequests(signal), []);
  const [filter, setFilter] = useState<RequestFilter>('all');
  const loaded = result.state === 'ready' ? result.data : null;
  const requests = useMemo(() => (loaded ? [...loaded].sort(byStartDate) : []), [loaded]);
  const active = requestFilters.find(item => item.id === filter) ?? requestFilters[0];
  const visible = useMemo(() => requests.filter(active.matches), [requests, active]);

  return (
    <PageLayout eyebrow="Event organiser" title="Requests" actions={newRequestLink}>
      {result.state === 'loading' ? <LoadingState label="Loading your requests…" rows={5} /> : null}
      {result.state === 'error' ? <LoadError failure={result.failure} onRetry={reload} context="your requests" /> : null}
      {result.state === 'ready' ? (
        <>
          <RequestWindowNote count={requests.length} />
          <FilterChips
            label="Request filter"
            options={requestFilters.map(item => ({ id: item.id, label: item.label, count: requests.filter(item.matches).length }))}
            value={filter}
            onChange={setFilter}
          />
          {visible.length === 0 ? (
            <EmptyState title={requests.length === 0 ? 'You have no requests yet' : `No requests in “${active.label}”`}>
              {requests.length === 0
                ? 'Requests you start or submit appear here.'
                : 'Choose another filter to see the rest of your requests.'}
            </EmptyState>
          ) : (
            <DataTable
              caption={`Your requests, ${active.label.toLowerCase()}`}
              columns={requestColumns}
              rows={visible}
              rowKey={request => request.id}
            />
          )}
        </>
      ) : null}
    </PageLayout>
  );
}

export function SubmittedDetail() {
  const { eventCode: identifier = '' } = useParams();
  const { result, reload } = useLoad(signal => getRequestDetail(identifier, signal), [identifier]);

  if (result.state === 'error' && result.failure.status === 404) {
    return <NotFound eventCode={identifier} message={result.failure.message} />;
  }
  const request = result.state === 'ready' ? result.data : null;

  return (
    <PageLayout
      eyebrow={request ? (request.eventCode ?? 'Request') : 'Event organiser'}
      title={request ? requestTitle(request) : result.state === 'error' ? 'Request unavailable' : 'Loading request…'}
      actions={request ? (
        <span className="organiser-status">
          <StatusPill status={request.status} />
          {request.statusChangedAt ? <small>Since {formatDate(request.statusChangedAt)}</small> : null}
        </span>
      ) : undefined}
    >
      {result.state === 'loading' ? <LoadingState label="Loading request…" rows={4} /> : null}
      {result.state === 'error' ? <LoadError failure={result.failure} onRetry={reload} context="this request" /> : null}
      {request ? (
        <>
          {request.status === 'awaiting_clarification' ? (
            <Alert tone="info">
              <p className="organiser-alert-copy">
                Your coordinator has requested clarification. Check your notifications and the event&apos;s comments for their questions.
              </p>
            </Alert>
          ) : null}
          <section className="organiser-detail-grid" aria-label="Request summary">
            <Card title="Summary">
              <FactList
                items={[
                  ['Purpose', request.purpose],
                  ['When', formatWhen(request.startAt, request.endAt)],
                  ['Expected attendees', request.expectedAttendance ?? null],
                  ...([
                    ['Venue needs', request.venueRequirements],
                    ['Accessibility', request.accessibilityNote],
                    ['Equipment', request.equipmentRequirements],
                    ['Layout', request.layoutPreference],
                  ] as [string, string | null | undefined][]).filter(([, value]) => value),
                ]}
              />
            </Card>
            <Timeline history={[...request.statusHistory].reverse()} />
          </section>
          <Card title={`Comments (${request.comments.length})`}>
            <p className="organiser-card-copy">
              <MessageSquareText size={16} aria-hidden="true" />
              <Link to={`/events/${encodeURIComponent(request.eventCode ?? request.id)}`}>
                Read and post comments on the event page
              </Link>
            </p>
          </Card>
        </>
      ) : null}
    </PageLayout>
  );
}

// Newest first. Marked up like the shared Card, as an <article> so the
// heading and its list stay one unit.
function Timeline({ history }: { history: StatusHistoryEntry[] }) {
  return (
    <article className="card ui-card" aria-labelledby="timeline-heading">
      <div className="ui-card-heading"><h2 id="timeline-heading">Timeline</h2></div>
      {history.length === 0 ? (
        <p className="organiser-card-copy">No status changes recorded yet.</p>
      ) : (
        <ul className="organiser-timeline">
          {history.map((entry, index) => (
            <li key={`${entry.occurred_at}-${index}`}>
              <strong>
                {entry.old_value ? `${statusLabel(entry.old_value)} → ` : ''}
                {entry.new_value ? statusLabel(entry.new_value) : ''}
              </strong>
              <span>{formatDate(entry.occurred_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
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
    <PageLayout eyebrow="Event organiser" title="Request not found">
      <EmptyState
        title="We couldn't find this request"
        icon={<CalendarClock size={22} />}
        action={<ButtonLink to="/organiser" variant="primary">Back to my events</ButtonLink>}
      >
        {message ?? `No request matches ${eventCode ?? 'the requested identifier'} in your list.`}
      </EmptyState>
    </PageLayout>
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
