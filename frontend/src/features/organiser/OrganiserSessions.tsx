import { useState } from 'react';

type Session = {
  id: string;
  title?: string | null;
  startAt: string;
  endAt: string;
  expectedAttendance: number;
};

const DELETABLE = ['approved', 'planning', 'safety_review', 'confirmed'];

export function OrganiserSessions({ eventId, status, sessions, onDeleted }: {
  eventId: string;
  status: string;
  sessions?: Session[];
  onDeleted: (message: string) => void;
}) {
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!sessions?.length) return null;

  async function remove(session: Session) {
    setBusy(true); setError('');
    try {
      const params = new URLSearchParams({ session: '1', id: eventId, session_id: session.id });
      const response = await fetch(`/api/events?${params}`, { method: 'DELETE', credentials: 'same-origin' });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || 'The Session could not be deleted.');
      onDeleted(`${session.title || 'Session'} deleted. ${body.releasedBookings} venue booking${body.releasedBookings === 1 ? '' : 's'} released.`);
      setConfirming(null);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'The Session could not be deleted.');
    } finally { setBusy(false); }
  }

  return <section aria-labelledby="organiser-sessions-heading">
    <h3 id="organiser-sessions-heading">Sessions</h3>
    {error && <p role="alert">{error}</p>}
    <ol>{sessions.map((session, index) => {
      const title = session.title || `Session ${index + 1}`;
      return <li key={session.id}>
        <h4>{title}</h4>
        <p>{new Date(session.startAt).toLocaleString('en-SG', { timeZone: 'Asia/Singapore' })} – {new Date(session.endAt).toLocaleString('en-SG', { timeZone: 'Asia/Singapore' })}</p>
        <p>{session.expectedAttendance} expected attendees</p>
        {DELETABLE.includes(status) && sessions.length > 1 ? confirming === session.id ? (
          <div role="group" aria-label={`Confirm delete ${title}`}>
            <p>The Session’s venue bookings will be released, Venue Staff notified, and the deletion kept in the activity log.</p>
            <button type="button" disabled={busy} onClick={() => { void remove(session); }}>{busy ? 'Deleting…' : 'Confirm delete'}</button>
            <button type="button" disabled={busy} onClick={() => setConfirming(null)}>Keep Session</button>
          </div>
        ) : <button type="button" onClick={() => { setError(''); setConfirming(session.id); }}>Delete {title}</button> : null}
      </li>;
    })}</ol>
  </section>;
}
