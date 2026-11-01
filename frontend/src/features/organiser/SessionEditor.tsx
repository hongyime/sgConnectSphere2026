import { useEffect, useRef, useState } from 'react';
import { Alert, Button, ConfirmPanel, FormActions, FormField, LoadingState, apiCall, jsonRequest } from '../../shared';

type Option = { id: string; label: string };
type Options = { layouts: Option[]; accessibility: Option[]; facilities: Option[] };

type Session = {
  id: string;
  title?: string;
  startAt: string;
  endAt: string;
  expectedAttendance: number;
  layoutId?: string;
  venueRequirements?: string;
  accessibilityNote?: string;
  equipmentRequirements?: string;
  layoutPreference?: string;
  accessibilityFeatureIds?: string[];
  facilityIds?: string[];
};

type Field = {
  title: string; startAt: string; endAt: string; expectedAttendance: string;
  layoutId: string; venueRequirements: string; equipmentRequirements: string;
  accessibilityFeatureIds: string[]; facilityIds: string[];
  // Not edited here, but sent back so a save never clears them.
  accessibilityNote: string; layoutPreference: string;
};

type Removal = { releasedBookings?: number; releasedReservations?: number; notifiedStaff?: number };

const NO_OPTIONS: Options = { layouts: [], accessibility: [], facilities: [] };

