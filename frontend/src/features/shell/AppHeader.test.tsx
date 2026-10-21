import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { AppHeader } from './AppHeader';
import { NotificationInbox } from '../notifications/NotificationInbox';
import { stubApi } from '../../testing/fakeApi';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

test('TC_E11S01_07 marking a notice read updates the bell without navigation or reload', async () => {
  let read = false;
  const notice = () => ({ id: 'notice', title: 'Equipment reservation changed',
    message: 'EVT-E11: Microphone × 4 reserved.', is_read: read, read_at: read ? '2026-10-18T08:00:00Z' : null,
    created_at: '2026-10-18T07:00:00Z', event_id: 'event' });
  stubApi({
    'GET /api/notifications': () => ({ body: { notifications: [notice()] } }),
    'POST /api/notifications': () => { read = true; return { body: { notification: notice() } }; },
  }, { role: 'technical_support_staff' });
  render(<MemoryRouter><AppHeader /><NotificationInbox /></MemoryRouter>);
  expect(await screen.findByRole('link', { name: 'Notifications, 1 unread' })).toBeVisible();
  expect(await screen.findByText('EVT-E11: Microphone × 4 reserved.')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Mark as read' }));
  await waitFor(() => expect(screen.queryByRole('link', { name: 'Notifications, 1 unread' })).not.toBeInTheDocument());
  expect(screen.getByRole('link', { name: 'Notifications' })).toBeVisible();
  expect(screen.getByText(/· Read/)).toBeVisible();
});

test('TC_E11S01_07 a failed read keeps both the notice and bell unread', async () => {
  stubApi({
    'GET /api/notifications': { body: { notifications: [{ id: 'notice', title: 'Equipment changed',
      message: 'EVT-E11: Microphone reserved.', is_read: false, read_at: null,
      created_at: '2026-10-18T07:00:00Z', event_id: 'event' }] } },
    'POST /api/notifications': { status: 503, body: { error: 'Try again later.' } },
  }, { role: 'technical_support_staff' });
  render(<MemoryRouter><AppHeader /><NotificationInbox /></MemoryRouter>);
  expect(await screen.findByRole('link', { name: 'Notifications, 1 unread' })).toBeVisible();
  fireEvent.click(await screen.findByRole('button', { name: 'Mark as read' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Try again later.');
  expect(screen.getByRole('link', { name: 'Notifications, 1 unread' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Mark as read' })).toBeVisible();
});

function stub({ role, unread = 0, signOutStatus = 200 }: { role?: string; unread?: number; signOutStatus?: number }) {
  const calls: { path: string; method: string }[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: string, init?: RequestInit) => {
    const path = new URL(input, 'http://localhost').pathname;
    const method = init?.method ?? 'GET';
    calls.push({ path, method });
    let reply: { status: number; body: unknown };
    if (path === '/api/auth/session' && method === 'DELETE') reply = { status: signOutStatus, body: { signedOut: true } };
    else if (path === '/api/auth/session') {
      reply = role ? { status: 200, body: { user: { id: 'u-1', email: 'u@example.com', role, clientOrgId: null } } } : { status: 401, body: { error: 'Sign in to continue.' } };
    } else {
      reply = { status: 200, body: { notifications: Array.from({ length: 3 }, (_, index) => ({ id: `n-${index}`, is_read: index >= unread })) } };
    }
    return { ok: reply.status < 300, status: reply.status, json: async () => reply.body } as Response;
  }));
  return calls;
}

function renderHeader(path = '/coordinator/queue') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppHeader />
      <Routes>
        <Route path="/login" element={<p>Login page</p>} />
        <Route path="*" element={null} />
      </Routes>
    </MemoryRouter>,
  );
}

test('shows the Coordinator links with the current page marked', async () => {
  stub({ role: 'event_coordinator' });
  renderHeader();
  const nav = await screen.findByRole('navigation', { name: 'Main' });
  expect(within(nav).getAllByRole('link').map(link => link.textContent)).toEqual(['Dashboard', 'Equipment requests', 'Review queue', 'Reassignments', 'Venue search', 'Venue calendar']);
  expect(within(nav).getByRole('link', { name: 'Review queue' })).toHaveAttribute('aria-current', 'page');
  expect(within(nav).getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current');
  expect(screen.getByRole('link', { name: 'ConnectSphere' })).toHaveAttribute('href', '/coordinator');
  expect(screen.getByText('Event Coordinator')).toBeInTheDocument();
});

test('shows Organiser links for an Organiser', async () => {
  stub({ role: 'event_organiser' });
  renderHeader('/organiser');
  const nav = await screen.findByRole('navigation', { name: 'Main' });
  expect(within(nav).getByRole('link', { name: 'My requests' })).toHaveAttribute('href', '/organiser/requests');
  expect(within(nav).queryByRole('link', { name: 'Review queue' })).not.toBeInTheDocument();
});

test('announces the unread notification count', async () => {
  stub({ role: 'event_coordinator', unread: 2 });
  renderHeader();
  expect(await screen.findByRole('link', { name: 'Notifications, 2 unread' })).toHaveAttribute('href', '/notifications');
  expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute('href', '/profile');
});

test('signs out through the session endpoint and returns to the login page', async () => {
  const calls = stub({ role: 'event_coordinator' });
  renderHeader();
  fireEvent.click(await screen.findByRole('button', { name: 'Sign out' }));
  expect(await screen.findByText('Login page')).toBeInTheDocument();
  expect(calls).toContainEqual({ path: '/api/auth/session', method: 'DELETE' });
});

test('keeps the user on the page and explains when sign out fails', async () => {
  stub({ role: 'event_coordinator', signOutStatus: 500 });
  renderHeader();
  fireEvent.click(await screen.findByRole('button', { name: 'Sign out' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Sign out failed. Please try again.');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Sign out' })).toBeEnabled());
  expect(screen.queryByText('Login page')).not.toBeInTheDocument();
});

test('offers sign in when there is no session', async () => {
  stub({});
  renderHeader();
  expect(await screen.findByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
  expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /Notifications/ })).not.toBeInTheDocument();
});
