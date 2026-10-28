import { CancellationNotice } from '../events/EventCancellation';
// Organiser feature screens (SCRUM-105). Covers the Event Organiser role
// area from Batch 5 minus screens already shipped:
// - Dashboard (/organiser) — landing after sign-in
// - Request List (/organiser/requests) — filterable list of requests
// - Submitted Detail (/organiser/requests/:eventCode) — read-only timeline
//
// The Create Request Wizard already exists as OrganiserRequestFlow.tsx on
// main; the routes below link to it at /organiser/new-request.
//
// Dashboard, Request List and Submitted Detail read the organiser's own
// requests from the live API (organiserRequestsApi.ts) and are built on the
// shared blocks in src/shared (ADR-017). Submitted Detail also shows the
// E03-S02 (SCRUM-33) outstanding questions and links to the answer screen,
// AnswerQuestions.tsx (/organiser/requests/:eventCode/clarify), the
// E03-S03 (SCRUM-34) rejection with its date and reason, and the E08-S03
// (SCRUM-60) confirmed arrangements.

import { useMemo, useState, type FormEvent } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  AlertTriangle, CalendarClock, CheckCircle2, ClipboardList, MessageSquareText, Send,
} from 'lucide-react';
import {
  Alert, ButtonLink, Card, DataTable, EmptyState, ErrorState, FactList, FilterChips, LoadingState, PageLayout,
  StatusPill, formatDate, formatDateRange, statusLabel, useLoad, type Column, type Failure,
} from '../../shared';
import { OutstandingQuestions } from '../events/OutstandingQuestions';
import { findOrganiserEvent, type OrganiserStatus } from './mocks';
import {
  getRequestDetail, listOwnRequests, type ConfirmedArrangements, type EventStatus, type OwnRequest, type RequestDetail,
  type StatusHistoryEntry,
} from './organiserRequestsApi';

// The stored value for "none required" (E02-S01 Scenario 4).
const NONE_REQUIRED = 'none_required';
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
const approvedStatuses: EventStatus[] = ['approved', 'planning', 'safety_review', 'confirmed'];
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
  // AnswerQuestions comes back here with { answered: true } after sending.
  const answered = (useLocation().state as { answered?: boolean } | null)?.answered === true;

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
          {['approved', 'planning', 'safety_review', 'confirmed', 'completed', 'cancelled'].includes(request.status) ?
            <ButtonLink to={`/organiser/requests/${encodeURIComponent(identifier)}/change`}>Change requests</ButtonLink> : null}
          {['approved', 'planning', 'safety_review', 'confirmed'].includes(request.status) ?
            <ButtonLink to={`/organiser/requests/${encodeURIComponent(identifier)}/registration-period`}>Registration period</ButtonLink> : null}
          {request.status === 'confirmed' ?
            <ButtonLink to={`/organiser/requests/${encodeURIComponent(identifier)}/registrations`}>Registrations</ButtonLink> : null}
          <StatusPill status={request.status} />
          {request.statusChangedAt ? <small>Since {formatDate(request.statusChangedAt)}</small> : null}
        </span>
      ) : undefined}
    >
      {result.state === 'loading' ? <LoadingState label="Loading request…" rows={4} /> : null}
      {result.state === 'error' ? <LoadError failure={result.failure} onRetry={reload} context="this request" /> : null}
      {request ? (
        <>
          {request.status === 'cancelled' && request.statusChangedAt ? <CancellationNotice reason={request.cancellationReason} date={request.statusChangedAt}/> : null}
          {request.canRequestCancellation ? <ButtonLink to={`/organiser/requests/${encodeURIComponent(identifier)}/cancel`}>Request cancellation</ButtonLink> : null}
          {answered ? <Alert tone="success">Answers sent. The request is back under review.</Alert> : null}
          {request.status === 'awaiting_clarification' ? (
            <Alert
              tone="info"
              action={request.outstandingQuestions.length > 0 ? (
                <ButtonLink to={`/organiser/requests/${encodeURIComponent(identifier)}/clarify`} variant="primary">Respond now</ButtonLink>
              ) : undefined}
            >
              <p className="organiser-alert-copy">
                {request.outstandingQuestions.length > 0
                  ? 'Your coordinator has requested clarification. Answer their questions to send the request back for review.'
                  : "Your coordinator has requested clarification. Check your notifications and the event's comments for their questions."}
              </p>
            </Alert>
          ) : null}
          {request.status === 'rejected' ? <RejectedNotice request={request} /> : null}
          <OutstandingQuestions questions={request.outstandingQuestions} />
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
                    // E08-S03 fix (a): the stored sentinel reads as words.
                    ['Equipment', request.equipmentRequirements === NONE_REQUIRED ? 'None required' : request.equipmentRequirements],
                    ['Layout', request.layoutPreference],
                  ] as [string, string | null | undefined][]).filter(([, value]) => value),
                ]}
              />
            </Card>
            <Timeline history={[...request.statusHistory].reverse()} />
          </section>
          {request.status === 'safety_review' ? (
            <Alert tone="info">Your event is awaiting its safety check. It is confirmed once the Safety Officer approves it.</Alert>
          ) : null}
          {request.arrangements ? <ConfirmedArrangementsCard arrangements={request.arrangements} /> : null}
          <Card title={`Comments (${request.comments.length})`}>
            <p className="organiser-card-copy">
              <MessageSquareText size={16} aria-hidden="true" />
              <Link to={`/events/${encodeURIComponent(request.eventCode ?? request.id)}`}>
                {request.status === 'cancelled' ? 'Read comments on the event page' : 'Read and post comments on the event page'}
              </Link>
            </p>
          </Card>
        </>
      ) : null}
    </PageLayout>
  );
}

