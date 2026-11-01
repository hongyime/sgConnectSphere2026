// SCRUM-27: "my drafts" list (Scenario 1/3/5) and the reopen-a-draft wrapper
// (Scenario 2) that pre-fills OrganiserRequestFlow from a fetched draft.
// A separate view from OrganiserRequestFlow, per the drafts-UI decision in
// the SCRUM-27 task list.
//
// Post-ADR-015 auth: every fetch here uses `credentials: 'same-origin'` so
// the session cookie set by /api/auth/session is sent automatically.
// There is no offline/prototype path — a signed-out visitor sees a "Sign in
// to see your drafts" error state, which matches the /organiser/drafts route
// only being reachable after a successful login.

import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Pencil, Trash2 } from 'lucide-react';
import { OrganiserRequestFlow } from './OrganiserRequestFlow';
import './organiser.css';

type DraftSummary = {
  id: string;
  title: string;
  startAt?: string;
  endAt?: string;
  datesPending?: boolean;
  status: string;
};

type ListState =
  | { status: 'loading' }
  | { status: 'loaded'; drafts: DraftSummary[]; previous: DraftSummary[] }
  | { status: 'error'; message: string };

export function OrganiserDrafts() {
  const [state, setState] = useState<ListState>({ status: 'loading' });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyWarnings, setCopyWarnings] = useState<string[]>([]);

  const load = useCallback(async () => {
    setState({ status: 'loading' });

    let response: Response;
    try {
      response = await fetch('/api/events?mine=1&status=draft', {
        credentials: 'same-origin',
      });
    } catch {
      setState({ status: 'error', message: 'Drafts could not be loaded.' });
      return;
    }

    if (response.status === 401) {
      // Cookie missing or expired — the session middleware has told us to
      // sign in. Match the pre-consolidation message so the UI copy is
      // stable across the ADR-015 refactor.
      setState({ status: 'error', message: 'Sign in to see your drafts.' });
      return;
    }

    if (!response.ok) {
      setState({ status: 'error', message: 'Drafts could not be loaded.' });
      return;
    }

    const body = await response.json().catch(() => null);
    const previousResponse = await fetch('/api/events?mine=1', { credentials: 'same-origin' }).catch(() => null);
    const previousBody = previousResponse?.ok ? await previousResponse.json().catch(() => null) : null;
    setState({
      status: 'loaded',
      drafts: Array.isArray(body?.events) ? body.events : [],
      previous: Array.isArray(previousBody?.events)
        ? previousBody.events.filter((event: DraftSummary) => event.status !== 'draft')
        : [],
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const deleteDraft = async (id: string, title: string) => {
    if (!window.confirm(`Delete the draft "${title || '(untitled)'}"? This cannot be undone.`)) {
      return;
    }

    setDeletingId(id);
    try {
      await fetch(`/api/events?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
    } finally {
      setDeletingId(null);
      await load();
    }
  };

  const copyEvent = async (id: string) => {
    setCopyingId(id);
    setCopiedId(null);
    setCopyWarnings([]);
    const response = await fetch(`/api/events?copy=1&id=${encodeURIComponent(id)}`, {
      method: 'POST',
      credentials: 'same-origin',
    }).catch(() => null);
    const body = response?.ok ? await response.json().catch(() => null) : null;
    setCopyingId(null);
    if (!response?.ok || !body?.event?.id) return;
    setCopiedId(body.event.id);
    setCopyWarnings(Array.isArray(body.warnings) ? body.warnings : []);
    await load();
  };

  return (
    <main className="organiser-page">
      <header className="organiser-heading">
        <p className="eyebrow">Event organiser</p>
        <h1>My drafts</h1>
      </header>

      <p className="organiser-footer">
        <Link to="/organiser/new-request" className="primary-action">Start a new request</Link>
      </p>

      {state.status === 'loading' ? <p role="status">Loading drafts…</p> : null}
      {state.status === 'error' ? <p role="alert" className="login-error">{state.message}</p> : null}

      {state.status === 'loaded' ? (
        state.drafts.length === 0 ? (
          <p>You have no saved drafts.</p>
        ) : (
          <table className="organiser-table" aria-label="My drafts">
            <thead>
              <tr><th>Event</th><th>Preferred date</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {state.drafts.map((draftItem) => (
                <tr key={draftItem.id}>
                  <td>{draftItem.title || '(untitled)'}</td>
                  <td>{draftItem.datesPending ? 'Dates to be entered' : draftItem.startAt ? new Date(draftItem.startAt).toLocaleString() : '—'}</td>
                  <td><span className="status-pill status-neutral">Draft</span></td>
                  <td>
                    <Link to={`/organiser/drafts/${draftItem.id}`}>
                      <Pencil size={14} aria-hidden="true" /> Continue editing
                    </Link>
                    {' '}
                    <button
                      type="button"
                      className="secondary-action"
                      disabled={deletingId === draftItem.id}
                      onClick={() => deleteDraft(draftItem.id, draftItem.title)}
                    >
                      <Trash2 size={14} aria-hidden="true" /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      ) : null}

      {state.status === 'loaded' ? (
        <section aria-labelledby="previous-events-heading">
          <h2 id="previous-events-heading">Reuse a previous event</h2>
          {state.previous.length === 0 ? <p>No completed or past events are available to copy.</p> : (
            <table className="organiser-table" aria-label="Previous events">
              <thead><tr><th>Event</th><th>Date</th><th>Action</th></tr></thead>
              <tbody>{state.previous.map(event => (
                <tr key={event.id}>
                  <td>{event.title || '(untitled)'}</td>
                  <td>{event.startAt ? new Date(event.startAt).toLocaleString() : '—'}</td>
                  <td>
                    <button type="button" className="secondary-action" disabled={copyingId === event.id} onClick={() => copyEvent(event.id)}>
                      {copyingId === event.id ? 'Copying…' : 'Copy details'}
                    </button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          )}
          {copiedId ? <p role="status">Copied into a new draft. <Link to={`/organiser/drafts/${copiedId}`}>Continue editing</Link></p> : null}
          {copyWarnings.length ? <ul role="alert">{copyWarnings.map(warning => <li key={warning}>{warning}</li>)}</ul> : null}
        </section>
      ) : null}
    </main>
  );
}

function toLocalInputValue(isoString: string) {
  const date = new Date(isoString);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

type EditState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'loaded';
      initialValues: {
        eventName: string;
        description: string;
        purpose: string;
        startDate: string;
        endDate: string;
        expectedAttendance: string;
        venueRequirements: string;
        accessibilityNeeds: string;
        accessibilityFeatureIds: string[];
        equipmentRequirements: string;
        layoutPreference: string;
        registrationSetup: string;
      };
    };

export function OrganiserDraftEdit() {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<EditState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    // React Router reuses this screen between draft URLs: show loading rather
    // than the previous draft while this one loads.
    setState({ status: 'loading' });

    (async () => {
      if (!id) {
        setState({ status: 'error', message: 'Missing draft id.' });
        return;
      }

      let response: Response;
      try {
        response = await fetch(`/api/events?mine=1&id=${encodeURIComponent(id)}`, {
          credentials: 'same-origin',
        });
      } catch {
        if (!cancelled) setState({ status: 'error', message: 'The draft could not be loaded.' });
        return;
      }

      if (response.status === 401) {
        if (!cancelled) setState({ status: 'error', message: 'Sign in to view this draft.' });
        return;
      }

      if (!response.ok) {
        if (!cancelled) {
          setState({ status: 'error', message: response.status === 404 ? 'Draft not found.' : 'The draft could not be loaded.' });
        }
        return;
      }

      const body = await response.json().catch(() => null);
      const event = body?.event;
      if (cancelled) {
        return;
      }

      // A successful reply with no draft in it used to leave the screen on
      // "Loading draft…" forever.
      if (!event) {
        setState({ status: 'error', message: 'The draft could not be loaded.' });
        return;
      }

      setState({
        status: 'loaded',
        initialValues: {
          eventName: event.title ?? '',
          description: event.description ?? '',
          purpose: event.purpose ?? '',
          startDate: event.datesPending ? '' : event.startAt ? toLocalInputValue(event.startAt) : '',
          endDate: event.datesPending ? '' : event.endAt ? toLocalInputValue(event.endAt) : '',
          expectedAttendance: event.expectedAttendance != null ? String(event.expectedAttendance) : '',
          venueRequirements: event.venueRequirements ?? '',
          accessibilityNeeds: event.accessibilityNote ?? '',
          accessibilityFeatureIds: Array.isArray(event.accessibilityFeatureIds) ? event.accessibilityFeatureIds : [],
          equipmentRequirements: event.equipmentRequirements ?? '',
          layoutPreference: event.layoutPreference ?? '',
          registrationSetup: event.registrationSetup ?? '',
        },
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (state.status === 'loading') {
    return <main className="organiser-page"><p role="status">Loading draft…</p></main>;
  }

  if (state.status === 'error') {
    return (
      <main className="organiser-page">
        <p role="alert" className="login-error">{state.message}</p>
        <p className="organiser-footer"><Link to="/organiser/drafts">← Back to my drafts</Link></p>
      </main>
    );
  }

  return (
    <>
      <p className="organiser-footer"><Link to="/organiser/drafts">← Back to my drafts</Link></p>
      {/* The form reads initialValues only when it mounts, so each draft gets its own instance. */}
      <OrganiserRequestFlow key={id} draftId={id} initialValues={state.initialValues} />
    </>
  );
}
