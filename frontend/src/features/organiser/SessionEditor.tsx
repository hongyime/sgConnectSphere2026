import { useEffect, useState } from 'react';

type Session = {
  id: string;
  title?: string;
  startAt: string;
  endAt: string;
  expectedAttendance: number;
  venueRequirements?: string;
  equipmentRequirements?: string;
};

type Field = { title: string; startAt: string; endAt: string; expectedAttendance: string };

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
  };
}

function toPayload(field: Field) {
  return {
    title: field.title,
    startAt: new Date(field.startAt).toISOString(),
    endAt: new Date(field.endAt).toISOString(),
    expectedAttendance: Number(field.expectedAttendance),
  };
}

// E04-S02: Sessions are children of a saved draft, so this editor only renders
// once the Event exists. The Event keeps its own overall dates and attendance.
export function SessionEditor({ eventId }: { eventId: string }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [fields, setFields] = useState<Record<string, Field>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [eventStatus, setEventStatus] = useState('draft');
  const [pending, setPending] = useState<{ sessionId: string; revision: string; field: Field; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const url = (sessionId?: string) =>
    `/api/events?sessions=1&id=${encodeURIComponent(eventId)}${sessionId ? `&sessionId=${encodeURIComponent(sessionId)}` : ''}`;

  const load = async () => {
    const response = await fetch(url(), { credentials: 'same-origin' }).catch(() => null);
    if (!response?.ok) {
      setStatus('Sessions could not be loaded.');
      return;
    }
    const body = await response.json() as { sessions: Session[]; eventStatus?: string };
    setSessions(body.sessions);
    setEventStatus(body.eventStatus ?? 'draft');
    setFields(Object.fromEntries(body.sessions.map(session => [session.id, toField(session)])));
  };

  useEffect(() => {
    void load();
  }, [eventId]);

  const mutate = async (method: 'POST' | 'PATCH' | 'DELETE', sessionId?: string, body?: unknown, reviewed?: string) => {
    setBusy(true);
    setStatus(null);
    const response = await fetch(`${url(sessionId)}${reviewed ? `&reviewed=${encodeURIComponent(reviewed)}` : ''}`, {
      method,
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    }).catch(() => null);
    if (!response?.ok) {
      setBusy(false);
      setStatus(method === 'DELETE'
        ? 'That Session could not be removed. An Event keeps at least one Session.'
        : 'The Session could not be saved. Check the dates and expected attendance.');
      return;
    }
    setPending(null);
    await load();
    setBusy(false);
    setStatus(method === 'DELETE' ? 'Session removed.' : 'Session saved.');
  };

  const requestSave = async (sessionId: string, field: Field) => {
    if (eventStatus !== 'planning') {
      await mutate('PATCH', sessionId, toPayload(field));
      return;
    }
    setBusy(true);
    setStatus(null);
    const response = await fetch(`${url(sessionId)}&preview=1`, {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(toPayload(field)),
    }).catch(() => null);
    setBusy(false);
    if (!response?.ok) {
      setStatus('The Session change could not be checked.');
      return;
    }
    const body = await response.json() as {
      preview: { impact: { affected: boolean; bookings: unknown[]; reservations: unknown[] }; revision: string };
    };
    const { impact, revision } = body.preview;
    if (!impact.affected) {
      await mutate('PATCH', sessionId, toPayload(field), revision);
      return;
    }
    setPending({
      sessionId,
      revision,
      field,
      message: `This change flags ${impact.bookings.length} booking(s) and ${impact.reservations.length} reservation(s) for reconfirmation.`,
    });
  };

  return (
    <section className="session-editor" aria-label="Event Sessions">
      <h3>Event Sessions</h3>
      <p className="field-hint">
        One or more Sessions beneath this Event. Each Session keeps its own date, time and expected attendance.
      </p>
      {status ? <p role="status" className="field-hint">{status}</p> : null}
      {pending ? (
        <div role="alert" className="field-hint">
          <p>{pending.message}</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => { const item = pending; void mutate('PATCH', item.sessionId, toPayload(item.field), item.revision); }}
          >
            Save anyway
          </button>
          <button type="button" disabled={busy} onClick={() => setPending(null)}>Cancel</button>
        </div>
      ) : null}
      <ul className="session-list">
        {sessions.map(session => {
          const field = fields[session.id] ?? toField(session);
          return (
            <li key={session.id} className="session-row">
              <label>
                Session title
                <input
                  value={field.title}
                  onChange={event => setFields(current => ({ ...current, [session.id]: { ...field, title: event.target.value } }))}
                />
              </label>
              <label>
                Starts
                <input
                  type="datetime-local"
                  value={field.startAt}
                  onChange={event => setFields(current => ({ ...current, [session.id]: { ...field, startAt: event.target.value } }))}
                />
              </label>
              <label>
                Ends
                <input
                  type="datetime-local"
                  value={field.endAt}
                  onChange={event => setFields(current => ({ ...current, [session.id]: { ...field, endAt: event.target.value } }))}
                />
              </label>
              <label>
                Expected attendance
                <input
                  type="number"
                  min="1"
                  value={field.expectedAttendance}
                  onChange={event => setFields(current => ({ ...current, [session.id]: { ...field, expectedAttendance: event.target.value } }))}
                />
              </label>
              <div className="session-actions">
                <button type="button" disabled={busy} onClick={() => requestSave(session.id, field)}>
                  Save session
                </button>
                <button type="button" disabled={busy} onClick={() => mutate('DELETE', session.id)}>
                  Remove session
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          const first = sessions[0];
          if (!first) return;
          const start = new Date(new Date(first.startAt).getTime() + 24 * 3600_000);
          mutate('POST', undefined, {
            title: 'New Session',
            startAt: start.toISOString(),
            endAt: new Date(start.getTime() + 3600_000).toISOString(),
            expectedAttendance: first.expectedAttendance,
          });
        }}
      >
        Add session
      </button>
    </section>
  );
}
