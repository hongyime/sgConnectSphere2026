// E06-S04 (SCRUM-48) "Decide on a venue booking request", for Venue Staff:
// the queue of Pending requests, one request with its decision, and the
// approve-or-reject page. Built from the List, Detail and Decision templates
// on the shared blocks (ADR-017, design.md).
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import {
  Alert, Button, ButtonLink, Card, ConfirmPanel, DataTable, EmptyState, ErrorState, FactList, FormField, LoadingState,
  PageLayout, StatusPill, formatDate, formatDateRange, useLoad,
} from '../../shared';
import { decideBooking, getBooking, listPendingBookings, type BookingRequest, type BookingStatus } from './bookingDecisionApi';
import { listVenues } from './venueApi';

const QUEUE = '/venue/bookings';
const bookingLink = (booking: BookingRequest) => `${QUEUE}/${encodeURIComponent(booking.id)}`;

// Confirmed and Rejected are record statuses (design.md section 7); a booking
// still waiting for Venue Staff has no record status of its own, so it uses
// the warning tone with the backlog's word for it.
export function BookingStatusPill({ status }: { status: BookingStatus }) {
  return status === 'pending' ? <StatusPill status="warning" label="Pending" /> : <StatusPill status={status} />;
}

function eventName(booking: BookingRequest) {
  return booking.event.code ? `${booking.event.code} · ${booking.event.title}` : booking.event.title;
}

// --- Queue ----------------------------------------------------------------

export function BookingRequests() {
  const { result, reload } = useLoad(signal => listPendingBookings(signal), []);
  return (
    <PageLayout eyebrow="Venue staff" title="Booking requests">
      {result.state === 'loading' ? <LoadingState label="Loading booking requests…" rows={4} /> : null}
      {result.state === 'error' ? <ErrorState failure={result.failure} context="booking requests" onRetry={reload} /> : null}
      {result.state === 'ready' && result.data.length === 0 ? (
        <EmptyState title="No booking requests waiting">
          When a Coordinator requests one of your venues, it appears here for you to approve or reject.
        </EmptyState>
      ) : null}
      {result.state === 'ready' && result.data.length > 0 ? (
        <DataTable<BookingRequest>
          caption="Pending booking requests, soonest first"
          rows={result.data}
          rowKey={booking => booking.id}
          columns={[
            {
              header: 'Event', primary: true,
              cell: booking => <><Link to={bookingLink(booking)}>{booking.event.title}</Link><small>{booking.event.code ?? 'No code'}</small></>,
            },
            { header: 'Venue', cell: booking => booking.venue.name },
            { header: 'When', cell: booking => formatDateRange(booking.startsAt, booking.endsAt) },
            { header: 'Coordinator', cell: booking => booking.event.coordinatorName ?? 'Not yet assigned' },
            { header: 'Requested', cell: booking => formatDate(booking.requestedAt) },
          ]}
        />
      ) : null}
    </PageLayout>
  );
}

// --- One request ----------------------------------------------------------

function requestFacts(booking: BookingRequest): [string, string][] {
  return [
    ['Venue', booking.venue.name],
    ['When', formatDateRange(booking.startsAt, booking.endsAt)],
    ['Event', eventName(booking)],
    ['Expected attendance', booking.event.expectedAttendance?.toLocaleString('en-SG') ?? 'None recorded'],
    ['Coordinator', booking.event.coordinatorName ?? 'Not yet assigned'],
    ['Requested', formatDate(booking.requestedAt, true)],
  ];
}

function decisionFacts(booking: BookingRequest): [string, string][] {
  return [
    ['Decided by', booking.decidedBy ?? 'Not recorded'],
    ['Decided', formatDate(booking.decidedAt, true)],
    ...(booking.status === 'rejected' ? [
      ['Reason', booking.decisionReason ?? 'None recorded'] as [string, string],
      ['Suggested alternative', booking.suggestedVenue?.name ?? 'None suggested'] as [string, string],
    ] : []),
  ];
}

export function BookingDetail() {
  const { bookingId = '' } = useParams();
  const { result, reload } = useLoad(signal => getBooking(bookingId, signal), [bookingId]);
  const booking = result.state === 'ready' ? result.data : null;
  return (
    <PageLayout
      eyebrow={booking?.event.code ?? 'Booking request'}
      title={booking?.event.title ?? (result.state === 'error' ? 'Booking request unavailable' : 'Loading booking request…')}
      actions={booking ? (
        <>
          {booking.status === 'pending' ? <ButtonLink to={`${bookingLink(booking)}/decide`} variant="primary">Decide on request</ButtonLink> : null}
          <BookingStatusPill status={booking.status} />
        </>
      ) : undefined}
    >
      {result.state === 'loading' ? <LoadingState label="Loading booking request…" rows={3} /> : null}
      {result.state === 'error' ? (
        <ErrorState failure={result.failure} context="this booking request" onRetry={reload} backTo={QUEUE} backLabel="Back to booking requests" />
      ) : null}
      {booking ? (
        <>
          <Card title="Request details"><FactList columns={2} items={requestFacts(booking)} /></Card>
          {booking.status !== 'pending' ? <Card title="Decision"><FactList columns={2} items={decisionFacts(booking)} /></Card> : null}
          <p><ButtonLink to={QUEUE}>Back to booking requests</ButtonLink></p>
        </>
      ) : null}
    </PageLayout>
  );
}