// E08-S03 (SCRUM-60) Scenario 6, TC_E08S03_05: once the event is Confirmed,
// every confirmed venue with its purpose and period, and what was arranged.
// Technician names are internal, so support shows only what was asked for.
function ConfirmedArrangementsCard({ arrangements }: { arrangements: ConfirmedArrangements }) {
  const equipment = arrangements.equipment.length
    ? arrangements.equipment.map(item => `${item.name} × ${item.quantity}`).join(', ')
    : arrangements.equipmentNoneRequired ? 'None required' : null;
  const support = arrangements.support.length
    ? arrangements.support.map(item => `${item.description} (${formatDateRange(item.startsAt, item.endsAt)})`).join('; ')
    : null;
  return (
    <Card title="Confirmed arrangements">
      {arrangements.venues.length === 0 ? <p className="organiser-card-copy">No confirmed venue recorded.</p> : (
        <DataTable
          caption="Confirmed venues"
          columns={venueColumns}
          rows={arrangements.venues}
          rowKey={venue => `${venue.venueName}-${venue.startsAt}`}
        />
      )}
      <FactList items={[['Equipment reserved', equipment], ['Technical support staffed', support]]} />
    </Card>
  );
}

const venueColumns: Column<ConfirmedArrangements['venues'][number]>[] = [
  { header: 'Venue', primary: true, cell: venue => venue.venueName },
  { header: 'Purpose', cell: venue => venue.purpose ?? 'None recorded' },
  { header: 'When', cell: venue => formatDateRange(venue.startsAt, venue.endsAt) },
];

// E03-S03 (SCRUM-34) Scenario 5, TC_E03S03_05: the decision in plain language.
// A fact about the record, so an info alert (D34); the red pill carries the
// status. Rejected is final (T-41), so the page offers nothing to edit. Only
// seeded rejections can lack a reason (D30).
function RejectedNotice({ request }: { request: RequestDetail }) {
  const decidedAt = formatDate(request.decision?.decidedAt ?? request.statusChangedAt);
  const reason = request.decision?.reason;
  return (
    <Alert tone="info">
      <p className="organiser-alert-copy">
        {reason ? `Rejected on ${decidedAt} — ${reason}` : `Rejected on ${decidedAt}. No reason was recorded.`}
      </p>
    </Alert>
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

// Also used by the answer screen (AnswerQuestions.tsx).
export function NotFound({ eventCode, message }: { eventCode: string | undefined; message?: string }) {
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

// E10 change requests and cancellation use the live modules in ../events.
