// Where sign-in sends each role. An Event Coordinator must land on their
// workspace (/coordinator); /events is the organiser list, which refuses them.
// Both paths are covered: submitting the form, and the resume-on-load
// redirect when the browser already has a live session.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { LoginPage } from './LoginPage';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function reply(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as unknown as Response;
}

function renderLogin() {
  render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/coordinator" element={<p>Coordinator workspace</p>} />
        <Route path="/events" element={<p>Organisation events</p>} />
        <Route path="/venue/inventory" element={<p>Venue inventory</p>} />
        <Route path="/support" element={<p>Support dashboard</p>} />
        <Route path="/admin" element={<p>Admin dashboard</p>} />
        <Route path="/attendee/events" element={<p>Attendee events</p>} />
        <Route path="/" element={<p>Landing page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

test.each([
  ['event_coordinator', 'Coordinator workspace'],
  ['event_organiser', 'Organisation events'],
  // Before the skeleton's roles.ts these three were all sent to /events,
  // which refuses anyone without a client organisation.
  ['venue_staff', 'Venue inventory'],
  ['technical_support_staff', 'Support dashboard'],
  ['admin', 'Admin dashboard'],
  ['attendee', 'Attendee events'],
  ['an_unknown_role', 'Landing page'],
])('signing in as %s lands on its home', async (role, home) => {
  let signedIn = false;
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === 'POST') { signedIn = true; return reply(200, { signedIn: true }); }
    return signedIn ? reply(200, { user: { role } }) : reply(401, { error: 'Sign in to continue.' });
  }));
  renderLogin();

  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'someone@example.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'ValidPass123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

  expect(await screen.findByText(home)).toBeInTheDocument();
});

test('an Event Coordinator who is already signed in is sent to /coordinator', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => reply(200, { user: { role: 'event_coordinator' } })));
  renderLogin();

  expect(await screen.findByText('Coordinator workspace')).toBeInTheDocument();
});
