import './attendance.css';
// E09-S06 / SCRUM-68: live Event attendance, separate from registered places.
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Alert, Button, ButtonLink, Card, ErrorState, FactList, LoadingState, PageLayout,
  StatusPill, apiCall, jsonRequest, useLoad } from '../../shared';

type Attendance = { eventCode: string | null; title: string; status: string; canRecord: boolean;
  registeredCount: number; attendedCount: number;
  attendees: { registrationId: string; name: string; email: string; attended: boolean }[] };

export function EventAttendance() {
  const { eventCode = '' } = useParams();
  const url = `/api/events?attendance=1&id=${encodeURIComponent(eventCode)}`;
  const { result, reload } = useLoad(async signal => {
    const response = await apiCall<{ attendance: Attendance }>(url, { signal }, 'Unable to load attendance.');
    return response.ok ? { ok: true as const, data: response.data.attendance } : response;
  }, [eventCode]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const active = useRef(eventCode);
  active.current = eventCode;
  useEffect(() => { setBusy(false); setMessage(''); setError(''); }, [eventCode]);
  // Abort on navigation/unmount: late writes must not update a different event's screen.
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => { pending.current?.abort(); }, [eventCode]);
  async function save(registrationId: string, attended: boolean) {
    const code = eventCode;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true); setMessage(''); setError('');
    try {
      const response = await apiCall(url, jsonRequest('POST', { registrationId, attended }, controller.signal), 'Unable to save attendance.');
      if (controller.signal.aborted || active.current !== code) return;
      if (!response.ok) { setError(response.message); return; }
      setMessage('Attendance saved. Registration numbers are unchanged.');
      reload();
    } catch {
      if (!controller.signal.aborted && active.current === code) setError('Unable to save attendance. Please try again.');
    } finally {
      if (!controller.signal.aborted && active.current === code) setBusy(false);
    }
  }
  const event = result.state === 'ready' ? result.data : null;
  return <PageLayout eyebrow={event?.eventCode || 'Coordinator'} title={event ? `Attendance: ${event.title}` : 'Record attendance'}
    actions={event ? <StatusPill status={event.status} /> : undefined}>
    {result.state === 'loading' ? <LoadingState label="Loading attendance…" /> : null}
    {result.state === 'error' ? <ErrorState failure={result.failure} onRetry={reload} context="attendance" backTo="/coordinator" backLabel="Back to dashboard" /> : null}
    {message ? <Alert tone="success">{message}</Alert> : null}
    {error ? <Alert tone="error">{error}</Alert> : null}
    {event ? <>
      <Card title="Registration and attendance">
        <FactList columns={2} items={[["Registered", event.registeredCount], ["Attended", event.attendedCount]]} />
        <p>Attendance records do not change registered places. Pending, waitlisted, withdrawn and rejected registrations are excluded.</p>
        {!event.canRecord ? <Alert tone="info">Attendance can only be recorded after the event is Completed.</Alert> : null}
      </Card>
      <Card title="Registered Attendees">
        {event.attendees.length ? <ul className="attendance-list">{event.attendees.map(person => <li key={person.registrationId}>
          <div><strong>{person.name}</strong><p>{person.email}</p><p>{person.attended ? 'Attended' : 'Registered but not attended'}</p></div>
          <Button disabled={!event.canRecord || busy} onClick={() => void save(person.registrationId, !person.attended)}
            aria-label={`${person.attended ? 'Mark not attended' : 'Mark attended'}: ${person.name}`}>
            {person.attended ? 'Mark not attended' : 'Mark attended'}
          </Button>
        </li>)}</ul> : <p>No registered Attendees for this event.</p>}
      </Card>
      <Button disabled={busy} onClick={reload}>Refresh attendance</Button>
      <ButtonLink to={`/coordinator/events/${encodeURIComponent(eventCode)}`}>Back to event</ButtonLink>
    </> : null}
  </PageLayout>;
}
