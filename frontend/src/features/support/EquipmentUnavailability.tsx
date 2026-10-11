// E07-S05 (SCRUM-55): mark equipment unavailable for a period, and return it to
// service. The form page follows FormTemplate; the equipment detail page shows
// the periods in their own card and the outcome of each action at the top.
// Decisions D49-D54 are in docs/plans/scrum-55-implementation-status.md.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Alert,
  Button,
  ButtonLink,
  Card,
  ConfirmPanel,
  DataTable,
  EmptyState,
  ErrorState,
  FactList,
  FormActions,
  FormField,
  FormSection,
  LoadingState,
  PageLayout,
  formatDate,
  useLoad,
  useSession,
} from '../../shared';
import { getEquipment, type Equipment } from './equipmentApi';
import { eventLabel } from './EquipmentReservations';
import {
  markUnavailable,
  returnToService,
  type MarkedUnavailable,
  type ReturnedToService,
  type UnavailablePeriod,
} from './unavailabilityApi';

const REASON_MAX = 255;
const ACCESS_DENIED =
  'Access denied. Only Technical Support Staff can maintain equipment; Coordinators can view it.';
const RETIRED = "This equipment has been retired, so its availability can't be changed.";
const todayKey = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Singapore',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// Today in Singapore as YYYY-MM-DD, whatever the browser's own timezone.
export function today(now = new Date()) {
  return todayKey.format(now);
}

// "1 Dec 2026", or "1 Dec 2026 – 5 Dec 2026" (design.md 8.1).
export function formatDays(from: string, to: string) {
  const day = (value: string) => formatDate(`${value}T00:00:00+08:00`);
  return from === to ? day(from) : `${day(from)} – ${day(to)}`;
}

function units(count: number) {
  return `${count} ${count === 1 ? 'unit' : 'units'}`;
}

// The same sentences as the API (design.md 8.5).
export function inServiceSentence(inService: number) {
  if (inService <= 0) return 'No units are in service for these dates.';
  return `Only ${inService} ${inService === 1 ? 'unit is' : 'units are'} in service for these dates.`;
}

// D51: units still in service for the chosen days, from the item's current
// and future periods. Days are compared as YYYY-MM-DD text; the peak of the
// overlapping periods counts, as E07-S03 counts them.
export function inServiceFor(total: number, periods: UnavailablePeriod[], from: string, to: string) {
  const overlapping = periods.filter((period) => period.from <= to && period.to >= from);
  let peak = 0;
  for (const day of new Set([from, ...overlapping.map((period) => period.from)])) {
    if (day < from || day > to) continue;
    const out = overlapping
      .filter((period) => period.from <= day && period.to >= day)
      .reduce((sum, period) => sum + period.quantity, 0);
    peak = Math.max(peak, out);
  }
  return Math.max(0, total - peak);
}

type Values = { from: string; to: string; quantity: string; reason: string };
type Errors = Partial<Record<keyof Values, string>>;
const fields: (keyof Values)[] = ['from', 'to', 'quantity', 'reason'];

// Mirror of the server's rules (D51), so most problems show before a round
// trip; the server has the final say.
export function validate(values: Values, inService: number | null, now = new Date()): Errors {
  const errors: Errors = {};
  if (!values.from) errors.from = 'Start date must be a real date.';
  if (!values.to) errors.to = 'End date must be a real date.';
  else if (values.from && values.to < values.from) errors.to = 'End date must be on or after the start date.';
  else if (values.to < today(now)) errors.to = 'The end date must be today or later.';
  const quantity = Number(values.quantity);
  if (!/^\d+$/.test(values.quantity.trim()) || !Number.isInteger(quantity) || quantity < 1)
    errors.quantity = 'Enter a whole number greater than 0.';
  else if (inService !== null && quantity > inService) errors.quantity = inServiceSentence(inService);
  const reason = values.reason.trim();
  if (!reason) errors.reason = 'Enter a reason.';
  else if (reason.length > REASON_MAX) errors.reason = `Reason must be at most ${REASON_MAX} characters.`;
  return errors;
}

type Outcome = {
  unavailableSaved?: MarkedUnavailable & { name: string };
  returnedToService?: ReturnedToService;
};

