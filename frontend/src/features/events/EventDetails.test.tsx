import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { EventDetails, RevertToPlanningButton, type EventRecord } from './EventDetails';

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
  startsAt: '2027-01-15T01:00:00.000Z',
  endsAt: '2027-01-15T09:00:00.000Z',
  expectedAttendance: 150,
  coordinator_id: 'coord-1',
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

describe('EventDetails & RevertToPlanningButton', () => {
  test('renders "Revert to Planning" button for Coordinator on Confirmed event', () => {
    render(<EventDetails event={confirmedEvent} currentUserRole="event_coordinator" />);
    expect(screen.getByRole('button', { name: 'Revert to Planning' })).toBeInTheDocument();
  });

  test('does not render "Revert to Planning" button on non-confirmed events', () => {
    for (const status of ['planning', 'safety_review', 'under_review', 'completed', 'cancelled']) {
      const { unmount } = render(
        <EventDetails event={{ ...confirmedEvent, status }} currentUserRole="event_coordinator" />,
      );
      expect(screen.queryByRole('button', { name: 'Revert to Planning' })).not.toBeInTheDocument();
      unmount();
    }
  });

  test('does not render "Revert to Planning" button for non-coordinator roles', () => {
    for (const role of ['event_organiser', 'attendee', 'venue_staff']) {
      const { unmount } = render(
        <EventDetails event={confirmedEvent} currentUserRole={role} />,
      );
      expect(screen.queryByRole('button', { name: 'Revert to Planning' })).not.toBeInTheDocument();
      unmount();
    }
  });

  test('clicking "Revert to Planning" opens modal and Cancel closes it', () => {
    render(<RevertToPlanningButton event={confirmedEvent} currentUserRole="event_coordinator" />);
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
    render(<RevertToPlanningButton event={confirmedEvent} currentUserRole="event_coordinator" />);

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

  test('submitting with valid reason calls POST /api/events?revert=1&id=..., shows success message and calls callback', async () => {
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

    render(
      <EventDetails
        event={confirmedEvent}
        currentUserRole="event_coordinator"
        onEventUpdated={onReverted}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Revert to Planning' }));

    const textarea = screen.getByLabelText(/Reason for reversion/);
    fireEvent.change(textarea, { target: { value: 'Venue reported a plumbing issue' } });

    fireEvent.click(screen.getByRole('button', { name: 'Revert to Planning' }));

    await waitFor(() => {
      expect(screen.getByText(/Event reverted to Planning/)).toBeInTheDocument();
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].url.searchParams.get('revert')).toBe('1');
    expect(calls[0].url.searchParams.get('id')).toBe(confirmedEvent.id);
    expect(calls[0].init?.method).toBe('POST');
    expect(onReverted).toHaveBeenCalledTimes(1);
  });

  test('displays error message when API call fails', async () => {
    stubApi(() => ({
      status: 409,
      body: { error: 'Only a Confirmed event can be reverted to Planning.' },
    }));

    render(<RevertToPlanningButton event={confirmedEvent} currentUserRole="event_coordinator" />);

    fireEvent.click(screen.getByRole('button', { name: 'Revert to Planning' }));

    const textarea = screen.getByLabelText(/Reason for reversion/);
    fireEvent.change(textarea, { target: { value: 'Emergency renovation' } });

    fireEvent.click(screen.getByRole('button', { name: 'Revert to Planning' }));

    await waitFor(() => {
      expect(screen.getByText('Only a Confirmed event can be reverted to Planning.')).toBeInTheDocument();
    });
  });
});
