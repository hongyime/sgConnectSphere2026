// SCRUM-27: "my drafts" list (Scenario 1/3/5) and the reopen-a-draft wrapper
// (Scenario 2) that pre-fills OrganiserRequestFlow from a fetched draft.
// A separate view from OrganiserRequestFlow, per the drafts-UI decision in
// the SCRUM-27 task list.

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
  status: string;
};

type ListState =
  | { status: 'loading' }
  | { status: 'loaded'; drafts: DraftSummary[] }
  | { status: 'error'; message: string };

export function OrganiserDrafts({
  getAccessToken,
}: {
  getAccessToken: () => Promise<string | null>;
}) {
  const [state, setState] = useState<ListState>({ status: 'loading' });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    let accessToken: string | null;
    try {
      accessToken = await getAccessToken();
    } catch {
      setState({ status: 'error', message: 'Your session could not be checked. Please try again.' });
      return;
    }

    if (!accessToken) {
      setState({ status: 'error', message: 'Sign in to see your drafts.' });
      return;
    }

    let response: Response;
    try {
      response = await fetch('/api/events?mine=1&status=draft', {
        headers: { authorization: `Bearer ${accessToken}` },
      });
    } catch {
      setState({ status: 'error', message: 'Drafts could not be loaded.' });
      return;
    }

    if (!response.ok) {
      setState({ status: 'error', message: 'Drafts could not be loaded.' });
      return;
    }

    const body = await response.json().catch(() => null);
    setState({ status: 'loaded', drafts: Array.isArray(body?.events) ? body.events : [] });
  }, [getAccessToken]);

  useEffect(() => {
    load();
  }, [load]);

  const deleteDraft = async (id: string, title: string) => {
    if (!window.confirm(`Delete the draft "${title || '(untitled)'}"? This cannot be undone.`)) {
      return;
    }

    setDeletingId(id);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        return;
      }
      await fetch(`/api/events?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${accessToken}` },
      });
    } finally {
      setDeletingId(null);
      await load();
    }
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
                  <td>{draftItem.startAt ? new Date(draftItem.startAt).toLocaleString() : '—'}</td>
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
        equipmentRequirements: string;
        layoutPreference: string;
        registrationSetup: string;
      };
    };

export function OrganiserDraftEdit({
  getAccessToken,
}: {
  getAccessToken: () => Promise<string | null>;
}) {
  const { id } = useParams<{ id: string }>();
  const [state, setState] = useState<EditState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!id) {
        setState({ status: 'error', message: 'Missing draft id.' });
        return;
      }

      let accessToken: string | null;
      try {
        accessToken = await getAccessToken();
      } catch {
        if (!cancelled) setState({ status: 'error', message: 'Your session could not be checked. Please try again.' });
        return;
      }

      if (!accessToken) {
        if (!cancelled) setState({ status: 'error', message: 'Sign in to view this draft.' });
        return;
      }

      let response: Response;
      try {
        response = await fetch(`/api/events?mine=1&id=${encodeURIComponent(id)}`, {
          headers: { authorization: `Bearer ${accessToken}` },
        });
      } catch {
        if (!cancelled) setState({ status: 'error', message: 'The draft could not be loaded.' });
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
      if (cancelled || !event) {
        return;
      }

      setState({
        status: 'loaded',
        initialValues: {
          eventName: event.title ?? '',
          description: event.description ?? '',
          purpose: event.purpose ?? '',
          startDate: event.startAt ? toLocalInputValue(event.startAt) : '',
          endDate: event.endAt ? toLocalInputValue(event.endAt) : '',
          expectedAttendance: event.expectedAttendance != null ? String(event.expectedAttendance) : '',
          venueRequirements: event.venueRequirements ?? '',
          accessibilityNeeds: event.accessibilityNote ?? '',
          equipmentRequirements: event.equipmentRequirements ?? '',
          layoutPreference: event.layoutPreference ?? '',
          registrationSetup: event.registrationSetup ?? '',
        },
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [id, getAccessToken]);

  if (state.status === 'loading') {
    return <main className="organiser-page"><p role="status">Loading draft…</p></main>;
  }

  if (state.status === 'error') {
    return <main className="organiser-page"><p role="alert" className="login-error">{state.message}</p></main>;
  }

  return (
    <>
      <p className="organiser-footer"><Link to="/organiser/drafts">← Back to my drafts</Link></p>
      <OrganiserRequestFlow
        getAccessToken={getAccessToken}
        draftId={id}
        initialValues={state.initialValues}
      />
    </>
  );
}
