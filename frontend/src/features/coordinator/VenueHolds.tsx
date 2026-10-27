// E06-S05 (SCRUM-49, frontend SCRUM-143): the assigned Coordinator's
// tentative holds.
//   - VenueHoldsCard sits on the event page (/coordinator/events/:eventCode):
//     each hold with its expiry, and Submit booking request / Release.
//   - HoldVenueForm is /coordinator/events/:eventCode/venues/:venueId/hold,
//     reached from the event's venue search.
// Data comes from features/venue/holdsApi.ts; the server decides what may be
// held (canHold) and refuses clashes, naming what is in the way.
import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Bookmark, CalendarClock, Send, Undo2 } from 'lucide-react';
import {
  Alert, Button, ButtonLink, Card, ErrorState, FactList, FormActions, FormField, FormSection, LoadingState,
  PageLayout, StatusPill, formatDate, formatDateRange, useLoad,
} from '../../shared';
import { toLocalInput } from '../events/EventEditForm';
import { getVenue } from '../venue/venueApi';
import {
  DEFAULT_HOLD_HOURS, HOLD_MESSAGES, convertHold, expiryProblem, getEventHolds, placeHold, releaseHold,
  type Hold,
} from '../venue/holdsApi';
import { eventRef, getAssignedEvent } from './coordinatorApi';
import './coordinator.css';

// Holds are placed while approved or planning; afterwards the card still shows them.
export const HOLDS_VISIBLE = ['approved', 'planning', 'safety_review', 'confirmed'];
const HOLDABLE = ['approved', 'planning'];

const eventPath = (eventCode: string) => `/coordinator/events/${encodeURIComponent(eventCode)}`;

// Passed back to the event page after a hold is placed.
type HoldPlaced = { holdPlaced?: { venueName: string; expiresAt: string } };
type Flash = { tone: 'success' | 'error'; text: string } | null;

function HoldRow({ hold, onChanged }: { hold: Hold; onChanged: (flash: Flash) => void }) {
  const [busy, setBusy] = useState<'convert' | 'release' | null>(null);
  const [confirming, setConfirming] = useState(false);
  const live = hold.status === 'tentative';

  async function act(kind: 'convert' | 'release') {
    setBusy(kind);
    const outcome = kind === 'convert' ? await convertHold(hold.id) : await releaseHold(hold.id);
    setBusy(null);
    setConfirming(false);
    const done = kind === 'convert'
      ? `Booking request submitted for ${hold.venueName}. The hold no longer expires.`
      : `Hold on ${hold.venueName} released. The period is free again.`;
    onChanged(outcome.ok ? { tone: 'success', text: done } : { tone: 'error', text: outcome.message });
  }

  return (
    <li className="venue-hold">
      <div>
        <p className="venue-hold-name">{hold.venueName}</p>
        <small>{formatDateRange(hold.startsAt, hold.endsAt)}</small>
      </div>
      {live
        ? <StatusPill status="warning" label={`Tentative · expires ${formatDate(hold.expiresAt, true)}`} />
        : <StatusPill status="neutral" label={`Expired ${formatDate(hold.expiresAt, true)}`} />}
      {live ? (
        <div className="venue-hold-actions">
          {confirming ? (
            <>
              <span className="coordinator-subtle">Release this hold?</span>
              <Button onClick={() => act('release')} busy={busy === 'release'} busyLabel="Releasing…">Release hold</Button>
              <Button onClick={() => setConfirming(false)} disabled={busy !== null}>Keep</Button>
            </>
          ) : (
            <>
              <Button variant="primary" onClick={() => act('convert')} busy={busy === 'convert'} busyLabel="Submitting…"
                disabled={busy !== null} icon={<Send size={14} aria-hidden="true" />}>Submit booking request</Button>
              <Button onClick={() => setConfirming(true)} disabled={busy !== null} icon={<Undo2 size={14} aria-hidden="true" />}>Release</Button>
            </>
          )}
        </div>
      ) : (
        <p className="coordinator-subtle venue-hold-note">This hold no longer holds the venue. Place a new hold if it's still needed.</p>
      )}
    </li>
  );
}

