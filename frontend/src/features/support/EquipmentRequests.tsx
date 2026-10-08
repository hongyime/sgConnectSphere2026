import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Button,
  ButtonLink,
  Card,
  ConfirmPanel,
  DataTable,
  EmptyState,
  ErrorState,
  FormActions,
  FormField,
  FormSection,
  LoadingState,
  PageLayout,
  StatusPill,
  formatDateRange,
  useLoad,
  useSession,
} from '../../shared';
import {
  getRequests,
  listRequestEvents,
  releaseReservation,
  removeRequest,
  saveRequest,
  type EquipmentRequest,
  type RequestDetail,
  type RequestEvent,
  type ReservationOutcome,
  type SaveResult,
} from './equipmentRequestApi';
import {
  ReservationPills,
  ReservationSaved,
  isActive,
} from './EquipmentReservations';
function eventRef(event: RequestEvent) {
  return event.eventCode ?? event.id;
}
function baseFor(staff: boolean) {
  return staff ? '/support' : '/coordinator';
}
function requestLink(event: RequestEvent, staff: boolean) {
  return `${baseFor(staff)}/events/${encodeURIComponent(eventRef(event))}/equipment`;
}
export function EquipmentRequestEvents() {
  const session = useSession();
  const staff =
    session.status === 'signed-in' &&
    session.user.role === 'technical_support_staff';
  const { result, reload } = useLoad(listRequestEvents, []);
  return (
    <PageLayout
      eyebrow={staff ? 'Technical support' : 'Coordinator workspace'}
      title="Equipment requests"
    >
      <p>
        {staff
          ? 'Review equipment requirements recorded for each event.'
          : 'Choose one of your approved events to record its equipment requirements.'}
      </p>
      {result.state === 'loading' ? (
        <LoadingState label="Loading equipment requests…" />
      ) : result.state === 'error' ? (
        <ErrorState
          failure={result.failure}
          context="equipment requests"
          onRetry={reload}
        />
      ) : result.data.events.length === 0 ? (
        <EmptyState title="No events to show">
          {staff
            ? 'Events with equipment requests will appear here.'
            : 'Your approved events will appear here when they are ready for planning.'}
        </EmptyState>
      ) : (
        <DataTable
          caption="Events with equipment requirements"
          rows={result.data.events}
          rowKey={(event) => event.id}
          columns={[
            {
              header: 'Event',
              primary: true,
              cell: (event) => (
                <Link to={requestLink(event, staff)}>
                  {event.eventCode ?? event.title}
                </Link>
              ),
            },
            { header: 'Title', cell: (event) => event.title },
            {
              header: 'Status',
              cell: (event) => <StatusPill status={event.status} />,
            },
            {
              header: 'Items requested',
              cell: (event) => event.requestCount ?? 0,
            },
          ]}
        />
      )}
    </PageLayout>
  );
}
export function EquipmentRequests() {
  const { eventCode = '' } = useParams();
  return <EventRequests key={eventCode} eventCode={eventCode} />;
}
function EventRequests({ eventCode }: { eventCode: string }) {
  const session = useSession();
  const staff =
    session.status === 'signed-in' &&
    session.user.role === 'technical_support_staff';
  const { result, reload } = useLoad(
    (signal) => getRequests(eventCode, signal),
    [eventCode],
  );
  const state = useLocation().state as {
    equipmentSaved?: SaveResult;
    reservationSaved?: ReservationOutcome;
    reservationAction?: 'reserve' | 'change';
  } | null;
  const saved = state?.equipmentSaved;
  const [removing, setRemoving] = useState<EquipmentRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [removed, setRemoved] = useState(false);
  // E07-S04: Technical Support releases a line's reservation in two steps.
  const [releasing, setReleasing] = useState<EquipmentRequest | null>(null);
  const [releaseError, setReleaseError] = useState('');
  const [released, setReleased] = useState<ReservationOutcome | null>(null);
  async function confirmRelease() {
    if (!releasing?.reservation || busy) return;
    setBusy(true);
    setReleaseError('');
    const response = await releaseReservation(
      eventCode,
      releasing.reservation.id,
    );
    setBusy(false);
    if (!response.ok) {
      setReleaseError(response.message);
      return;
    }
    setReleasing(null);
    setReleased(response.data);
    reload();
  }
  async function confirmRemove() {
    if (!removing || busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await removeRequest(eventCode, removing.id);
      if (!response.ok) {
        setError(response.message);
        return;
      }
      setRemoving(null);
      setRemoved(true);
      reload();
    } catch {
      setError('The equipment request could not be removed. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <PageLayout
      eyebrow={eventCode}
      title="Event equipment requests"
      actions={
        result.state === 'ready' && result.data.canEdit ? (
          <ButtonLink
            to={`${requestLink(result.data.event, false)}/new`}
            variant="primary"
          >
            Add equipment request
          </ButtonLink>
        ) : undefined
      }
    >
      {saved && !removed ? (
        <Alert tone={saved.warning ? 'warning' : 'success'}>
          {saved.changed ? 'Equipment request saved.' : 'No changes to save.'}
          {saved.warning ? (
            <p>
              {saved.warning.name}: {saved.warning.requested} units requested,
              but total stock is {saved.warning.totalStock}. This request cannot
              be met from existing stock.
            </p>
          ) : null}
          {saved.changed ? (
            <p>
              {saved.notified
                ? 'Technical Support Staff notified.'
                : 'No active Technical Support Staff accounts are available to notify.'}{' '}
              This records a requirement; it does not reserve equipment.
            </p>
          ) : null}
        </Alert>
      ) : null}
      {removed ? (
        <Alert tone="success">Equipment request removed.</Alert>
      ) : null}
      {released ? (
        <ReservationSaved outcome={released} action="release" />
      ) : state?.reservationSaved ? (
        <ReservationSaved
          outcome={state.reservationSaved}
          action={state.reservationAction ?? 'reserve'}
        />
      ) : null}
      {releasing?.reservation ? (
        <ConfirmPanel
          title={`Release ${releasing.name}?`}
          description={`The ${releasing.reservation.quantityReserved} reserved ${releasing.reservation.quantityReserved === 1 ? 'unit goes' : 'units go'} back to the available pool for this event's dates. The request stays on the event and can be reserved again.`}
          confirmLabel="Release reservation"
          busyLabel="Releasing…"
          danger
          error={releaseError || undefined}
          onConfirm={confirmRelease}
          onCancel={() => {
            setReleasing(null);
            setReleaseError('');
          }}
          busy={busy}
        />
      ) : null}
      {removing ? (
        <ConfirmPanel
          title={`Remove ${removing.name}?`}
          description="This removes this event's unreserved equipment requirement."
          confirmLabel="Confirm removal"
          onConfirm={confirmRemove}
          onCancel={() => {
            setRemoving(null);
            setError('');
          }}
          busy={busy}
        />
      ) : null}
      {error ? <Alert tone="error">{error}</Alert> : null}
      {result.state === 'loading' ? (
        <LoadingState label="Loading event equipment…" />
      ) : result.state === 'error' ? (
        <ErrorState
          failure={result.failure}
          context="this event's equipment"
          onRetry={reload}
        />
      ) : (
        <>
          <Card
            title={result.data.event.title}
            actions={<StatusPill status={result.data.event.status} />}
          >
            {staff ? (
              <p>
                {result.data.canReserve
                  ? `Reserve each request from the units free for this event's dates${result.data.event.startsAt && result.data.event.endsAt ? `, ${formatDateRange(result.data.event.startsAt, result.data.event.endsAt)}` : ''}. The Coordinator is notified of each reservation and change.`
                  : result.data.canRelease
                    ? 'This event is cancelled. Release its reservations to return the units to the available pool.'
                    : result.data.event.status === 'confirmed'
                      ? "This event is confirmed, so its equipment reservations can't be changed here."
                      : 'Equipment can be reserved while the event is approved or planning.'}
              </p>
            ) : !result.data.canEdit ? (
              <p>
                Equipment requests are read-only here. Only the assigned
                Coordinator can change unreserved requests while this event is
                approved or planning.
              </p>
            ) : (
              <p>
                Add each required item and quantity. Reserved requests cannot be
                amended or removed.
              </p>
            )}
            {result.data.requests.length ? (
              <DataTable
                caption="Equipment requested for this event"
                rows={result.data.requests}
                rowKey={(r) => r.id}
                columns={[
                  { header: 'Equipment', primary: true, cell: (r) => r.name },
                  { header: 'Quantity requested', cell: (r) => r.quantity },
                  { header: 'Total stock', cell: (r) => r.totalStock },
                  {
                    header: 'Status',
                    cell: (r) => (
                      <>
                        {r.reservation ? (
                          <ReservationPills
                            reservation={r.reservation}
                            requested={r.quantity}
                          />
                        ) : r.reserved ? (
                          <StatusPill status="neutral" label="Reserved" />
                        ) : (
                          <StatusPill
                            status={
                              r.quantity > r.totalStock ? 'warning' : 'neutral'
                            }
                            label={
                              r.quantity > r.totalStock
                                ? 'Exceeds total stock'
                                : 'Not reserved'
                            }
                          />
                        )}{' '}
                        {!r.isActive
                          ? 'Retired'
                          : r.operationalStatus === 'maintenance'
                            ? 'Under maintenance'
                            : ''}
                      </>
                    ),
                  },
                  { header: 'Notes', cell: (r) => r.notes || 'None recorded' },
                  ...(staff &&
                  (result.data.canReserve || result.data.canRelease)
                    ? [
                        {
                          header: 'Actions',
                          cell: (r: EquipmentRequest) => (
                            <StaffActions
                              line={r}
                              detail={result.data}
                              onRelease={() => {
                                setReleasing(r);
                                setReleaseError('');
                                setReleased(null);
                              }}
                            />
                          ),
                        },
                      ]
                    : []),
                  ...(result.data.canEdit
                    ? [
                        {
                          header: 'Actions',
                          cell: (r: EquipmentRequest) =>
                            r.reserved ? (
                              <span>Reserved requests are protected</span>
                            ) : (
                              <>
                                <ButtonLink
                                  to={`${requestLink(result.data.event, false)}/${r.id}/edit`}
                                >
                                  Edit {r.name}
                                </ButtonLink>
                                <Button
                                  onClick={() => {
                                    setRemoving(r);
                                    setError('');
                                    setRemoved(false);
                                  }}
                                >
                                  Remove {r.name}…
                                </Button>
                              </>
                            ),
                        },
                      ]
                    : []),
                ]}
              />
            ) : null}
          </Card>
          {!result.data.requests.length ? (
            <EmptyState title="No equipment requested yet">
              Add the equipment this event needs when planning its arrangements.
            </EmptyState>
          ) : null}
        </>
      )}
      <ButtonLink to={`${baseFor(staff)}/equipment-requests`}>
        Back to equipment requests
      </ButtonLink>
    </PageLayout>
  );
}
// E07-S04: what Technical Support can do with one line.
function StaffActions({
  line,
  detail,
  onRelease,
}: {
  line: EquipmentRequest;
  detail: RequestDetail;
  onRelease: () => void;
}) {
  const active = isActive(line.reservation);
  const form = `/support/events/${encodeURIComponent(eventRef(detail.event))}/equipment/${line.id}/reserve`;
  return (
    <>
      {detail.canReserve && line.isActive ? (
        <ButtonLink to={form}>
          {active ? `Change ${line.name} reservation` : `Reserve ${line.name}`}
        </ButtonLink>
      ) : null}
      {detail.canRelease && active ? (
        <Button onClick={onRelease}>Release {line.name}…</Button>
      ) : null}
      {!active && !(detail.canReserve && line.isActive) ? (
        <span>
          {detail.canReserve ? "Retired items can't be reserved" : 'Nothing to release'}
        </span>
      ) : null}
    </>
  );
}
export function EquipmentRequestFormPage() {
  const { eventCode = '', requestId } = useParams();
  const { result, reload } = useLoad(
    (signal) => getRequests(eventCode, signal),
    [eventCode, requestId],
  );
  return (
    <PageLayout
      eyebrow={eventCode}
      title={requestId ? 'Edit equipment request' : 'Add equipment request'}
      width="narrow"
    >
      {result.state === 'loading' ? (
        <LoadingState label="Loading equipment request…" />
      ) : result.state === 'error' ? (
        <ErrorState
          failure={result.failure}
          context="this equipment request"
          onRetry={reload}
        />
      ) : (
        <RequestForm
          key={`${eventCode}:${requestId ?? 'new'}`}
          data={result.data}
          requestId={requestId}
        />
      )}
    </PageLayout>
  );
}
function RequestForm({
  data,
  requestId,
}: {
  data: RequestDetail;
  requestId?: string;
}) {
  const original = data.requests.find((r) => r.id === requestId);
  const navigate = useNavigate();
  const back = requestLink(data.event, false);
  const [equipmentId, setEquipmentId] = useState(original?.equipmentId ?? '');
  const [quantity, setQuantity] = useState(String(original?.quantity ?? 1));
  const [notes, setNotes] = useState(original?.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  if (!data.canEdit || original?.reserved)
    return (
      <>
        <Alert tone="warning">
          {original?.reserved
            ? 'This request has been reserved and cannot be amended or removed here.'
            : 'Only the assigned Coordinator can change requests while this event is approved or planning.'}
        </Alert>
        <ButtonLink to={back}>Back to event equipment</ButtonLink>
      </>
    );
  if (requestId && !original)
    return (
      <>
        <Alert tone="error">Equipment request not found for this event.</Alert>
        <ButtonLink to={back}>Back to event equipment</ButtonLink>
      </>
    );
  const option = data.equipment.find((eq) => eq.id === equipmentId);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setErrors({});
    const response = await saveRequest(eventRef(data.event), {
      ...(requestId ? { id: requestId } : {}),
      equipmentId,
      quantity: Number(quantity),
      notes,
    });
    if (!mounted.current) return;
    setBusy(false);
    if (!response.ok) {
      setError(response.message);
      setErrors(response.fieldErrors ?? {});
      return;
    }
    navigate(back, { state: { equipmentSaved: response.data } });
  }
  return (
    <Card title={data.event.title}>
      <form onSubmit={submit} className="ui-form">
        {error ? <Alert tone="error">{error}</Alert> : null}
        <FormSection title="Equipment requirement">
          <FormField label="Equipment item" error={errors.equipmentId?.[0]}>
            {(props) => (
              <select
                {...props}
                required
                value={equipmentId}
                disabled={busy}
                onChange={(e) => setEquipmentId(e.target.value)}
              >
                <option value="">Choose equipment</option>
                {original &&
                !data.equipment.some((eq) => eq.id === original.equipmentId) ? (
                  <option value={original.equipmentId}>
                    {original.name} (retired)
                  </option>
                ) : null}
                {data.equipment
                  .filter(
                    (eq) =>
                      !data.requests.some(
                        (r) => r.equipmentId === eq.id && r.id !== requestId,
                      ),
                  )
                  .map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.name}
                    </option>
                  ))}
              </select>
            )}
          </FormField>
          <FormField
            label="Quantity requested"
            hint={
              option
                ? `Total stock: ${option.total_quantity}. Requests above total stock are saved with a warning.`
                : 'Enter the number of units this event needs.'
            }
            error={errors.quantity?.[0]}
          >
            {(props) => (
              <input
                {...props}
                required
                type="number"
                min="1"
                max="2147483647"
                step="1"
                value={quantity}
                disabled={busy}
                onChange={(e) => setQuantity(e.target.value)}
              />
            )}
          </FormField>
          <FormField
            label="Technical notes"
            wide
            hint="Optional; up to 2000 characters."
            error={errors.notes?.[0]}
          >
            {(props) => (
              <textarea
                {...props}
                maxLength={2000}
                value={notes}
                disabled={busy}
                onChange={(e) => setNotes(e.target.value)}
              />
            )}
          </FormField>
        </FormSection>
        {!data.equipment.length ? (
          <Alert tone="warning">
            No active equipment is available in the catalogue. Technical Support
            Staff must add equipment first.
          </Alert>
        ) : null}
        {option?.operational_status === 'maintenance' ? (
          <Alert tone="warning">
            This item is under maintenance. Recording the requirement does not
            guarantee availability.
          </Alert>
        ) : null}
        <FormActions>
          <ButtonLink to={back}>Cancel</ButtonLink>
          <Button
            type="submit"
            variant="primary"
            busy={busy}
            busyLabel="Saving…"
            disabled={!data.equipment.length}
          >
            Save equipment request
          </Button>
        </FormActions>
      </form>
    </Card>
  );
}
