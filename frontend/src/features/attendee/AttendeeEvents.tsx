import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

type PublishedEvent = { id: string; name: string; starts_at: string; ends_at: string; venue_name: string; venue_location: string };
export function AttendeeEvents() {
  const [events, setEvents] = useState<PublishedEvent[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [revision, setRevision] = useState(0);
  const active = useRef<AbortController | null>(null);
  // Read the router's location, not window.location, so moving between event
  // URLs re-renders this screen and loads the new event.
  const { pathname } = useLocation();
  const internal = pathname.startsWith('/internal/');
  const raw = internal ? pathname.slice('/internal/planning/'.length) : pathname.slice('/attendee/events/'.length);
  let identifier = raw;
  try { identifier = decodeURIComponent(raw); } catch { /* Invalid IDs are refused by the server. */ }
  useEffect(() => {
    const controller = new AbortController(); active.current = controller;
    setEvents([]); setError(''); setBusy(true);
    void (async () => {
      try {
        const response = await fetch(`${internal ? '/api/internal/planning' : '/api/attendee/events'}?id=${encodeURIComponent(identifier)}`, { signal: controller.signal });
        const data = await response.json().catch(() => { throw new Error('Unable to load events. Please try again.'); });
        if (!response.ok) { setSignedOut(response.status === 401); throw new Error(data.error); }
        setEvents(data.events); setSignedOut(false);
      } catch (failure) { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Unable to load events.'); }
      finally { if (!controller.signal.aborted) setBusy(false); }
    })();
    return () => controller.abort();
  }, [identifier, internal, revision]);

  async function signIn(form: HTMLFormElement) {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/auth/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      form.reset(); setRevision(v => v + 1);
    } catch { setError('Unable to sign in. Check your credentials or contact your administrator.'); }
    finally { setBusy(false); }
  }
  return <main className="client-events">
    <header><a href="/attendee/events">ConnectSphere · My registered events</a><h1>{internal ? 'Internal planning' : 'My registered events'}</h1>
      <p>Published event details for your registrations.</p>
      {!signedOut && <button disabled={busy} onClick={async () => {
        active.current?.abort(); setEvents([]); setBusy(true);
        try {
          const response = await fetch('/api/auth/session', { method: 'DELETE' });
          if (!response.ok) throw new Error();
          setSignedOut(true); setError('');
        } catch { setError('Unable to sign out. Please try again.'); }
        finally { setBusy(false); }
      }}>Sign out</button>}
    </header>
    {busy && <p role="status">Loading…</p>}
    {error && <p role="alert">{error}</p>}
    {signedOut ? <form onSubmit={e => { e.preventDefault(); void signIn(e.currentTarget); }}>
      <h2>Attendee sign in</h2>
      <label>Email<input name="email" type="email" autoComplete="username" required /></label>
      <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
      <button disabled={busy}>Sign in</button>
    </form> : <>
      {(internal || identifier) && <p><a href="/attendee/events">Back to my registered events</a></p>}
      {!busy && !error && events.length === 0 && <p>No published events for your registrations yet.</p>}
      {!busy && error && <button onClick={() => setRevision(v => v + 1)}>Try again</button>}
      <div className="client-event-grid">{events.map(event => <article key={event.id}>
        <h2><a href={`/attendee/events/${event.id}`}>{event.name}</a></h2>
        <p><strong>Starts:</strong> <time dateTime={event.starts_at}>{new Date(event.starts_at).toLocaleString()}</time></p>
        <p><strong>Ends:</strong> <time dateTime={event.ends_at}>{new Date(event.ends_at).toLocaleString()}</time></p>
        <p><strong>Venue:</strong> {event.venue_name}</p><p>{event.venue_location}</p>
      </article>)}</div>
    </>}
  </main>;
}