export function VenueHoldsCard({ eventCode }: { eventCode: string }) {
  const { result, reload } = useLoad(signal => getEventHolds(eventCode, signal), [eventCode]);
  const placed = (useLocation().state as HoldPlaced | null)?.holdPlaced;
  const [flash, setFlash] = useState<Flash>(null);
  const overview = result.state === 'ready' ? result.data : null;

  function changed(next: Flash) {
    setFlash(next);
    if (next?.tone === 'success') reload();
  }

  return (
    <Card
      title="Venue holds"
      actions={overview?.canHold ? (
        <ButtonLink to={`${eventPath(eventCode)}/venues`} icon={<Bookmark size={14} aria-hidden="true" />}>Find a venue to hold</ButtonLink>
      ) : undefined}
    >
      <div aria-live="polite" className="coordinator-live">
        {placed && !flash ? (
          <Alert tone="success" title="Venue held">
            {placed.venueName} is held tentatively until {formatDate(placed.expiresAt, true)}. Submit a booking request before then to keep it.
          </Alert>
        ) : null}
        {flash ? <Alert tone={flash.tone}>{flash.text}</Alert> : null}
      </div>
      {result.state === 'loading' ? <p role="status" className="coordinator-subtle">Loading venue holds…</p> : null}
      {result.state === 'error' ? (
        <Alert tone="error" action={<Button onClick={reload}>Try again</Button>}>{result.failure.message}</Alert>
      ) : null}
      {overview ? (
        <>
          {overview.holds.length > 0 ? (
            <ul className="venue-holds" aria-label="Venue holds">
              {overview.holds.map(hold => <HoldRow key={hold.id} hold={hold} onChanged={changed} />)}
            </ul>
          ) : (
            <p className="coordinator-subtle">No venue is held for this event. A hold keeps a venue for {DEFAULT_HOLD_HOURS} hours while you finalise the arrangements.</p>
          )}
          {!overview.canHold ? <p className="coordinator-subtle">{HOLD_MESSAGES.notHoldable}</p> : null}
        </>
      ) : null}
    </Card>
  );
}

type Draft = { startsAt: string; endsAt: string; customExpiry: boolean; expiresAt: string };
type Errors = Partial<Record<'startsAt' | 'endsAt' | 'expiresAt', string>>;

export function validateHold(draft: Draft, event: { startsAt: string; endsAt: string }, now = new Date()): Errors {
  const errors: Errors = {};
  const start = draft.startsAt ? new Date(draft.startsAt) : null;
  const end = draft.endsAt ? new Date(draft.endsAt) : null;
  const startOk = start !== null && !Number.isNaN(start.getTime());
  if (!startOk) errors.startsAt = HOLD_MESSAGES.startsAt;
  if (!end || Number.isNaN(end.getTime())) errors.endsAt = HOLD_MESSAGES.endsAt;
  else if (startOk && end <= start) errors.endsAt = HOLD_MESSAGES.endBeforeStart;
  else if (startOk && (start < new Date(event.startsAt) || end > new Date(event.endsAt))) {
    errors.endsAt = `The hold must fall within the event, ${formatDateRange(event.startsAt, event.endsAt)}.`;
  }
  if (draft.customExpiry) {
    const problem = expiryProblem(draft.expiresAt ? new Date(draft.expiresAt) : null, now);
    if (problem) errors.expiresAt = problem;
  }
  return errors;
}

const zoneHint = `Times are in ${Intl.DateTimeFormat().resolvedOptions().timeZone}.`;

export function HoldVenueForm() {
  const { eventCode = '', venueId = '' } = useParams();
  const navigate = useNavigate();
  const { result, reload } = useLoad(async signal => {
    const [event, venue] = await Promise.all([getAssignedEvent(eventCode, signal), getVenue(venueId, signal)]);
    if (!event.ok) return event;
    if (!venue.ok) return venue;
    return { ok: true as const, data: { event: event.data, venue: venue.data } };
  }, [eventCode, venueId]);
  const loaded = result.state === 'ready' ? result.data : null;
  const backTo = `${eventPath(eventCode)}/venues`;

  return (
    <PageLayout width="narrow" eyebrow={loaded?.event.event_code ?? eventCode} title="Hold a venue tentatively">
      {result.state === 'loading' ? <LoadingState label="Loading event and venue…" rows={3} /> : null}
      {result.state === 'error' ? (
        <ErrorState failure={result.failure} onRetry={reload} context="this hold" backTo={backTo} backLabel="Back to venue search" />
      ) : null}
      {loaded ? (
        HOLDABLE.includes(loaded.event.status) ? (
          <HoldForm
            key={`${loaded.event.id}:${loaded.venue.id}`}
            event={{ code: eventRef(loaded.event), title: loaded.event.title, startsAt: loaded.event.starts_at, endsAt: loaded.event.ends_at }}
            venue={{ id: loaded.venue.id, name: loaded.venue.name }}
            backTo={backTo}
            onPlaced={(venueName, expiresAt) => navigate(eventPath(eventRef(loaded.event)), { state: { holdPlaced: { venueName, expiresAt } } satisfies HoldPlaced })}
          />
        ) : (
          <>
            <Alert tone="info">{HOLD_MESSAGES.notHoldable}</Alert>
            <FormActions><ButtonLink to={eventPath(eventRef(loaded.event))}>Back to event</ButtonLink></FormActions>
          </>
        )
      ) : null}
    </PageLayout>
  );
}

