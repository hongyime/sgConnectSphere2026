// E08-S03 (SCRUM-60) Scenarios 1 to 5: the assigned Coordinator checks
// whether an event's arrangements are complete and submits it for its
// Operational Safety Check (T-71). Replaces the mock readiness checklist and
// final confirmation pages (D67); /confirm now redirects here, since nothing
// but the Safety Officer's approval (E08-S06) sets Confirmed.
//
// Built from templates/DecisionTemplate.tsx: "What you're submitting" with
// the facts, one card per arrangement, then "Your submission", where
// "Submit for safety check…" opens a ConfirmPanel. Each item's readiness is
// a generic-tone pill (design.md section 7: a condition, not a record).
//
// The server has the final say. The button stays available while the event
// is in Planning, so a blocked submission shows the server's sentence and its
// outstanding items (TC_E08S03_09 step 1), and a stale tab is corrected.
import { useEffect, useRef, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import {
  Alert, Button, ButtonLink, Card, ConfirmPanel, DataTable, ErrorState, FactList, LoadingState, PageLayout, StatusPill,
  formatDateRange, statusLabel, useLoad, type Column,
} from '../../shared';
import { getReadiness, readBlockedReadiness, submitForSafetyReview, type Readiness } from './readinessApi';

type Booking = Readiness['venueBookings'][number];
type Line = Readiness['equipment'][number];
type Support = Readiness['support'][number];

const stateLabel = { ready: 'Ready', outstanding: 'Outstanding', withdrawn: 'Withdrawn' } as const;
const stateTone = { ready: 'success', outstanding: 'warning', withdrawn: 'neutral' } as const;
function ReadyPill({ state }: { state: keyof typeof stateLabel }) {
  return <StatusPill status={stateTone[state]} label={stateLabel[state]} />;
}

const bookingColumns: Column<Booking>[] = [
  { header: 'Venue', primary: true, cell: row => row.venueName },
  { header: 'Purpose', cell: row => row.purpose ?? 'None recorded' },
  { header: 'When', cell: row => formatDateRange(row.startsAt, row.endsAt) },
  { header: 'Booking', cell: row => statusLabel(row.status) },
  { header: 'Readiness', cell: row => <ReadyPill state={row.state} /> },
];
const equipmentColumns: Column<Line>[] = [
  { header: 'Item', primary: true, cell: row => row.name },
  { header: 'Requested', cell: row => row.requested },
  { header: 'Reserved', cell: row => row.reserved },
  { header: 'Readiness', cell: row => <ReadyPill state={row.state} /> },
];
const supportColumns: Column<Support>[] = [
  { header: 'Support', primary: true, cell: row => row.description },
  { header: 'When', cell: row => formatDateRange(row.startsAt, row.endsAt) },
  { header: 'Staffing', cell: row => (row.status === 'staffed' ? 'Staff assigned' : 'No staff assigned') },
  { header: 'Readiness', cell: row => <ReadyPill state={row.state} /> },
];

export function EventReadiness() {
  const { eventCode = '' } = useParams();
  const { result, reload } = useLoad(signal => getReadiness(eventCode, signal), [eventCode]);
  const [done, setDone] = useState<string | null>(null);
  // A blocked submission returns a fresher snapshot than the page loaded.
  const [latest, setLatest] = useState<Readiness | null>(null);
  const readiness = latest ?? (result.state === 'ready' ? result.data : null);
  const back = `/coordinator/events/${encodeURIComponent(eventCode)}`;

  // A new route is a new event: drop the previous one's outcome.
  useEffect(() => { setDone(null); setLatest(null); }, [eventCode]);

  return (
    <PageLayout
      // An event with no code yet is named by its title only (design.md 8.1).
      eyebrow={readiness?.eventCode ?? 'Event readiness'}
      title={readiness ? `Readiness: ${readiness.title}` : 'Event readiness'}
      actions={readiness ? <StatusPill status={readiness.status} /> : undefined}
      // Wide, not the Decision template's narrow width: the three tables have
      // up to five columns, which the narrow width clipped (F3 screenshots).
    >
      {result.state === 'loading' ? <LoadingState label="Loading readiness…" rows={4} /> : null}
      {result.state === 'error' ? (
        <ErrorState failure={result.failure} onRetry={reload} context="this event" backTo="/coordinator" backLabel="Back to dashboard" />
      ) : null}
      {done ? <Alert tone="success" action={<ButtonLink to={back}>View event</ButtonLink>}>{done}</Alert> : null}
      {readiness ? (
        <>
          <Card title="What you're submitting">
            <FactList items={[
              ['Event date', formatDateRange(readiness.startsAt, readiness.endsAt)],
              ['Outstanding items', readiness.blockers.length === 0 ? 'None' : readiness.blockers.length],
            ]} />
          </Card>
          {readiness.blockers.length > 0 ? (
            <Alert tone="warning" title="Resolve these before submitting">
              <ul className="readiness-outstanding">
                {readiness.blockers.map(blocker => <li key={blocker.message}>{blocker.message}</li>)}
              </ul>
            </Alert>
          ) : null}
          <Card title="Venue bookings">
            {readiness.venueBookings.length === 0
              ? <p>No venue bookings yet. Every booking must be Confirmed or withdrawn, and at least one Confirmed.</p>
              : <DataTable caption="Venue bookings for this event" columns={bookingColumns} rows={readiness.venueBookings} rowKey={row => row.id} />}
          </Card>
          <Card title="Equipment">
            {readiness.equipment.length > 0
              ? <DataTable caption="Equipment requested for this event" columns={equipmentColumns} rows={readiness.equipment} rowKey={row => row.id} />
              : <p>{readiness.equipmentNoneRequired ? 'None required. Nothing to reserve.' : 'No equipment requests. Nothing to reserve.'}</p>}
          </Card>
          <Card title="Technical support">
            {readiness.support.length > 0
              ? <DataTable caption="Technical support requested for this event" columns={supportColumns} rows={readiness.support} rowKey={row => row.id} />
              : <p>{readiness.supportNoneRequired ? 'No technical support needed.' : 'No technical support requested.'}</p>}
          </Card>
          {readiness.status === 'planning' ? (
            done ? null : (
              <SubmitChoice
                key={readiness.eventId}
                readiness={readiness}
                onBlocked={snapshot => setLatest(snapshot)}
                onSubmitted={() => {
                  setLatest(null);
                  setDone('Submitted. The event is now in Safety Review; the Organiser and the Safety Officer have been notified.');
                  reload();
                }}
              />
            )
          ) : readiness.status === 'safety_review' ? (
            done ? null : <Alert tone="info">This event is in Safety Review. It is confirmed only once the Safety Officer approves it.</Alert>
          ) : (
            <Alert tone="info">
              This event is {statusLabel(readiness.status).toLowerCase()}. Only an event in Planning can be submitted for its safety check.
            </Alert>
          )}
          <div className="ui-actions">
            <ButtonLink to={back}>Back to event</ButtonLink>
          </div>
        </>
      ) : null}
    </PageLayout>
  );
}

function SubmitChoice({ readiness, onBlocked, onSubmitted }: {
  readiness: Readiness; onBlocked: (snapshot: Readiness) => void; onSubmitted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  const area = useRef<HTMLDivElement>(null);
  const opened = useRef(false);
  // Don't update state if the user navigated away while submitting. Set on
  // every mount: in development StrictMode mounts, unmounts and remounts once,
  // and a ref left false would drop every reply.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // Keyboard users follow the step: into the panel when it opens, back to
  // the button that opened it after.
  useEffect(() => {
    if (open) area.current?.querySelector<HTMLElement>('form button')?.focus();
    else if (opened.current) area.current?.querySelector<HTMLElement>('[data-choice="submit"]')?.focus();
  }, [open]);

  async function confirm() {
    setBusy(true);
    setRefusal(null);
    const outcome = await submitForSafetyReview(readiness.eventId);
    if (!mounted.current) return;
    setBusy(false);
    if (outcome.ok) { onSubmitted(); return; }
    setRefusal(outcome.message);
    const snapshot = readBlockedReadiness(outcome.details);
    if (snapshot) onBlocked(snapshot);
  }

  return (
    <div ref={area}>
      {open ? (
        <ConfirmPanel
          title="Submit for its safety check?"
          description="The event moves to Safety Review. The Organiser and the Safety Officer are notified, and the event is confirmed only once the Safety Officer approves it. Its arrangements can't change while it is in Safety Review."
          confirmLabel="Submit for safety check"
          busyLabel="Submitting…"
          busy={busy}
          error={refusal ?? undefined}
          onConfirm={confirm}
          onCancel={() => { setOpen(false); setRefusal(null); }}
        />
      ) : (
        <Card title="Your submission">
          <p>
            {readiness.canSubmit
              ? 'Every arrangement is ready. Submit the event for its Operational Safety Check.'
              : 'Some arrangements are still outstanding. You can submit once every item above is ready.'}
          </p>
          <div className="ui-actions">
            <Button
              variant="primary"
              data-choice="submit"
              icon={<ShieldCheck size={14} aria-hidden="true" />}
              onClick={() => { opened.current = true; setRefusal(null); setOpen(true); }}
            >
              Submit for safety check…
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

// The old final-confirmation link (D67): confirming is the Safety Officer's.
export function ConfirmRedirect() {
  const { eventCode = '' } = useParams();
  return <Navigate to={`/coordinator/events/${encodeURIComponent(eventCode)}/readiness`} replace />;
}