function toLocalInput(iso: string) {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toField(session: Session): Field {
  return {
    title: session.title ?? '',
    startAt: toLocalInput(session.startAt),
    endAt: toLocalInput(session.endAt),
    expectedAttendance: String(session.expectedAttendance),
    layoutId: session.layoutId ?? '',
    venueRequirements: session.venueRequirements ?? '',
    equipmentRequirements: session.equipmentRequirements ?? '',
    accessibilityFeatureIds: session.accessibilityFeatureIds ?? [],
    facilityIds: session.facilityIds ?? [],
    accessibilityNote: session.accessibilityNote ?? '',
    layoutPreference: session.layoutPreference ?? '',
  };
}

// With one Session, the Event's own requirements describe it (and venue search
// reads them), so its accessibility and facility lists are left untouched.
function toPayload(field: Field, perSession: boolean) {
  return {
    title: field.title,
    startAt: new Date(field.startAt).toISOString(),
    endAt: new Date(field.endAt).toISOString(),
    expectedAttendance: Number(field.expectedAttendance),
    layoutId: field.layoutId || null,
    venueRequirements: field.venueRequirements,
    equipmentRequirements: field.equipmentRequirements,
    accessibilityNote: field.accessibilityNote,
    layoutPreference: field.layoutPreference,
    ...(perSession ? { accessibilityFeatureIds: field.accessibilityFeatureIds, facilityIds: field.facilityIds } : {}),
  };
}

function removalMessage(result: Removal) {
  const bookings = result.releasedBookings ?? 0;
  const reservations = result.releasedReservations ?? 0;
  if (!bookings && !reservations) return 'Session removed.';
  const released = [
    bookings ? `${bookings} venue booking${bookings === 1 ? '' : 's'}` : '',
    reservations ? `${reservations} equipment reservation${reservations === 1 ? '' : 's'}` : '',
  ].filter(Boolean).join(' and ');
  const told = result.notifiedStaff ? ' The venue’s staff have been notified.' : '';
  return `Session removed. ${released} released.${told}`;
}

function NeedsChecklist({ legend, options, selected, disabled, onChange }: {
  legend: string; options: Option[]; selected: string[]; disabled: boolean; onChange: (ids: string[]) => void;
}) {
  return (
    <fieldset className="session-needs">
      <legend>{legend}</legend>
      {options.length ? (
        <div className="field-checkbox-group">
          {options.map(option => (
            <label key={option.id} className="field-checkbox">
              <input
                type="checkbox"
                disabled={disabled}
                checked={selected.includes(option.id)}
                onChange={event => onChange(event.target.checked ? [...selected, option.id] : selected.filter(id => id !== option.id))}
              />
              {option.label}
            </label>
          ))}
        </div>
      ) : <p className="field-hint">None recorded yet.</p>}
    </fieldset>
  );
}

// E04-S02: Sessions are children of a saved Event. A draft can add, edit and
// remove them; in planning an edit runs the arrangement-impact check and a
// removal releases that Session's bookings, so it is confirmed first.
export function SessionEditor({ eventId }: { eventId: string }) {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [options, setOptions] = useState<Options>(NO_OPTIONS);
  const [fields, setFields] = useState<Record<string, Field>>({});
  const [status, setStatus] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [eventStatus, setEventStatus] = useState('draft');
  const [pending, setPending] = useState<{ sessionId: string; revision: string; field: Field; message: string } | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const loadRequest = useRef(0);

  const url = (sessionId?: string) =>
    `/api/events?sessions=1&id=${encodeURIComponent(eventId)}${sessionId ? `&sessionId=${encodeURIComponent(sessionId)}` : ''}`;

  const load = async () => {
    const request = ++loadRequest.current;
    const response = await fetch(url(), { credentials: 'same-origin' }).catch(() => null);
    // A late answer for an earlier Event, or an earlier load, never overwrites the current one.
    if (request !== loadRequest.current) return;
    if (!response?.ok) {
      setLoadFailed(true);
      return;
    }
    const body = await response.json().catch(() => ({})) as { sessions?: Session[]; eventStatus?: string; options?: Partial<Options> };
    if (request !== loadRequest.current) return;
    const loaded = body.sessions ?? [];
    setLoadFailed(false);
    setSessions(loaded);
    setEventStatus(body.eventStatus ?? 'draft');
    setOptions({ ...NO_OPTIONS, ...body.options });
    setFields(Object.fromEntries(loaded.map(session => [session.id, toField(session)])));
  };

  useEffect(() => {
    setSessions(null);
    void load();
    return () => { loadRequest.current += 1; };
  }, [eventId]);

  const editable = eventStatus === 'draft' || eventStatus === 'planning';
  const perSession = (sessions?.length ?? 0) > 1;

  const mutate = async (method: 'POST' | 'PATCH' | 'DELETE', sessionId?: string, body?: unknown, reviewed?: string) => {
    setBusy(true);
    setStatus(null);
    const result = await apiCall<Removal>(
      `${url(sessionId)}${reviewed ? `&reviewed=${encodeURIComponent(reviewed)}` : ''}`,
      jsonRequest(method, body),
      method === 'DELETE' ? 'That Session could not be removed.' : 'The Session could not be saved. Check the dates and expected attendance.',
    );
    if (!result.ok) {
      setBusy(false);
      setStatus({ tone: 'error', message: method === 'DELETE' && result.status === 409 && /at least one Session/.test(result.message)
        ? 'That Session could not be removed. An Event keeps at least one Session.'
        : result.message });
      return;
    }
    setPending(null);
    setRemoving(null);
    await load();
    setBusy(false);
    setStatus({ tone: 'success', message: method === 'DELETE' ? removalMessage(result.data) : method === 'POST' ? 'Session added.' : 'Session saved.' });
  };

  const requestSave = async (sessionId: string, field: Field) => {
    if (eventStatus !== 'planning') {
      await mutate('PATCH', sessionId, toPayload(field, perSession));
      return;
    }
    setBusy(true);
    setStatus(null);
    const result = await apiCall<{
      preview: { impact: { affected: boolean; bookings: unknown[]; reservations: unknown[] }; revision: string };
    }>(`${url(sessionId)}&preview=1`, jsonRequest('PATCH', toPayload(field, perSession)), 'The Session change could not be checked.');
    setBusy(false);
    if (!result.ok) {
      setStatus({ tone: 'error', message: result.message });
      return;
    }
    const { impact, revision } = result.data.preview;
    if (!impact.affected) {
      await mutate('PATCH', sessionId, toPayload(field, perSession), revision);
      return;
    }
    setPending({
      sessionId,
      revision,
      field,
      message: `This change flags ${impact.bookings.length} booking(s) and ${impact.reservations.length} reservation(s) for reconfirmation.`,
    });
  };

  const addSession = () => {
    const first = sessions?.[0];
    if (!first) return;
    const start = new Date(new Date(first.startAt).getTime() + 24 * 3600_000);
    const copied = toField(first);
    // A new Session starts with the first Session's requirements, ready to change.
    void mutate('POST', undefined, {
      ...toPayload({ ...copied, title: 'New Session' }, true),
      startAt: start.toISOString(),
      endAt: new Date(start.getTime() + 3600_000).toISOString(),
    });
  };

  const update = (sessionId: string, field: Field, change: Partial<Field>) =>
    setFields(current => ({ ...current, [sessionId]: { ...field, ...change } }));

  return (
    <section className="session-editor" aria-label="Event Sessions">
      <h3>Event Sessions</h3>
      <p className="field-hint">
        {perSession
          ? 'Each Session keeps its own date, time, attendance and requirements. Venues are checked against each Session separately.'
          : 'One Session beneath this Event. It uses the event’s own requirements. Add a Session to plan a second day or part separately.'}
      </p>
      {sessions === null && !loadFailed ? <LoadingState label="Loading Sessions…" /> : null}
      {loadFailed ? (
        <Alert tone="error" action={<Button onClick={() => { setLoadFailed(false); void load(); }}>Try again</Button>}>
          Sessions could not be loaded.
        </Alert>
      ) : null}
      {status ? <Alert tone={status.tone}>{status.message}</Alert> : null}
      {pending ? (
        <ConfirmPanel
          title="Save this Session change?"
          description={pending.message}
          confirmLabel="Save anyway"
          busyLabel="Saving…"
          busy={busy}
          onCancel={() => setPending(null)}
          onConfirm={() => { const item = pending; void mutate('PATCH', item.sessionId, toPayload(item.field, perSession), item.revision); }}
        />
      ) : null}
      {sessions ? (
        <ul className="session-list">
          {sessions.map((session, index) => {
            const field = fields[session.id] ?? toField(session);
            const name = field.title || `Session ${index + 1}`;
            const readOnly = busy || !editable;
            return (
              <li key={session.id} className="session-row" aria-label={name}>
                <div className="session-grid">
                  <FormField label="Session title">
                    {props => <input {...props} value={field.title} disabled={readOnly} onChange={event => update(session.id, field, { title: event.target.value })} />}
                  </FormField>
                  <FormField label="Starts">
                    {props => <input {...props} type="datetime-local" value={field.startAt} disabled={readOnly} onChange={event => update(session.id, field, { startAt: event.target.value })} />}
                  </FormField>
                  <FormField label="Ends">
                    {props => <input {...props} type="datetime-local" value={field.endAt} disabled={readOnly} onChange={event => update(session.id, field, { endAt: event.target.value })} />}
                  </FormField>
                  <FormField label="Expected attendance">
                    {props => <input {...props} type="number" min="1" value={field.expectedAttendance} disabled={readOnly} onChange={event => update(session.id, field, { expectedAttendance: event.target.value })} />}
                  </FormField>
                </div>
                {perSession ? (
                  <div className="session-requirements">
                    <div className="session-grid">
                      <FormField label="Venue requirements" hint="For example: Hall A, stage, breakout rooms.">
                        {props => <textarea {...props} rows={2} value={field.venueRequirements} disabled={readOnly} onChange={event => update(session.id, field, { venueRequirements: event.target.value })} />}
                      </FormField>
                      <FormField label="Equipment requirements" hint="For example: projector, two wireless microphones.">
                        {props => <textarea {...props} rows={2} value={field.equipmentRequirements} disabled={readOnly} onChange={event => update(session.id, field, { equipmentRequirements: event.target.value })} />}
                      </FormField>
                      <FormField label="Room layout">
                        {props => (
                          <select {...props} value={field.layoutId} disabled={readOnly} onChange={event => update(session.id, field, { layoutId: event.target.value })}>
                            <option value="">No layout preference</option>
                            {options.layouts.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
                          </select>
                        )}
                      </FormField>
                    </div>
                    <NeedsChecklist legend="Accessibility needs" options={options.accessibility} selected={field.accessibilityFeatureIds}
                      disabled={readOnly} onChange={ids => update(session.id, field, { accessibilityFeatureIds: ids })} />
                    <NeedsChecklist legend="Required facilities" options={options.facilities} selected={field.facilityIds}
                      disabled={readOnly} onChange={ids => update(session.id, field, { facilityIds: ids })} />
                  </div>
                ) : null}
                {editable ? (
                  <FormActions>
                    <Button disabled={busy} onClick={() => requestSave(session.id, field)}>Save session</Button>
                    <Button
                      disabled={busy || sessions.length < 2}
                      title={sessions.length < 2 ? 'An Event keeps at least one Session.' : undefined}
                      onClick={() => {
                        setStatus(null);
                        // A draft has no bookings yet; in planning the release is confirmed first.
                        if (eventStatus === 'planning') setRemoving(session.id);
                        else void mutate('DELETE', session.id);
                      }}
                    >
                      Remove session
                    </Button>
                  </FormActions>
                ) : null}
                {removing === session.id ? (
                  <ConfirmPanel
                    title={`Remove ${name}?`}
                    description="Its venue bookings and equipment reservations are released, the venue’s staff are told, and the removal is recorded in the activity log. The other Sessions keep their bookings."
                    confirmLabel="Remove session"
                    busyLabel="Removing…"
                    danger
                    busy={busy}
                    onCancel={() => setRemoving(null)}
                    onConfirm={() => void mutate('DELETE', session.id)}
                  />
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
      {eventStatus === 'draft' && sessions?.length ? (
        <FormActions>
          <Button disabled={busy} onClick={addSession}>Add session</Button>
        </FormActions>
      ) : null}
    </section>
  );
}
