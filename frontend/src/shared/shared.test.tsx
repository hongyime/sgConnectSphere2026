// Behaviour of the shared building blocks that every story's screens rely on.
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  Alert, Button, ConfirmPanel, DataTable, ErrorState, FactList, FilterChips, FormField, apiCall, formatDate, formatDateRange, useLoad,
  type ApiResult,
} from '.';
import { UiKit } from '../app/UiKit';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('formatDate', () => {
  // 01:00Z is 9:00 am in Singapore, whatever timezone the test machine uses.
  test('shows Singapore time', () => {
    expect(formatDate('2026-10-08T01:00:00.000Z', true)).toBe('8 Oct 2026, 9:00 am');
    expect(formatDateRange('2026-10-08T01:00:00.000Z', '2026-10-08T09:00:00.000Z')).toBe('8 Oct 2026, 9:00 am – 5:00 pm');
  });

  // 20:00Z on 7 Oct is already 8 Oct in Singapore, so this range is one day there.
  test('decides "same day" in Singapore time', () => {
    expect(formatDateRange('2026-10-07T20:00:00.000Z', '2026-10-08T02:00:00.000Z')).toBe('8 Oct 2026, 4:00 am – 10:00 am');
  });

  test('says when a date is missing', () => {
    expect(formatDate(null)).toBe('Not recorded');
    expect(formatDate('not a date')).toBe('Not recorded');
  });
});

describe('apiCall', () => {
  function stub(reply: () => Promise<Response>) { vi.stubGlobal('fetch', vi.fn(reply)); }
  const response = (status: number, body: unknown) => ({ ok: status < 300, status, json: async () => body }) as Response;

  test('returns the data on success and sends the session cookie', async () => {
    stub(async () => response(200, { venues: [1] }));
    expect(await apiCall<{ venues: number[] }>('/api/venues', undefined, 'Unable to load.')).toEqual({ ok: true, data: { venues: [1] } });
    expect(vi.mocked(fetch).mock.calls[0][1]).toMatchObject({ credentials: 'same-origin' });
  });

  test("uses the server's message, or the fallback when there is none", async () => {
    stub(async () => response(403, { error: 'Access denied.' }));
    expect(await apiCall('/x', undefined, 'Unable to load.')).toEqual({ ok: false, status: 403, message: 'Access denied.' });
    stub(async () => response(500, {}));
    expect(await apiCall('/x', undefined, 'Unable to load.')).toEqual({ ok: false, status: 500, message: 'Unable to load.' });
  });

  test('keeps field errors and conflict details, and swaps a machine code for the fallback', async () => {
    stub(async () => response(400, { error: 'validation_failed', errors: { from: ['Start date is required.'], to: 'End must be after start.' } }));
    expect(await apiCall('/x', undefined, 'Unable to save.')).toMatchObject({
      ok: false, status: 400, message: 'Unable to save.', code: 'validation_failed',
      fieldErrors: { from: ['Start date is required.'], to: ['End must be after start.'] },
    });
    const clash = { eventCode: 'EV-1', title: 'Summit', startsAt: '2026-10-02T09:00:00Z', endsAt: '2026-10-02T12:00:00Z' };
    stub(async () => response(409, { error: 'booking_conflict', conflictingBookings: [clash] }));
    const result = await apiCall('/x', undefined, 'This block clashes with a booking.');
    expect(result).toMatchObject({ ok: false, status: 409, message: 'This block clashes with a booking.', code: 'booking_conflict' });
    expect(!result.ok && result.details?.conflictingBookings).toEqual([clash]);
  });

  test("shows the body's message sentence when error is a machine code", async () => {
    // The venue blocks API's shape: a code in `error`, the sentence in `message`.
    stub(async () => response(409, {
      error: 'booking_conflict',
      message: 'This period overlaps a confirmed booking. Resolve the booking before blocking the venue.',
      conflictingBookings: [],
    }));
    expect(await apiCall('/x', undefined, 'Unable to save the block.')).toMatchObject({
      ok: false, status: 409, code: 'booking_conflict',
      message: 'This period overlaps a confirmed booking. Resolve the booking before blocking the venue.',
    });
  });

  test('a network failure becomes status 0; an abort is re-thrown', async () => {
    stub(async () => { throw new TypeError('Failed to fetch'); });
    expect(await apiCall('/x', undefined, 'Unable to load.')).toMatchObject({ ok: false, status: 0 });
    stub(async () => { throw new DOMException('Aborted', 'AbortError'); });
    await expect(apiCall('/x', undefined, 'Unable to load.')).rejects.toThrow('Aborted');
  });
});

