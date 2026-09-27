// Test fixtures only; production uses the authenticated notification API.
import type { NotificationRecord } from './notificationsApi';

export const notifications: NotificationRecord[] = [
  {
    id: 'N-1005',
    title: 'Booking flagged for review',
    message: 'Capacity was reduced to 120, which is 40 below the expected attendance (160) for "Annual Sustainability Forum". This booking has been flagged for review.',
    is_read: false,
    read_at: null,
    created_at: '2026-09-22T14:32:00Z',
    event_id: 'EVT-C01',
  },
  {
    id: 'N-1004',
    title: 'Event approved',
    message: '"Faculty Career Mixer" was approved by your Coordinator.',
    is_read: false,
    read_at: null,
    created_at: '2026-09-21T09:10:00Z',
    event_id: 'EVT-C02',
  },
  {
    id: 'N-1003',
    title: 'Clarification requested',
    message: 'Your Coordinator asked a question about "International Student Welcome". Open the event to respond.',
    is_read: false,
    read_at: null,
    created_at: '2026-09-19T16:45:00Z',
    event_id: 'EVT-C03',
  },
  {
    id: 'N-1002',
    title: 'Venue confirmed',
    message: '"Design Studio Recital" now has a confirmed venue: Auditorium A.',
    is_read: true,
    read_at: '2026-09-18T08:02:00Z',
    created_at: '2026-09-17T11:20:00Z',
    event_id: 'EVT-N04',
  },
  {
    id: 'N-1001',
    title: 'Event completed',
    message: 'The event has completed.',
    is_read: true,
    read_at: '2026-09-10T09:31:00Z',
    created_at: '2026-09-10T09:00:00Z',
    event_id: 'EVT-C04',
  },
];