// --- Decide ---------------------------------------------------------------

type Choice = 'approve' | 'reject';

export function BookingDecision() {
  const { bookingId = '' } = useParams();
  const { result, reload } = useLoad(signal => getBooking(bookingId, signal), [bookingId]);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [suggested, setSuggested] = useState('');
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const booking = result.state === 'ready' ? result.data : null;

  function cancel() {
    setChoice(null);
    setSuggested('');
    setRefusal(null);
  }

  async function confirm(picked: Choice, reason: string) {
    setBusy(true);
    setRefusal(null);
    const outcome = await decideBooking(bookingId, picked === 'approve' ? { decision: 'approve' } : { decision: 'reject', reason, suggestedVenueId: suggested });
    setBusy(false);
    if (!outcome.ok) {
      // Field messages are written by the API to be shown (design.md 8.5).
      const fields = outcome.fieldErrors ? Object.values(outcome.fieldErrors).flat() : [];
      setRefusal(fields.length ? fields.join(' ') : outcome.message);
      return;
    }
    const coordinator = outcome.data.coordinatorNotified ? `${booking?.event.coordinatorName ?? 'The Coordinator'} has been notified` : 'No Coordinator is assigned yet, so nobody was notified';
    setDone(picked === 'approve'
      ? `Approved. The booking is confirmed. ${coordinator}.`
      : `Rejected. ${coordinator}${outcome.data.coordinatorNotified ? ', with your reason' : ''}.`);
    cancel();
    reload();
  }

  return (
    <PageLayout
      eyebrow={booking?.event.code ?? 'Booking request'}
      title={booking ? `Decide: ${booking.venue.name} for ${booking.event.title}` : 'Decide on a booking request'}
      actions={booking ? <BookingStatusPill status={booking.status} /> : undefined}
      width="narrow"
    >
      {result.state === 'loading' ? <LoadingState label="Loading booking request…" rows={2} /> : null}
      {result.state === 'error' ? (
        <ErrorState failure={result.failure} context="this booking request" onRetry={reload} backTo={QUEUE} backLabel="Back to booking requests" />
      ) : null}
      {done && booking ? <Alert tone="success" action={<ButtonLink to={bookingLink(booking)}>View request</ButtonLink>}>{done}</Alert> : null}
      {booking ? (
        <>
          <Card title="What you're deciding"><FactList items={requestFacts(booking)} /></Card>
          {booking.status !== 'pending' ? (
            done ? null : <Alert tone="info">This request is {booking.status}, so there's nothing to decide.</Alert>
          ) : choice ? (
            <ConfirmPanel
              title={choice === 'approve' ? 'Approve this booking request?' : 'Reject this booking request?'}
              description={choice === 'approve'
                ? <p>The booking becomes Confirmed, {booking.venue.name} shows it on its calendar, and the Coordinator is notified.</p>
                : <SuggestVenue current={booking.venue.id} value={suggested} onChange={setSuggested} />}
              confirmLabel={choice === 'approve' ? 'Approve request' : 'Reject request'}
              busyLabel={choice === 'approve' ? 'Approving…' : 'Rejecting…'}
              reasonLabel={choice === 'reject' ? 'Reason (required)' : undefined}
              reasonRequiredMessage="Add a reason for rejecting this request."
              danger={choice === 'reject'}
              busy={busy}
              error={refusal ?? undefined}
              onConfirm={reason => { void confirm(choice, reason); }}
              onCancel={cancel}
            />
          ) : (
            <Card title="Your decision">
              <div className="ui-actions">
                <Button variant="primary" icon={<CheckCircle2 size={14} aria-hidden="true" />} onClick={() => setChoice('approve')}>Approve…</Button>
                <Button variant="danger" icon={<XCircle size={14} aria-hidden="true" />} onClick={() => setChoice('reject')}>Reject…</Button>
              </div>
            </Card>
          )}
        </>
      ) : null}
    </PageLayout>
  );
}

// Scenario 2: an optional alternative venue, from the active catalogue.
function SuggestVenue({ current, value, onChange }: { current: string; value: string; onChange: (id: string) => void }) {
  const { result } = useLoad(signal => listVenues('', signal), []);
  const venues = result.state === 'ready' ? result.data.filter(venue => venue.id !== current) : [];
  return (
    <>
      <p>The Coordinator is notified with your reason. You can suggest another venue they can switch the request to.</p>
      <FormField
        label="Suggest another venue (optional)"
        hint={result.state === 'error' ? "Couldn't load venues. You can still reject without a suggestion." : undefined}
      >
        {props => (
          <select {...props} value={value} onChange={change => onChange(change.target.value)} disabled={result.state !== 'ready'}>
            <option value="">{result.state === 'loading' ? 'Loading venues…' : 'No suggestion'}</option>
            {venues.map(venue => <option key={venue.id} value={venue.id}>{venue.name}</option>)}
          </select>
        )}
      </FormField>
    </>
  );
}
