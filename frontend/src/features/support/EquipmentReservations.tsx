// E07-S04 (SCRUM-54): reserve or change the reservation for one equipment
// request line, from FormTemplate. The event's equipment page lists the lines,
// shows each reservation's state and releases reservations.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Button,
  ButtonLink,
  Card,
  ErrorState,
  FactList,
  FormActions,
  FormField,
  LoadingState,
  PageLayout,
  StatusPill,
  formatDateRange,
  useLoad,
  useSession,
} from '../../shared';
import {
  changeReservation,
  getRequests,
  reserveEquipment,
  type EquipmentRequest,
  type LineReservation,
  type RequestDetail,
  type RequestEvent,
  type ReservationOutcome,
} from './equipmentRequestApi';

export function eventPageFor(event: RequestEvent) {
  return `/support/events/${encodeURIComponent(event.eventCode ?? event.id)}/equipment`;
}

// The same sentences as the API, so a refusal reads the same before and after
// the round trip (design.md 8.5).
export function freeSentence(free: number) {
  if (free <= 0) return "None are free for this event's dates.";
  return `Only ${free} ${free === 1 ? 'is' : 'are'} free for this event's dates.`;
}

export function eventLabel(event: { eventCode: string | null; title: string }) {
  return event.eventCode && !event.title.startsWith(event.eventCode)
    ? `${event.eventCode} ${event.title}`
    : event.title;
}

function datesOf(event: { startsAt?: string; endsAt?: string }) {
  return event.startsAt && event.endsAt
    ? formatDateRange(event.startsAt, event.endsAt)
    : 'Not recorded';
}

export function isActive(reservation: LineReservation | null) {
  return !!reservation && reservation.status !== 'released';
}

// One pill per state (design.md 7: a status is always a pill), plus "Needs
// review" when a stock change has flagged the reservation.
export function ReservationPills({
  reservation,
  requested,
}: {
  reservation: LineReservation;
  requested: number;
}) {
  return (
    <>
      {reservation.status === 'reserved' ? (
        <StatusPill status="success" label="Reserved" />
      ) : reservation.status === 'partial' ? (
        <StatusPill
          status="warning"
          label={`Partial: ${reservation.quantityReserved} of ${requested} reserved`}
        />
      ) : (
        <StatusPill status="neutral" label="Released" />
      )}
      {reservation.requiresReconfirmation && isActive(reservation) ? (
        <>
          {' '}
          <StatusPill status="warning" label="Needs review" />
        </>
      ) : null}
    </>
  );
}

// The confirmation the checklist asks for: event, date, time, item, quantity.
export function ReservationSaved({
  outcome,
  action,
}: {
  outcome: ReservationOutcome;
  action: 'reserve' | 'change' | 'release';
}) {
  if (!outcome.changed) return <Alert tone="info">No changes to save.</Alert>;
  const { reservation: r, event } = outcome;
  const when = `${eventLabel(event)}, ${formatDateRange(event.startsAt, event.endsAt)}`;
  if (action === 'release')
    return (
      <Alert tone="success" title="Released">
        {r.name} × {r.quantityReserved} returned to the available pool for{' '}
        {when}.
      </Alert>
    );
  const partial = r.status === 'partial';
  return (
    <Alert
      tone="success"
      title={
        action === 'change'
          ? 'Reservation changed'
          : partial
            ? 'Partly reserved'
            : 'Reserved'
      }
    >
      <p>
        {partial
          ? `${r.name} × ${r.quantityReserved} of ${r.quantityRequested} reserved for ${when}. ${r.outstanding} still outstanding.`
          : `${r.name} × ${r.quantityReserved} reserved for ${when}.`}
      </p>
      <p>
        {outcome.notified
          ? 'The Coordinator has been notified.'
          : 'No Coordinator was notified: this event has no active assigned Coordinator.'}
      </p>
    </Alert>
  );
}

export function EquipmentReservationFormPage() {
  const { eventCode = '', requestId = '' } = useParams();
  const { result, reload } = useLoad(
    (signal) => getRequests(eventCode, signal),
    [eventCode, requestId],
  );
  const line =
    result.state === 'ready'
      ? result.data.requests.find((r) => r.id === requestId)
      : undefined;
  return (
    <PageLayout
      eyebrow={
        result.state === 'ready' && result.data.event.eventCode
          ? result.data.event.eventCode
          : 'Technical support'
      }
      title={isActive(line?.reservation ?? null) ? 'Change reservation' : 'Reserve equipment'}
      width="narrow"
    >
      {result.state === 'loading' ? (
        <LoadingState label="Loading equipment request…" rows={2} />
      ) : result.state === 'error' ? (
        <ErrorState
          failure={result.failure}
          context="this equipment request"
          onRetry={reload}
          backTo="/support/equipment-requests"
          backLabel="Back to equipment requests"
        />
      ) : (
        <ReservationForm
          key={`${eventCode}:${requestId}`}
          data={result.data}
          line={line}
        />
      )}
    </PageLayout>
  );
}

