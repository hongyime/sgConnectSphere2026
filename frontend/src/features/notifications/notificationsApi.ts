export type NotificationRecord = {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  event_id: string | null;
};
export type ListNotificationsResult =
  | { ok: true; notifications: NotificationRecord[] }
  | { ok: false; message: string };
export type MarkNotificationReadResult =
  | { ok: true; notification: NotificationRecord }
  | { ok: false; message: string };

export async function listNotifications(): Promise<ListNotificationsResult> {
  try {
    const response = await fetch('/api/notifications', { credentials: 'same-origin' });
    const body = await response.json();
    return response.ok ? { ok: true, notifications: body.notifications }
      : { ok: false, message: body.error ?? 'Unable to load notifications.' };
  } catch { return { ok: false, message: 'Unable to load notifications. Please try again.' }; }
}

export async function markNotificationRead(id: string): Promise<MarkNotificationReadResult> {
  try {
    const response = await fetch('/api/notifications', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'mark_read', id }),
    });
    const body = await response.json();
    return response.ok ? { ok: true, notification: body.notification }
      : { ok: false, message: body.error ?? 'Unable to mark notification as read.' };
  } catch { return { ok: false, message: 'Unable to mark notification as read. Please try again.' }; }
}