// The outcome of the last action, at the top of the equipment page (design.md
// 6). Reservations that no longer fit are listed with who was told.
export function UnavailabilityOutcome() {
  const state = useLocation().state as Outcome | null;
  const saved = state?.unavailableSaved;
  const returned = state?.returnedToService;
  if (returned)
    return (
      <Alert tone="success" title="Returned to service">
        {returned.equipment.name} × {returned.unavailability.quantity} is back in service for{' '}
        {formatDays(returned.unavailability.from, returned.unavailability.to)}.
      </Alert>
    );
  if (!saved) return null;
  const period = saved.unavailability;
  const events = new Set(saved.affectedReservations.map((reservation) => reservation.eventId)).size;
  return (
    <>
      <Alert tone="success" title="Marked unavailable">
        {saved.name} × {period.quantity} out of service for {formatDays(period.from, period.to)} ({period.reason}).
        {events === 0 ? ' No reservations were affected.' : null}
      </Alert>
      {events > 0 ? (
        <Alert tone="warning" title="Reservations need review">
          <p>These reservations no longer fit and are flagged for review:</p>
          <ul>
            {saved.affectedReservations.map((reservation) => (
              <li key={reservation.id}>
                {eventLabel(reservation)}: {reservation.quantity} reserved
              </li>
            ))}
          </ul>
          <p>
            {saved.notified === events
              ? events === 1
                ? 'Its Coordinator has been notified.'
                : 'Their Coordinators have been notified.'
              : `${saved.notified} of ${events} Coordinators notified. The others have no active assigned Coordinator.`}
          </p>
        </Alert>
      ) : null}
    </>
  );
}

// The item's current and future unavailable periods, on its detail page.
export function UnavailablePeriods({ equipment, onChanged }: { equipment: Equipment; onChanged: () => void }) {
  const session = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const canEdit =
    equipment.is_active && session.status === 'signed-in' && session.user.role === 'technical_support_staff';
  const periods = equipment.unavailability ?? [];
  const [returning, setReturning] = useState<UnavailablePeriod | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function confirmReturn(period: UnavailablePeriod) {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    const result = await returnToService(period.id);
    if (!mounted.current) return;
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setReturning(null);
    navigate(location.pathname, { replace: true, state: { returnedToService: result.data } });
    onChanged();
  }

  // The panel sits above the card, not inside it: never a card in a card.
  return (
    <>
      {returning ? (
        <ConfirmPanel
          title={`Return ${equipment.name} to service?`}
          description={`The ${units(returning.quantity)} out for ${formatDays(returning.from, returning.to)} (${returning.reason}) count as available again. Reservations already flagged for review stay flagged until they are changed or released.`}
          confirmLabel="Return to service"
          busyLabel="Returning…"
          busy={busy}
          error={error}
          onConfirm={() => confirmReturn(returning)}
          // ConfirmPanel disables Cancel while busy.
          onCancel={() => {
            setReturning(null);
            setError(undefined);
          }}
        />
      ) : null}
      <Card
        title="Unavailable periods"
        actions={
          canEdit ? (
            <ButtonLink to={`/support/catalogue/${equipment.id}/unavailable`}>Mark unavailable</ButtonLink>
          ) : undefined
        }
      >
        {periods.length === 0 ? (
          <EmptyState title="No unavailable periods">
            Units taken out of service for damage or maintenance are listed here.
          </EmptyState>
        ) : (
          <DataTable
            caption="Unavailable periods"
            rows={periods}
            rowKey={(period) => period.id}
            columns={[
              { header: 'Dates', primary: true, cell: (period) => formatDays(period.from, period.to) },
              { header: 'Units out', cell: (period) => `${period.quantity} of ${equipment.total_quantity}` },
              { header: 'Reason', cell: (period) => period.reason },
              {
                header: 'Actions',
                cell: (period) =>
                  canEdit ? (
                    <Button
                      onClick={() => {
                        setReturning(period);
                        setError(undefined);
                      }}
                    >
                      Return to service…
                    </Button>
                  ) : (
                    'View only'
                  ),
              },
            ]}
          />
        )}
      </Card>
    </>
  );
}

export function MarkUnavailablePage() {
  const { equipmentId = '' } = useParams();
  const { result, reload } = useLoad((signal) => getEquipment(equipmentId, signal), [equipmentId]);
  const back = `/support/catalogue/${equipmentId}`;
  return (
    <PageLayout eyebrow="Technical support" title="Mark equipment unavailable" width="narrow">
      {result.state === 'loading' ? (
        <LoadingState label="Loading equipment…" rows={2} />
      ) : result.state === 'error' ? (
        <ErrorState
          failure={result.failure}
          context="this equipment"
          onRetry={reload}
          backTo="/support/catalogue"
          backLabel="Back to catalogue"
        />
      ) : (
        <UnavailabilityForm key={equipmentId} equipment={result.data} back={back} />
      )}
    </PageLayout>
  );
}

