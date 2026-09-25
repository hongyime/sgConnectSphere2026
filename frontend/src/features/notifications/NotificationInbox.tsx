import { useCallback, useEffect, useState } from 'react';
import { Bell, CheckCircle2 } from 'lucide-react';
import { listNotifications, markNotificationRead, type NotificationRecord } from './notificationsApi';
import './notifications.css';

// E11-S01 minimal slice: list + mark-as-read only (Scenarios 5 and 6).
// notificationsApi.ts is MOCKED — pending backend — so this screen is
// frontend-only for now; see that file's header for the intended real
// contract.

type InboxState =
  | { status: 'loading' }
  | { status: 'loaded'; notifications: NotificationRecord[] }
  | { status: 'error'; message: string };

function plainDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value));
}

// Scenario 5: newest first. Sorted here rather than trusted from the API,
// so the UI's ordering guarantee doesn't silently depend on the backend
// already doing it once the mock is replaced with a real fetch.
function byNewestFirst(a: NotificationRecord, b: NotificationRecord) {
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}

export function NotificationInbox() {
  const [state, setState] = useState<InboxState>({ status: 'loading' });
  const [markingId, setMarkingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setState({ status: 'loading' });
    const result = await listNotifications();
    setState(result.ok
      ? { status: 'loaded', notifications: [...result.notifications].sort(byNewestFirst) }
      : { status: 'error', message: result.message });
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleMarkRead(id: string) {
    setMarkingId(id);
    const result = await markNotificationRead(id);
    setMarkingId(null);
    if (!result.ok) {
      window.alert(result.message);
      return;
    }
    setState(current => current.status === 'loaded'
      ? { status: 'loaded', notifications: current.notifications.map(entry => entry.id === id ? result.notification : entry) }
      : current);
  }

  const unreadCount = state.status === 'loaded' ? state.notifications.filter(entry => !entry.is_read).length : 0;

  return (
    <main className="notifications-page">
      <header className="page-heading">
        <p className="eyebrow"><Bell size={14} aria-hidden="true" /> Notifications</p>
        <h1>Your notifications{state.status === 'loaded' && unreadCount > 0 ? ` (${unreadCount} unread)` : ''}</h1>
      </header>

      {state.status === 'loading' ? <p role="status">Loading notifications…</p> : null}

      {state.status === 'error' ? (
        <div role="alert" className="login-error">
          {state.message}{' '}
          <button type="button" className="secondary-action" onClick={load}>Try again</button>
        </div>
      ) : null}

      {state.status === 'loaded' ? (
        state.notifications.length === 0 ? (
          <p>No notifications yet.</p>
        ) : (
          <ul className="notification-list" aria-label="Notifications">
            {state.notifications.map(notification => (
              <li
                key={notification.id}
                className={`card notification-card${notification.is_read ? '' : ' notification-unread'}`}
              >
                <div className="notification-body">
                  {!notification.is_read ? <span className="notification-dot" aria-hidden="true" /> : null}
                  <div>
                    <strong>{notification.title}</strong>
                    <p>{notification.message}</p>
                    <p className="notification-meta">
                      {plainDate(notification.created_at)} · {notification.is_read ? 'Read' : 'Unread'}
                    </p>
                  </div>
                </div>
                {!notification.is_read ? (
                  <button
                    type="button" className="secondary-action"
                    disabled={markingId === notification.id}
                    onClick={() => handleMarkRead(notification.id)}
                  >
                    {markingId === notification.id ? 'Marking…' : <><CheckCircle2 size={14} aria-hidden="true" /> Mark as read</>}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )
      ) : null}
    </main>
  );
}
