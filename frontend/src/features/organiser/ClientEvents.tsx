import { useEffect, useRef, useState } from 'react';

type StatusHistoryEntry = { occurred_at: string; old_value: string | null; new_value: string | null };
type Event = { id: string; event_code: string; title: string; description: string; status: string; status_changed_at: string; starts_at: string; creator_name: string; statusHistory?: StatusHistoryEntry[] };
type Notification = { id: string; title: string; message: string };

function plainStatus(status: string) {
  return status.replaceAll('_', ' ').replace(/\b\w/g, character => character.toUpperCase());
}

function plainDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(value));
}

export function ClientEvents() {
  const activeRequest = useRef<AbortController | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [event, setEvent] = useState<Event>();
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [signIn, setSignIn] = useState(false);
  const [busy, setBusy] = useState(true);
  const [revision, setRevision] = useState(0);
  const pathIdentifier = window.location.pathname.startsWith('/events/') ? window.location.pathname.slice(8) : '';
  let identifier = pathIdentifier;
  try { identifier = decodeURIComponent(pathIdentifier); } catch { /* Invalid identifiers are refused by the API. */ }

  useEffect(() => {
    const controller = new AbortController();
    activeRequest.current = controller;
    setBusy(true); setError(''); setEvents([]); setNotifications([]); setEvent(undefined);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/events?${identifier ? `id=${encodeURIComponent(identifier)}` : `q=${encodeURIComponent(search)}`}`, { signal: controller.signal });
        const data = await response.json().catch(() => { throw new Error('Service unavailable. Please try again.'); });
        if (!response.ok) { setSignIn(response.status === 401); throw new Error(data.error); }
        setSignIn(false); setEvents(data.events || []); setNotifications(data.notifications || []); setEvent(data.event);
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Unable to load events. Please try again.');
      } finally { if (!controller.signal.aborted) setBusy(false); }
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [search, revision, identifier]);

  async function login(form: HTMLFormElement) {
    setBusy(true); setError('');
    const fields = new FormData(form);
    try {
      const response = await fetch('/api/auth/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(fields)) });
      const data = await response.json().catch(() => { throw new Error('Service unavailable. Please try again.'); });
      if (!response.ok) throw new Error(data.error);
      form.reset(); setRevision(value => value + 1);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to sign in.'); }
    finally { setBusy(false); }
  }

  return <main className="client-events">
    <header><a href="/">ConnectSphere</a><h1>My organisation’s events</h1>
      <p>View events created by you and your fellow organisers.</p>
      {!signIn && <button disabled={busy} onClick={async () => {
        activeRequest.current?.abort();
        setEvents([]); setNotifications([]); setEvent(undefined); setBusy(true);
        try {
          const result = await fetch('/api/auth/session', { method: 'DELETE' });
          if (!result.ok) throw new Error('Unable to sign out. Please try again.');
          setSignIn(true); setError('');
        } catch (failure) { setError(failure instanceof Error ? failure.message : 'Unable to sign out.'); }
        finally { setBusy(false); }
      }}>Sign out</button>}
    </header>
    {error && <p role="alert">{error}</p>}
    {signIn ? <form onSubmit={e => { e.preventDefault(); void login(e.currentTarget); }}>
      <h2>Sign in as an Event Organiser</h2>
      <label>Email<input name="email" type="email" autoComplete="username" required /></label>
      <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
      <button disabled={busy}>Sign in</button>
      <p><a href="/forgot-password">Forgot password or locked out?</a></p>
    </form> : <>
      <nav><a href="/events">All organisation events</a></nav>
      {!identifier && <label>Search your organisation’s events<input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Event name or ID" /></label>}
      {busy && <p role="status">Loading events…</p>}
      {!busy && error && <button onClick={() => setRevision(v => v + 1)}>Try again</button>}
      {!busy && !error && !identifier && <>
        <p role="status">{events.length} events shown{events.length === 100 ? ' — refine your search to find more' : ''}</p>
        {events.length === 0 && <p>No events found. Try another name or event ID.</p>}
        <div className="client-event-grid">{events.map(item => <article key={item.id}>
          <p>{item.event_code} · {item.status.replaceAll('_', ' ')}</p>
          <h2><a href={`/events/${encodeURIComponent(item.event_code || item.id)}`}>{item.title}</a></h2>
          <p>{new Date(item.starts_at).toLocaleString()}</p><p>Created by {item.creator_name}</p>
        </article>)}</div>
        <section aria-label="Notifications"><h2>Your event notifications</h2>
          {notifications.length === 0 ? <p>No event notifications.</p> : notifications.map(n => <article key={n.id}><h3>{n.title}</h3><p>{n.message}</p></article>)}
        </section>
      </>}
      {!busy && !error && event && <article><h2>{event.title}</h2><p>{event.event_code} · {plainStatus(event.status)}</p><p>{event.description}</p><p>{new Date(event.starts_at).toLocaleString()}</p><p>Created by {event.creator_name}</p>
        <section aria-labelledby="event-status-heading"><h3 id="event-status-heading">Current status</h3><p><strong>{plainStatus(event.status)}</strong></p><p>Reached on {plainDate(event.status_changed_at)}</p></section>
        <section aria-labelledby="status-history-heading"><h3 id="status-history-heading">Status history</h3>
          {event.statusHistory?.length ? <ol>{event.statusHistory.map((entry, index) => <li key={`${entry.occurred_at}-${index}`}>{entry.old_value ? `${plainStatus(entry.old_value)} → ` : ''}{plainStatus(entry.new_value ?? '')} — {plainDate(entry.occurred_at)}</li>)}</ol> : <p>No status changes recorded yet.</p>}
        </section>
      </article>}
    </>}
  </main>;
}