function UnavailabilityForm({ equipment, back }: { equipment: Equipment; back: string }) {
  const navigate = useNavigate();
  const session = useSession();
  const periods = equipment.unavailability ?? [];
  const [values, setValues] = useState<Values>({
    from: '',
    to: '',
    quantity: String(equipment.total_quantity),
    reason: '',
  });
  // The quantity follows the units in service until the user types one.
  const [quantityTouched, setQuantityTouched] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
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
  if (session.status === 'loading') return <LoadingState label="Loading equipment…" rows={2} />;
  const refusal =
    session.status !== 'signed-in' || session.user.role !== 'technical_support_staff'
      ? ACCESS_DENIED
      : !equipment.is_active
        ? RETIRED
        : null;
  if (refusal)
    return (
      <>
        <Alert tone="info">{refusal}</Alert>
        <ButtonLink to={back}>Back to equipment</ButtonLink>
      </>
    );

  const datesChosen = Boolean(values.from && values.to && values.to >= values.from);
  const inService = datesChosen ? inServiceFor(equipment.total_quantity, periods, values.from, values.to) : null;
  const limit = inService ?? equipment.total_quantity;

  function update(field: keyof Values, value: string) {
    setValues((current) => {
      const next = { ...current, [field]: value };
      if (field === 'quantity' || quantityTouched) return next;
      const chosen = next.from && next.to && next.to >= next.from;
      return {
        ...next,
        quantity: String(
          chosen ? inServiceFor(equipment.total_quantity, periods, next.from, next.to) : equipment.total_quantity,
        ),
      };
    });
    if (field === 'quantity') setQuantityTouched(true);
    setErrors((current) => ({ ...current, [field]: undefined }));
    setServerError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const found = validate(values, inService);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setServerError('Fix the highlighted fields, then save again.');
      return;
    }
    setSaving(true);
    setServerError(null);
    const result = await markUnavailable(equipment.id, {
      from: values.from,
      to: values.to,
      quantity: Number(values.quantity),
      reason: values.reason.trim(),
    });
    if (!mounted.current) return;
    setSaving(false);
    if (!result.ok) {
      const fromServer: Errors = {};
      for (const [field, messages] of Object.entries(result.fieldErrors ?? {}))
        if (fields.includes(field as keyof Values) && messages[0]) fromServer[field as keyof Values] = messages[0];
      setErrors((current) => ({ ...current, ...fromServer }));
      setServerError(
        result.code === 'validation_failed' ? 'Fix the highlighted fields, then save again.' : result.message,
      );
      return;
    }
    navigate(back, { state: { unavailableSaved: { ...result.data, name: equipment.name } } });
  }

  return (
    <Card title={equipment.name}>
      <form onSubmit={submit} noValidate className="ui-form">
        {serverError ? <Alert tone="error">{serverError}</Alert> : null}
        <FactList
          columns={2}
          items={[
            ['Total stock', equipment.total_quantity],
            ['In service for these dates', inService === null ? 'Choose the dates' : inService],
          ]}
        />
        <FormSection title="Period">
          <FormField label="From" error={errors.from}>
            {(props) => (
              <input
                {...props}
                type="date"
                value={values.from}
                disabled={saving}
                onChange={(change) => update('from', change.target.value)}
              />
            )}
          </FormField>
          <FormField label="To" error={errors.to}>
            {(props) => (
              <input
                {...props}
                type="date"
                min={values.from || today()}
                value={values.to}
                disabled={saving}
                onChange={(change) => update('to', change.target.value)}
              />
            )}
          </FormField>
        </FormSection>
        <FormSection title="Units and reason">
          <FormField
            label="Units to take out"
            hint={`From 1 to ${Math.max(limit, 1)}. Reservations that no longer fit are flagged for review, and their Coordinators are notified.`}
            error={errors.quantity}
            wide
          >
            {(props) => (
              <input
                {...props}
                type="number"
                inputMode="numeric"
                min={1}
                max={Math.max(limit, 1)}
                step={1}
                value={values.quantity}
                disabled={saving}
                onChange={(change) => update('quantity', change.target.value)}
              />
            )}
          </FormField>
          <FormField label="Reason" hint="For example, sensor repair or annual servicing." error={errors.reason} wide>
            {(props) => (
              <textarea
                {...props}
                rows={3}
                maxLength={REASON_MAX}
                value={values.reason}
                disabled={saving}
                onChange={(change) => update('reason', change.target.value)}
              />
            )}
          </FormField>
        </FormSection>
        <FormActions>
          <ButtonLink to={back}>Cancel</ButtonLink>
          <Button type="submit" variant="primary" busy={saving} busyLabel="Saving…">
            Mark unavailable
          </Button>
        </FormActions>
      </form>
    </Card>
  );
}
