// The shared header appears exactly once on signed-in pages (from AppShell,
// not from the page), never on public pages; /home follows the user's role;
// placeholder routes show the standard Coming soon page.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { App } from '../App';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function stubApi(role: string | null) {
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    const path = new URL(input, 'http://localhost').pathname;
    const reply = path === '/api/auth/session'
      ? (role ? { status: 200, body: { user: { id: 'u-1', email: 'u@example.com', role, clientOrgId: null } } } : { status: 401, body: { error: 'Sign in to continue.' } })
      : path === '/api/notifications'
        ? { status: 200, body: { notifications: [] } }
        : { status: 200, body: { events: [], incoming: [], outgoing: [], venues: [] } };
    return { ok: reply.status < 300, status: reply.status, json: async () => reply.body } as Response;
  }));
}

function renderAt(path: string) {
  render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
}

test('a signed-in page gets exactly one shared header', async () => {
  stubApi('event_coordinator');
  renderAt('/coordinator');
  expect(await screen.findByRole('navigation', { name: 'Main' })).toBeInTheDocument();
  expect(screen.getAllByRole('link', { name: 'ConnectSphere' })).toHaveLength(1);
});

test('older pages now sit inside the shared header too', async () => {
  stubApi('venue_staff');
  renderAt('/venue/inventory');
  const nav = await screen.findByRole('navigation', { name: 'Main' });
  expect(nav).toHaveTextContent('Inventory');
});

test('the skip link is the first stop and moves focus to the page', async () => {
  stubApi('event_coordinator');
  renderAt('/coordinator');
  await screen.findByRole('heading', { level: 1, name: 'Workload dashboard' });
  const skip = screen.getByRole('link', { name: 'Skip to content' });
  expect(document.querySelectorAll('a, button')[0]).toBe(skip);
  fireEvent.click(skip);
  expect(document.activeElement).toBe(document.querySelector('main'));
});

test('public pages have no shared header', async () => {
  stubApi(null);
  renderAt('/login');
  expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument();
});

test('/home sends a signed-in user to their role home', async () => {
  stubApi('venue_staff');
  renderAt('/home');
  expect(await screen.findByRole('navigation', { name: 'Main' })).toBeInTheDocument();
  expect(await screen.findByRole('link', { name: 'Inventory', current: 'page' })).toBeInTheDocument();
});

test('/home sends a signed-out visitor to sign in', async () => {
  stubApi(null);
  renderAt('/home');
  expect(await screen.findByRole('button', { name: 'Sign in' })).toBeInTheDocument();
});

test('a placeholder route shows the Coming soon page with its story', async () => {
  stubApi('attendee');
  renderAt('/attendee/waitlist/EVT-1');
  expect(await screen.findByRole('heading', { level: 1, name: 'Waiting list' })).toBeInTheDocument();
  expect(screen.getByText('Coming soon · E09-S04')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Back to my home page' })).toHaveAttribute('href', '/home');
});
