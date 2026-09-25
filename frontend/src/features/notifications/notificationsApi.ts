// MOCKED — pending backend. Typed fetch-shaped wrapper for the notification
// inbox (E11-S01). No real /api/notifications route exists yet: no such
// backend endpoint, service, or repository has been built. These functions
// return the fixtures in ./mocks with a simulated network delay so loading
// states behave like the real thing.
//
// Once the backend lands, replace each function body with the matching
// fetch() call — the exported Result types and call signatures are the
// intended real contract, mirrored on this codebase's existing pattern in
// frontend/src/features/venue/venueApi.ts:
//   listNotifications()      -> GET  /api/notifications
//   markNotificationRead(id) -> POST /api/notifications { action: 'mark_read', id }
// Both would send credentials: 'same-origin' like every other authenticated
// call in this app (ADR-015, cookie sessions).

import { notifications as mockNotifications, type NotificationRecord } from './mocks';

export type { NotificationRecord };

function delay<T>(value: T, ms = 200): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(value), ms));
}

export type ListNotificationsResult =
  | { ok: true; notifications: NotificationRecord[] }
  | { ok: false; message: string };

export async function listNotifications(): Promise<ListNotificationsResult> {
  // Real call: fetch('/api/notifications', { credentials: 'same-origin' })
  return delay({ ok: true, notifications: [...mockNotifications] });
}

export type MarkNotificationReadResult =
  | { ok: true; notification: NotificationRecord }
  | { ok: false; message: string };

export async function markNotificationRead(id: string): Promise<MarkNotificationReadResult> {
  // Real call: fetch('/api/notifications', { method: 'POST', credentials: 'same-origin',
  //   headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'mark_read', id }) })
  const found = mockNotifications.find(entry => entry.id === id);
  if (!found) {
    return delay({ ok: false, message: 'Notification not found.' });
  }
  return delay({ ok: true, notification: { ...found, is_read: true, read_at: new Date().toISOString() } });
}
