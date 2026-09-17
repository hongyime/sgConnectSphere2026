// Vitest + React Testing Library component tests for RegisterForm.
//
// Purpose: prove that the harness introduced by SCRUM-101 works and to give
// future contributors a template for adding component-level tests. The
// Playwright suite (tests/e2e/registration.spec.ts) already covers the full
// browser-through-network flow; these tests cover cheap-to-run component
// behaviour — fetch payload shape, per-field error rendering, disabled state
// during submission — that would be slow to exercise through Playwright.
//
// Each test explains what it is checking above the assertions. Failing tests
// should be readable by any teammate without domain reconstruction.

import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { RegisterForm } from './RegisterForm';

type FetchArgs = Parameters<typeof fetch>;

function stubFetch(response: { status: number; body?: unknown }) {
  const spy = vi.fn(async (...args: FetchArgs): Promise<Response> => {
    return new Response(JSON.stringify(response.body ?? {}), {
      status: response.status,
      headers: { 'content-type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', spy);
  return spy;
}

describe('RegisterForm', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('submits the four required fields as JSON and shows the success message on 201', async () => {
    // Documents the exact request body shape the backend expects at
    // POST /api/auth/register. Also proves that the success state renders the
    // status-role banner so screen readers announce it.
    const user = userEvent.setup();
    const spy = stubFetch({ status: 201, body: { account: { id: 'test', email: 'jamie@example.com', role: 'attendee' } } });
    render(<RegisterForm />);
    await user.type(screen.getByLabelText('Full name'), 'Jamie Lee');
    await user.type(screen.getByLabelText('Email'), 'jamie@example.com');
    await user.type(screen.getByLabelText('Password'), 'LongPassword12!'); // pragma: allowlist secret - synthetic test credential
    await user.type(screen.getByLabelText('Contact number'), '+65 9000 0000');
    await user.click(screen.getByRole('button', { name: 'Create Account' }));
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Your Attendee account has been created.');
    });
    expect(spy).toHaveBeenCalledTimes(1);
    const [, init] = spy.mock.calls[0];
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({
      full_name: 'Jamie Lee',
      email: 'jamie@example.com',
      password: 'LongPassword12!', // pragma: allowlist secret - synthetic test credential
      contact_number: '+65 9000 0000',
    });
  });

  test('marks the offending field aria-invalid when the server returns a 400 error', async () => {
    // Field-level error rendering is the accessibility surface for E01-S08
    // Scenario 3 (invalid submission corrected). Playwright asserts the
    // visible text; this test asserts the aria-invalid attribute, which is
    // what screen readers use to move focus to the wrong field.
    const user = userEvent.setup();
    stubFetch({ status: 400, body: { errors: { full_name: ['Name is required'] } } });
    render(<RegisterForm />);
    await user.click(screen.getByRole('button', { name: 'Create Account' }));
    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Full name')).toHaveAttribute('aria-invalid', 'true');
  });

  test('disables the submit button while the request is in flight', async () => {
    // Prevents accidental double-submit. The Playwright suite cannot easily
    // assert on this because the browser hits the response too quickly; here
    // the fetch stub can be deliberately slow.
    //
    // We hold the fetch promise open with an external resolver, assert the
    // in-flight state, resolve the fetch, then await the settled state so
    // React can flush the resulting state update inside its own act boundary.
    const user = userEvent.setup();
    let resolveFetch: ((response: Response) => void) | undefined;
    const slowFetch = vi.fn((): Promise<Response> => {
      return new Promise(resolve => { resolveFetch = resolve; });
    });
    vi.stubGlobal('fetch', slowFetch);
    render(<RegisterForm />);
    await user.type(screen.getByLabelText('Full name'), 'Jamie Lee');
    await user.type(screen.getByLabelText('Email'), 'jamie@example.com');
    await user.type(screen.getByLabelText('Password'), 'LongPassword12!'); // pragma: allowlist secret - synthetic test credential
    await user.type(screen.getByLabelText('Contact number'), '+65 9000 0000');
    await user.click(screen.getByRole('button', { name: 'Create Account' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Creating account...' })).toBeDisabled();
    });
    // Resolve inside act so React can flush the resulting state update without
    // triggering an "update not wrapped in act(...)" warning.
    await act(async () => {
      resolveFetch?.(new Response('{}', { status: 201 }));
    });
    // Wait for the success state to render so the test does not leave any
    // pending microtasks that could bleed into subsequent tests.
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Your Attendee account has been created.');
    });
  });
});
