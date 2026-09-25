// MOCKED — pending backend (see notificationsApi.ts). These tests exercise
// the real component against that mock layer rather than re-mocking fetch,
// since notificationsApi.ts already stands in for the real
// /api/notifications endpoints.
import { cleanup, fireEvent, render, screen, waitForElementToBeRemoved, within } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { NotificationInbox } from './NotificationInbox';
import { notifications as fixtureNotifications } from './mocks';

afterEach(() => { cleanup(); });

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

  // The button's own label flips to "Marking…" the instant it's clicked
  // (state update is synchronous, the mock's resolution isn't), so wait for
  // any button in this item to disappear rather than one still named
  // "Mark as read" — that specific name is already gone by the time this
  // check first runs.
  fireEvent.click(within(item).getByRole('button', { name: 'Mark as read' }));
  await waitForElementToBeRemoved(() => within(item).queryByRole('button'));

  expect(item).not.toHaveClass('notification-unread');
  expect(item.textContent).toContain('Read');
  expect(item.textContent).not.toContain('Unread');
});
