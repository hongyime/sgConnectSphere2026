// /profile load failures: every way the profile can fail to load must show a
// plain message above "Try again", never a bare button, an empty alert or a
// raw parser/network error.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { ProfileForm } from './ProfileForm';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

const LOAD_FAILED = 'Your profile could not be loaded. Please try again.';
const profile = { full_name: 'Olivia Organiser', email: 'olivia@example.com', contact_number: null, organisation_name: null };

function reply(status: number, body: unknown) {
  const json = body === 'not json'
    ? async () => { throw new SyntaxError("Unexpected token '<', \"<!DOCTYPE \"... is not valid JSON"); }
    : async () => body;
  return { ok: status >= 200 && status < 300, status, json } as unknown as Response;
}

test.each([
  ['a successful reply with no profile', () => reply(200, {}), LOAD_FAILED],
  ['an error reply with no message', () => reply(500, {}), LOAD_FAILED],
  ['a non-JSON crash page', () => reply(502, 'not json'), LOAD_FAILED],
  ['a network failure', () => { throw new TypeError('Failed to fetch'); }, LOAD_FAILED],
  ['an error reply with its own message', () => reply(503, { error: 'Profile service is down.' }), 'Profile service is down.'],
])('%s shows a message above "Try again"', async (_case, respond, message) => {
  vi.stubGlobal('fetch', vi.fn(async () => respond()));
  render(<ProfileForm />);

  const alert = await screen.findByRole('alert');
  expect(alert).toHaveTextContent(message);
  expect(alert).not.toHaveTextContent(/Unexpected token|Failed to fetch/);
  expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
});

test('"Try again" reloads the profile and clears the message', async () => {
  const fetchMock = vi.fn(async () => reply(200, {}));
  vi.stubGlobal('fetch', fetchMock);
  render(<ProfileForm />);
  expect(await screen.findByRole('alert')).toHaveTextContent(LOAD_FAILED);

  fetchMock.mockImplementation(async () => reply(200, { profile }));
  fireEvent.click(screen.getByRole('button', { name: 'Try again' }));

  expect(await screen.findByLabelText('Full name')).toHaveValue('Olivia Organiser');
  expect(screen.queryByText(LOAD_FAILED)).not.toBeInTheDocument();
});