describe('useLoad', () => {
  function Viewer({ id, load }: { id: string; load: (id: string, signal: AbortSignal) => Promise<ApiResult<string>> }) {
    const { result, reload } = useLoad(signal => load(id, signal), [id]);
    return (
      <div>
        <p data-testid="state">{result.state === 'ready' ? result.data : result.state === 'error' ? `error: ${result.failure.message}` : 'loading'}</p>
        <button type="button" onClick={reload}>Reload</button>
      </div>
    );
  }

  test('a late response for an earlier id never replaces the current one', async () => {
    let releaseA!: (value: ApiResult<string>) => void;
    const load = vi.fn((id: string, signal: AbortSignal) => id === 'A'
      ? new Promise<ApiResult<string>>((resolve, reject) => {
        releaseA = value => (signal.aborted ? reject(new DOMException('Aborted', 'AbortError')) : resolve(value));
      })
      : Promise.resolve({ ok: true as const, data: 'event B' }));
    const { rerender } = render(<Viewer id="A" load={load} />);
    rerender(<Viewer id="B" load={load} />);
    expect(await screen.findByText('event B')).toBeInTheDocument();
    await act(async () => { releaseA({ ok: true, data: 'event A' }); });
    expect(screen.getByTestId('state')).toHaveTextContent('event B');
  });

  test('reload keeps the current data on screen while refreshing', async () => {
    let calls = 0;
    let finish!: () => void;
    const load = vi.fn(() => {
      calls += 1;
      return calls === 1
        ? Promise.resolve({ ok: true as const, data: 'first' })
        : new Promise<ApiResult<string>>(resolve => { finish = () => resolve({ ok: true, data: 'second' }); });
    });
    render(<Viewer id="A" load={load} />);
    expect(await screen.findByText('first')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(screen.getByTestId('state')).toHaveTextContent('first');
    await act(async () => { finish(); });
    expect(screen.getByTestId('state')).toHaveTextContent('second');
  });

  test('a failure becomes an error state with the message', async () => {
    render(<Viewer id="A" load={() => Promise.resolve({ ok: false, status: 503, message: 'Service unavailable.' })} />);
    expect(await screen.findByText('error: Service unavailable.')).toBeInTheDocument();
  });
});

describe('FormField', () => {
  test('links the label, hint and error to the control', () => {
    render(<FormField label="Event name" hint="Shown to attendees." error="Event name can't be left empty.">{props => <input {...props} />}</FormField>);
    const input = screen.getByLabelText('Event name');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription("Shown to attendees. Event name can't be left empty.");
  });

  test('no error means no aria-invalid', () => {
    render(<FormField label="Layout">{props => <select {...props}><option>Theatre</option></select>}</FormField>);
    expect(screen.getByLabelText('Layout')).not.toHaveAttribute('aria-invalid');
  });
});

describe('ErrorState', () => {
  const renderState = (status: number, message = 'Problem.') => render(
    <MemoryRouter><ErrorState failure={{ status, message }} context="your events" onRetry={vi.fn()} /></MemoryRouter>,
  );

  test('401 asks the user to sign in', () => {
    renderState(401);
    expect(screen.getByRole('alert')).toHaveTextContent('Sign in to continue');
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
  });

  test("403 shows the server's refusal and a way back", () => {
    renderState(403, 'Access denied. This event is not assigned to you.');
    expect(screen.getByRole('alert')).toHaveTextContent('Access denied. This event is not assigned to you.');
    expect(screen.getByRole('link', { name: 'Back to my home page' })).toHaveAttribute('href', '/home');
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  test('anything else offers a retry', () => {
    renderState(503, 'Service unavailable.');
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load your events");
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});

describe('ConfirmPanel', () => {
  test('requires the reason before confirming, then passes it on', () => {
    const onConfirm = vi.fn();
    render(<ConfirmPanel title="Reject this request?" confirmLabel="Reject request" reasonLabel="Reason" danger onConfirm={onConfirm} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Reject request' }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Reason')).toHaveAccessibleDescription('Reason is required.');
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: '  Date clashes with exams  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reject request' }));
    expect(onConfirm).toHaveBeenCalledWith('Date clashes with exams');
  });

  test('shows a server refusal inside the panel', () => {
    render(<ConfirmPanel title="Approve?" confirmLabel="Approve" error="Required information is incomplete." onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Required information is incomplete.');
  });
});

describe('lists and feedback', () => {
  test('DataTable has a caption and labels every cell for the phone layout', () => {
    render(<DataTable caption="Events assigned to you" rows={[{ id: '1', title: 'Summit' }]} rowKey={row => row.id}
      columns={[{ header: 'Event', primary: true, cell: row => row.title }, { header: 'Status', cell: () => 'Approved' }]} />);
    const table = screen.getByRole('table', { name: 'Events assigned to you' });
    expect(within(table).getByText('Approved').closest('td')).toHaveAttribute('data-label', 'Status');
  });

  test('DataTable can hide a header visually and tell apart columns that share one', () => {
    render(<DataTable caption="Venue blocks" rows={[{ id: '1' }]} rowKey={row => row.id} columns={[
      { header: 'Actions', key: 'shorten', hideHeader: true, cell: () => <button type="button">Shorten</button> },
      { header: 'Actions', key: 'remove', hideHeader: true, cell: () => <button type="button">Remove</button> },
    ]} />);
    const table = screen.getByRole('table', { name: 'Venue blocks' });
    expect(within(table).getAllByRole('columnheader', { name: 'Actions' })).toHaveLength(2);
    expect(within(table).getByRole('button', { name: 'Remove' }).closest('td')).not.toHaveAttribute('data-label');
  });

  test('FilterChips marks the chosen option and reports changes', () => {
    function Harness() {
      const [value, setValue] = useState<'all' | 'open'>('all');
      return <FilterChips label="Filter by status" value={value} onChange={setValue} options={[{ id: 'all', label: 'All', count: 3 }, { id: 'open', label: 'Open', count: 1 }]} />;
    }
    render(<Harness />);
    const group = screen.getByRole('group', { name: 'Filter by status' });
    fireEvent.click(within(group).getByRole('button', { name: /Open/ }));
    expect(within(group).getByRole('button', { name: /Open/ })).toHaveAttribute('aria-pressed', 'true');
    expect(within(group).getByRole('button', { name: /All/ })).toHaveAttribute('aria-pressed', 'false');
  });

  test('FactList shows "None recorded" for empty values', () => {
    render(<FactList items={[['Purpose', ''], ['Organiser', 'Organiser A']]} />);
    expect(screen.getByText('None recorded')).toBeInTheDocument();
  });

  test('errors and warnings are announced immediately; success politely', () => {
    render(<><Alert tone="error">Refused.</Alert><Alert tone="success">Saved.</Alert></>);
    expect(screen.getByRole('alert')).toHaveTextContent('Refused.');
    expect(screen.getByRole('status')).toHaveTextContent('Saved.');
  });

  test('a busy button is disabled and shows its busy label', () => {
    render(<Button variant="primary" busy busyLabel="Saving…">Save</Button>);
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
  });
});

test('the /ui-kit reference page renders every block without calling the API', async () => {
  const fetchSpy = vi.fn();
  vi.stubGlobal('fetch', fetchSpy);
  render(<MemoryRouter><UiKit /></MemoryRouter>);
  expect(screen.getByRole('heading', { level: 1, name: 'UI kit' })).toBeInTheDocument();
  expect(screen.getByRole('table', { name: 'Sample events' })).toBeInTheDocument();
  await waitFor(() => expect(screen.getAllByRole('alert').length).toBeGreaterThan(0));
  expect(fetchSpy).not.toHaveBeenCalled();
});
