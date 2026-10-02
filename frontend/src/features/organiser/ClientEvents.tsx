import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { PencilLine } from 'lucide-react';
import { EventEditForm } from '../events/EventEditForm';
import type { EditableField } from '../events/eventEditApi';
import { fieldList } from '../events/eventEditFields';

type StatusHistoryEntry = { occurred_at: string; old_value: string | null; new_value: string | null };
type ActivityEntry = { occurred_at: string; action: string; field_changed: string | null; old_value: string | null; new_value: string | null; actor_name: string | null; actor_email: string | null };
type Comment = { id: string; body: string; created_at: string; author_name: string; author_email: string };
type Event = { id: string; event_code: string; title: string; description: string; purpose?: string | null; status: string; status_changed_at: string; starts_at: string; ends_at?: string; expected_attendance?: number; venue_requirements?: string | null; accessibility_note?: string | null; equipment_requirements?: string | null; layout_preference?: string | null; registration_setup?: string | null; registration_opens_at?: string | null; registration_closes_at?: string | null; creator_name: string; coordinator_name?: string | null; statusHistory?: StatusHistoryEntry[]; activityLog?: ActivityEntry[]; comments?: Comment[]; canPostComment?: boolean; canEdit?: boolean; editableFields?: string[] };
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
  const [comment, setComment] = useState('');
  const [commentError, setCommentError] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  // Read the router's location, not window.location, so moving between
  // /events/<id> URLs re-renders this screen and loads the new event.
  const { pathname } = useLocation();
  const pathIdentifier = pathname.startsWith('/events/') ? pathname.slice(8) : '';
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

  async function postComment(eventId: string) {
    setCommentBusy(true); setCommentError('');
    try {
      const response = await fetch(`/api/events?id=${encodeURIComponent(eventId)}&comment=1`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: comment }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to post comment.');
      setComment(''); setRevision(value => value + 1);
    } catch (failure) { setCommentError(failure instanceof Error ? failure.message : 'Unable to post comment.'); }
    finally { setCommentBusy(false); }
  }

  return <main className="client-events">
    {/* Brand link and Sign out come from the shared header (app/AppShell). */}
    <header><h1>My organisation’s events</h1>
      <p>View events created by you and your fellow organisers.</p>
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
      {!busy && !error && event && <article><div className="organiser-event-heading"><div><h2>{event.title}</h2><p>{event.event_code} · {plainStatus(event.status)}</p></div>{event.canEdit ? <button type="button" className="secondary-action" onClick={() => { setEditing(true); setSaved(null); }}><PencilLine size={14} aria-hidden="true" /> Edit event</button> : null}</div>
        {saved ? <p role="status">{saved}</p> : null}
        {editing ? <EventEditForm
          eventId={event.id}
          values={{ title: event.title, description: event.description, purpose: event.purpose ?? null, starts_at: event.starts_at, ends_at: event.ends_at ?? event.starts_at, expected_attendance: event.expected_attendance ?? 1, venue_requirements: event.venue_requirements ?? null, accessibility_note: event.accessibility_note ?? null, equipment_requirements: event.equipment_requirements ?? null, layout_preference: event.layout_preference ?? null, registration_opens_at: event.registration_opens_at ?? null, registration_closes_at: event.registration_closes_at ?? null }}
          editable={new Set((event.editableFields ?? []) as EditableField[])}
          lockedNote={< >This field is restricted after approval. <a href={`/change-requests/new?event=${encodeURIComponent(event.id)}`}>Request a change</a>.</>}
          intro={<p>Before approval you can update all event details. After approval, restricted fields must go through a change request.</p>}
          onCancel={() => setEditing(false)}
          onSaved={fields => { setEditing(false); setSaved(`Saved your changes to the ${fieldList(fields)}. The activity log has been updated.`); setRevision(value => value + 1); }}
        /> : null}
        <p>{event.description}</p><p>{event.purpose}</p><p>{new Date(event.starts_at).toLocaleString()} – {event.ends_at ? new Date(event.ends_at).toLocaleString() : 'time not set'}</p><p>Created by {event.creator_name}</p>
        <section aria-labelledby="event-information-heading"><h3 id="event-information-heading">Event information</h3><dl>
          <dt>Expected attendance</dt><dd>{event.expected_attendance ?? 'Not provided'}</dd>
          <dt>Venue requirements</dt><dd>{event.venue_requirements ?? 'Not provided'}</dd>
          <dt>Accessibility needs</dt><dd>{event.accessibility_note ?? 'Not provided'}</dd>
          <dt>Equipment requirements</dt><dd>{event.equipment_requirements ?? 'Not provided'}</dd>
          <dt>Layout preference</dt><dd>{event.layout_preference ?? 'Not provided'}</dd>
          <dt>Registration setup</dt><dd>{event.registration_setup ?? 'Not provided'}</dd>
          <dt>Registration dates</dt><dd>{event.registration_opens_at && event.registration_closes_at ? `${plainDate(event.registration_opens_at)} – ${plainDate(event.registration_closes_at)}` : 'Not provided'}</dd>
        </dl></section>
        <section aria-labelledby="event-status-heading"><h3 id="event-status-heading">Current status</h3><p><strong>{plainStatus(event.status)}</strong></p><p>Reached on {plainDate(event.status_changed_at)}</p><p>Assigned Coordinator: <strong>{event.coordinator_name ?? 'Not yet assigned'}</strong></p></section>
        <section aria-labelledby="status-history-heading"><h3 id="status-history-heading">Status history</h3>
          {event.statusHistory?.length ? <ol>{event.statusHistory.map((entry, index) => <li key={`${entry.occurred_at}-${index}`}>{entry.old_value ? `${plainStatus(entry.old_value)} → ` : ''}{plainStatus(entry.new_value ?? '')} — {plainDate(entry.occurred_at)}</li>)}</ol> : <p>No status changes recorded yet.</p>}
        </section>
        <section aria-labelledby="event-activity-heading"><h3 id="event-activity-heading">Activity log</h3>
          {event.activityLog?.length ? <ol>{event.activityLog.map((entry, index) => <li key={`${entry.occurred_at}-${index}`}><strong>{entry.action}</strong>{entry.field_changed ? ` · ${entry.field_changed}` : ''} — {plainDate(entry.occurred_at)}{entry.actor_name ? ` by ${entry.actor_name}` : ''}{entry.new_value ? ` (${entry.new_value})` : ''}</li>)}</ol> : <p>No activity recorded yet.</p>}
        </section>
        <section aria-labelledby="event-comments-heading"><h3 id="event-comments-heading">Comments</h3>
          {event.comments?.length ? <ol>{event.comments.map(item => <li key={item.id}><p>{item.body}</p><small>{item.author_name} · {new Date(item.created_at).toLocaleString()}</small></li>)}</ol> : <p>No comments yet.</p>}
          {event.canPostComment ? <form onSubmit={formEvent => { formEvent.preventDefault(); void postComment(event.id); }}>
            <label htmlFor="event-comment">Add a comment</label><textarea id="event-comment" value={comment} onChange={changeEvent => setComment(changeEvent.target.value)} maxLength={2000} required />
            <button type="submit" disabled={commentBusy || !comment.trim()}>{commentBusy ? 'Posting…' : 'Post comment'}</button>
            {commentError && <p role="alert">{commentError}</p>}
          </form> : null}
        </section>
      </article>}
    </>}
  </main>;
}
