import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { ActivityLog } from './ActivityLog';

afterEach(cleanup);

test('same-venue releases identify each booking when actor and time coincide', () => {
  const bookingIds = ['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222'];
  const entries = bookingIds.map(booking_id => ({
    occurred_at: '2026-10-21T11:00:00.000Z', action: 'Booking Released', field_changed: 'status',
    old_value: null, new_value: 'released', actor_name: 'Coordinator', entity_type: 'venue_booking',
    venue_name: 'Venue Z', booking_id,
  }));
  render(<ActivityLog entries={entries} />);
  const rows = screen.getAllByRole('row').slice(1);
  expect(rows).toHaveLength(2);
  for (const [index, id] of bookingIds.entries()) {
    expect(rows[index]).toHaveTextContent(`Booking reference: ${id}`);
    expect(rows[index]).toHaveTextContent('Venue Z: Released');
    expect(rows[index]).toHaveTextContent('Coordinator');
  }
});

test('event and legacy hold entries do not invent a booking reference', () => {
  render(<ActivityLog entries={[{ occurred_at: '2026-10-21T11:00:00.000Z', action:'Tentative hold released',field_changed:'venue_booking',old_value:null,new_value:'internal-hold-id',actor_name:'Coordinator' }]} />);
  expect(screen.queryByText(/Booking reference/)).toBeNull();
  expect(screen.queryByText('internal-hold-id')).toBeNull();
});
