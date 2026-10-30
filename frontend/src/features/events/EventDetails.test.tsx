import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { REVERTED_MESSAGE, RevertToPlanningButton, type EventRecord } from './EventDetails';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const confirmedEvent: EventRecord = {
  id: 'evt-1001',
  eventCode: 'EVT-1001',
  event_code: 'EVT-1001',
  title: 'Leadership Summit',
  status: 'confirmed',
};

function stubApi(handler: (url: URL, init?: RequestInit) => { status: number; body: unknown }) {
  const calls: { url: URL; init?: RequestInit }[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: string, init?: RequestInit) => {
    const url = new URL(input, 'http://localhost');
    calls.push({ url, init });
    const reply = handler(url, init);
    return {
      ok: reply.status < 300,
      status: reply.status,
      json: async () => reply.body,
    } as Response;
  }));
  return calls;
}

describe('RevertToPlanningButton', () => {
  test('renders "Revert to Planning" button for Coordinator on Confirmed event', () => {
    render(<RevertToPlanningButton event={confirmedEvent} currentUserRole="event_coordinator" onReverted={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Revert to Planning' })).toBeInTheDocument();
  });

  test('does not render "Revert to Planning" button on non-confirmed events', () => {
    for (const status of ['planning', 'safety_review', 'under_review', 'completed', 'cancelled']) {
      const { unmount } = render(
        <RevertToPlanningButton event={{ ...confirmedEvent, status }} currentUserRole="event_coordinator" onReverted={vi.fn()} />,
      );
      expect(screen.queryByRole('button', { name: 'Revert to Planning' })).not.toBeInTheDocument();
      unmount();
    }
  });

  test('does not render "Revert to Planning" button for non-coordinator roles', () => {
    for (const role of ['event_organiser', 'attendee', 'venue_staff']) {
      const { unmount } = render(
        <RevertToPlanningButton event={confirmedEvent} currentUserRole={role} onReverted={vi.fn()} />,
      );
      expect(screen.queryByRole('button', { name: 'Revert to Planning' })).not.toBeInTheDocument();
      unmount();
    }
  });

  test('clicking "Revert to Planning" opens modal and Cancel closes it', () => {
    render(<RevertToPlanningButton event={confirmedEvent} currentUserRole="event_coordinator" onReverted={vi.fn()} />);
    const openBtn = screen.getByRole('button', { name: 'Revert to Planning' });
    fireEvent.click(openBtn);

    expect(screen.getByRole('heading', { name: 'Revert event to planning' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Reason for reversion/)).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelBtn);

    expect(screen.queryByRole('heading', { name: 'Revert event to planning' })).not.toBeInTheDocument();
  });

  test('validation requires non-empty reason and blocks submission', async () => {
    const calls = stubApi(() => ({ status: 200, body: {} }));
    render(<RevertToPlanningButton event={confirmedEvent} currentUserRole="event_coordinator" onReverted={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Revert to Planning' }));

    // Click confirm without entering reason
    const submitBtn = screen.getByRole('button', { name: 'Revert to Planning' });
    fireEvent.click(submitBtn);

    expect(screen.getByText('A reason is required to revert this event to planning.')).toBeInTheDocument();
    expect(calls).toHaveLength(0);

    // Enter only whitespace
    const textarea = screen.getByLabelText(/Reason for reversion/);
    fireEvent.change(textarea, { target: { value: '    ' } });
    fireEvent.click(submitBtn);

    expect(screen.getByText('A reason is required to revert this event to planning.')).toBeInTheDocument();
    expect(calls).toHaveLength(0);
  });

  test('submitting with valid reason calls POST /api/events?revert=1&id=... and hands the success message to the caller', async () => {
    const onReverted = vi.fn();
    const calls = stubApi((url, init) => {
      if (url.pathname === '/api/events' && url.searchParams.get('revert') === '1') {
        const body = JSON.parse(String(init?.body));
        expect(body).toEqual({ reason: 'Venue reported a plumbing issue' });
        return {
          status: 200,
          body: {
            reversion: {
              eventId: confirmedEvent.id,
              eventCode: confirmedEvent.eventCode,
              status: 'planning',
              reason: body.reason,
            },
          },
        };
      }
      return { status: 404, body: { error: 'Not found' } };
    });

    render(<RevertToPlanningButton event={confirmedEvent} currentUserRole="event_coordinator" onReverted={onReverted} />);

    fireEvent.click(screen.getByRole('button', { name: 'Revert to Planning' }));

    const textarea = screen.getByLabelText(/Reason for reversion/);
    fireEvent.change(textarea, { target: { value: 'Venue reported a plumbing issue' } });

    fireEvent.click(screen.getByRole('button', { name: 'Revert to Planning' }));

    await waitFor(() => expect(onReverted).toHaveBeenCalledWith(REVERTED_MESSAGE));
    expect(onReverted).toHaveBeenCalledTimes(1);
    expect(REVERTED_MESSAGE).toMatch(/if the event is published/);
    expect(screen.queryByRole('heading', { name: 'Revert event to planning' })).not.toBeInTheDocument();

    expect(calls).toHaveLength(1);
    expect(calls[0].url.searchParams.get('revert')).toBe('1');
    expect(calls[0].url.searchParams.get('id')).toBe(confirmedEvent.id);
    expect(calls[0].init?.method).toBe('POST');
  });

  test('displays error message when API call fails', async () => {
    const onReverted = vi.fn();
    stubApi(() => ({
      status: 409,
      body: { error: 'Only a Confirmed event can be reverted to Planning.' },
    }));

    render(<RevertToPlanningButton event={confirmedEvent} currentUserRole="event_coordinator" onReverted={onReverted} />);

    fireEvent.click(screen.getByRole('button', { name: 'Revert to Planning' }));

    const textarea = screen.getByLabelText(/Reason for reversion/);
    fireEvent.change(textarea, { target: { value: 'Emergency renovation' } });

    fireEvent.click(screen.getByRole('button', { name: 'Revert to Planning' }));

    await waitFor(() => {
      expect(screen.getByText('Only a Confirmed event can be reverted to Planning.')).toBeInTheDocument();
    });
    expect(onReverted).not.toHaveBeenCalled();
  });
});