function HoldForm({ event, venue, backTo, onPlaced }: {
  event: { code: string; title: string; startsAt: string; endsAt: string };
  venue: { id: string; name: string };
  backTo: string;
  onPlaced: (venueName: string, expiresAt: string) => void;
}) {
  const [draft, setDraft] = useState<Draft>({
    startsAt: toLocalInput(event.startsAt), endsAt: toLocalInput(event.endsAt), customExpiry: false, expiresAt: '',
  });
  const [errors, setErrors] = useState<Errors>({});
  const [refusal, setRefusal] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const set = (field: 'startsAt' | 'endsAt' | 'expiresAt') => (value: string) => setDraft(current => ({ ...current, [field]: value }));

  async function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setRefusal(null);
    const found = validateHold(draft, event);
    setErrors(found);
    if (Object.keys(found).length) return;
    setSending(true);
    const outcome = await placeHold(event.code, venue.id, {
      startsAt: new Date(draft.startsAt).toISOString(),
      endsAt: new Date(draft.endsAt).toISOString(),
      ...(draft.customExpiry ? { expiresAt: new Date(draft.expiresAt).toISOString() } : {}),
    });
    setSending(false);
    if (outcome.ok) { onPlaced(outcome.data.hold.venueName, outcome.data.hold.expiresAt); return; }
    const fields = outcome.fieldErrors ?? {};
    setErrors({ startsAt: fields.starts_at?.[0], endsAt: fields.ends_at?.[0], expiresAt: fields.expires_at?.[0] });
    if (!outcome.fieldErrors) setRefusal(outcome.message);
  }

  const invalid = Object.values(errors).some(Boolean);
  return (
    <form onSubmit={submit} noValidate className="hold-form">
      <p className="coordinator-subtle">
        Hold {venue.name} for {event.title} while you finalise the arrangements. Nobody else can hold or request it for this period until the hold expires or you release it.
      </p>
      {invalid ? <Alert tone="error">Check the highlighted fields and try again.</Alert> : null}
      {refusal ? <Alert tone="error" title="This venue can't be held">{refusal}</Alert> : null}
      <Card label="Hold details">
        <FactList items={[['Venue', venue.name], ['Event', formatDateRange(event.startsAt, event.endsAt)]]} />
        <FormSection title="Period">
          <FormField label="Hold starts" hint={zoneHint} error={errors.startsAt}>
            {props => <input {...props} type="datetime-local" value={draft.startsAt} onChange={change => set('startsAt')(change.target.value)} />}
          </FormField>
          <FormField label="Hold ends" hint={zoneHint} error={errors.endsAt}>
            {props => <input {...props} type="datetime-local" value={draft.endsAt} onChange={change => set('endsAt')(change.target.value)} />}
          </FormField>
        </FormSection>
        <FormSection title="Expiry">
          <FormField label="Hold expires after">
            {props => (
              <select {...props} value={draft.customExpiry ? 'custom' : 'default'}
                onChange={change => setDraft(current => ({ ...current, customExpiry: change.target.value === 'custom' }))}>
                <option value="default">{DEFAULT_HOLD_HOURS} hours from now (default)</option>
                <option value="custom">Choose a date and time</option>
              </select>
            )}
          </FormField>
          {draft.customExpiry ? (
            <FormField label="Hold expires" hint={`Between 1 hour and 14 days from now. ${zoneHint}`} error={errors.expiresAt}>
              {props => <input {...props} type="datetime-local" value={draft.expiresAt} onChange={change => set('expiresAt')(change.target.value)} />}
            </FormField>
          ) : null}
        </FormSection>
      </Card>
      <FormActions>
        <ButtonLink to={backTo}>Cancel</ButtonLink>
        <Button type="submit" variant="primary" busy={sending} busyLabel="Holding…" icon={<CalendarClock size={14} aria-hidden="true" />}>Hold venue</Button>
      </FormActions>
    </form>
  );
}
