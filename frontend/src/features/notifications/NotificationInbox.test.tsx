import { cleanup, fireEvent, render, screen, waitForElementToBeRemoved, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { NotificationInbox } from './NotificationInbox';
import { notifications as fixtureNotifications } from './mocks';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (_url, init) => {
    if (init?.method === 'POST') {
      const { id } = JSON.parse(init.body);
      return { ok: true, json: async () => ({ notification: {
        ...fixtureNotifications.find(item => item.id === id), is_read: true, read_at: new Date().toISOString(),
      } }) };
    }
    return { ok: true, json: async () => ({ notifications: [...fixtureNotifications].reverse() }) };
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

test('shows a loading state before notifications arrive', () => {
  render(<NotificationInbox />);
  expect(screen.getByRole('status')).toHaveTextContent('Loading notifications…');
});

test('renders notifications newest first once loaded', async () => {
  render(<NotificationInbox />);
  const list = await screen.findByRole('list', { name: 'Notifications' });
  const items = within(list).getAllByRole('listitem');
  expect(items).toHaveLength(fixtureNotifications.length);
  // N-1005 (2026-09-22) is the newest fixture, N-1001 (2026-09-10) the oldest.
  expect(items[0]).toHaveTextContent('Booking flagged for review');
  expect(items[items.length - 1]).toHaveTextContent('Account verified');
});

test('distinguishes unread notifications from read ones', async () => {
  render(<NotificationInbox />);
  const list = await screen.findByRole('list', { name: 'Notifications' });
  const unreadItem = within(list).getByText('Booking flagged for review').closest('li') as HTMLElement;
  const readItem = within(list).getByText('Account verified').closest('li') as HTMLElement;

  expect(unreadItem).toHaveClass('notification-unread');
  expect(within(unreadItem).getByRole('button', { name: 'Mark as read' })).toBeVisible();

  expect(readItem).not.toHaveClass('notification-unread');
  expect(within(readItem).queryByRole('button', { name: 'Mark as read' })).not.toBeInTheDocument();
});

test('marking a notification as read updates it and removes the action', async () => {
  render(<NotificationInbox />);
  await screen.findByRole('list', { name: 'Notifications' });
  const item = screen.getByText('Booking flagged for review').closest('li') as HTMLElement;

  fireEvent.click(within(item).getByRole('button', { name: 'Mark as read' }));
  await waitForElementToBeRemoved(() => within(item).queryByRole('button', { name: /Mark/ }));

  expect(item).not.toHaveClass('notification-unread');
  expect(item.textContent).toContain('Read');
  expect(item.textContent).not.toContain('Unread');
});


test('TC_E11S01_07: opening a notification marks it read and shows its content', async () => {
  render(<NotificationInbox />);
  const button = await screen.findByRole('button', { name: fixtureNotifications[0].title });
  fireEvent.click(button);
  expect(await screen.findByText(fixtureNotifications[0].message)).toBeVisible();
  expect(fetch).toHaveBeenCalledWith('/api/notifications', expect.objectContaining({
    method: 'POST', credentials: 'same-origin',
    body: JSON.stringify({ action: 'mark_read', id: fixtureNotifications[0].id }),
  }));
});

test('API failures show a safe retryable error', async () => {
  vi.mocked(fetch).mockRejectedValue(new Error('offline'));
  render(<NotificationInbox />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load notifications');
  expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible();
});


test('a failed read request leaves the notification unread and shows the error', async () => {
  render(<NotificationInbox />);
  const button = await screen.findByRole('button', { name: fixtureNotifications[0].title });
  vi.mocked(fetch).mockRejectedValue(new Error('offline'));
  fireEvent.click(button);
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to mark notification as read');
  expect(button.closest('li')).toHaveClass('notification-unread');
});