function ReservationForm({
  data,
  line,
}: {
  data: RequestDetail;
  line: EquipmentRequest | undefined;
}) {
  const navigate = useNavigate();
  const session = useSession();
  const staff =
    session.status === 'signed-in' &&
    session.user.role === 'technical_support_staff';
  const back = eventPageFor(data.event);
  const current = line && isActive(line.reservation) ? line.reservation : null;
  const free = line?.freeQuantity ?? null;
  const limit = line ? Math.min(line.quantity, free ?? line.quantity) : 0;
  const [quantity, setQuantity] = useState(() =>
    String(current ? current.quantityReserved : limit > 0 ? limit : (line?.quantity ?? 1)),
  );
  const [error, setError] = useState<string | undefined>();
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Set on every mount: StrictMode mounts, unmounts and remounts once in
  // development (FormTemplate, #189).
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Wait for the session, so Technical Support never sees the refusal flash.
  if (session.status === 'loading')
    return <LoadingState label="Loading equipment request…" rows={2} />;
  const refusal = !line
    ? 'Equipment request not found for this event.'
    : !staff
      ? 'Access denied. Only Technical Support Staff can reserve equipment.'
    : !data.canReserve
      ? data.event.status === 'confirmed'
        ? "This event is confirmed, so its equipment reservations can't be changed here."
        : 'Equipment can only be reserved while the event is approved or planning.'
      : !line.isActive
        ? "This equipment has been retired, so it can't be reserved."
        : null;
  if (refusal || !line)
    return (
      <>
        <Alert tone={line ? 'info' : 'error'}>{refusal}</Alert>
        <ButtonLink to={back}>Back to event equipment</ButtonLink>
      </>
    );

  function validate(value: string) {
    const number = Number(value);
    if (!/^\d+$/.test(value.trim()) || !Number.isInteger(number) || number < 1)
      return 'Enter a whole number greater than 0.';
    if (number > line!.quantity)
      return `You can reserve at most the ${line!.quantity} requested.`;
    if (free !== null && number > free) return freeSentence(free);
    return undefined;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const found = validate(quantity);
    setError(found);
    if (found) {
      setServerError('Fix the highlighted fields, then save again.');
      return;
    }
    setSaving(true);
    setServerError(null);
    const code = data.event.eventCode ?? data.event.id;
    const response = current
      ? await changeReservation(code, { reservationId: current.id, quantity: Number(quantity) })
      : await reserveEquipment(code, { requestId: line!.id, quantity: Number(quantity) });
    if (!mounted.current) return;
    setSaving(false);
    if (!response.ok) {
      setServerError(response.message);
      setError(response.fieldErrors?.quantity?.[0]);
      return;
    }
    navigate(back, {
      state: {
        reservationSaved: {
          outcome: response.data,
          action: current ? 'change' : 'reserve',
        },
      },
    });
  }

  return (
    <Card title={line.name}>
      <form onSubmit={submit} noValidate className="ui-form">
        {serverError ? <Alert tone="error">{serverError}</Alert> : null}
        {current?.requiresReconfirmation ? (
          <Alert tone="warning" title="Needs review">
            This item&apos;s stock or status changed after it was reserved.
            Check the quantity, then save to clear the review.
          </Alert>
        ) : null}
        <FactList
          columns={2}
          items={[
            ['Event', eventLabel(data.event)],
            ['Event dates', datesOf(data.event)],
            ['Quantity requested', line.quantity],
            ['Free for these dates', free === null ? 'Not recorded' : free],
            ...(current
              ? ([
                  [
                    'Reserved now',
                    current.status === 'partial'
                      ? `${current.quantityReserved} (partial)`
                      : current.quantityReserved,
                  ],
                ] as [string, string | number][])
              : []),
          ]}
        />
        {free === 0 ? (
          <Alert tone="warning">{freeSentence(0)}</Alert>
        ) : null}
        <FormField
          label="Quantity to reserve"
          hint={`From 1 to ${Math.max(limit, 1)}. Reserving fewer than the ${line.quantity} requested records a partial reservation.`}
          error={error}
        >
          {(props) => (
            <input
              {...props}
              type="number"
              inputMode="numeric"
              min={1}
              max={line.quantity}
              step={1}
              value={quantity}
              disabled={saving}
              onChange={(change) => {
                setQuantity(change.target.value);
                setError(undefined);
                setServerError(null);
              }}
            />
          )}
        </FormField>
        <FormActions>
          <ButtonLink to={back}>Cancel</ButtonLink>
          <Button
            type="submit"
            variant="primary"
            busy={saving}
            busyLabel={current ? 'Saving…' : 'Reserving…'}
          >
            {current ? 'Save reservation' : 'Reserve equipment'}
          </Button>
        </FormActions>
      </form>
    </Card>
  );
}
