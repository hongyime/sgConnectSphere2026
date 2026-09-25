// Mock fixtures for the notification inbox (E11-S01). MOCKED — pending
// backend. Fields mirror the `notifications` table (see
// backend/database/migrations/0001_connectsphere_schema.sql): id, title,
// message, is_read, read_at, created_at, event_id. No live network calls.

export type NotificationRecord = {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  event_id: string | null;
};

// Pre-sorted newest first, matching how the real endpoint is expected to
// order results (ORDER BY created_at DESC) so the mock behaves like the API
// it stands in for. NotificationInbox re-sorts defensively rather than
// trusting that ordering.
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
    title: 'Account verified',
    message: 'Your ConnectSphere account is now verified.',
    is_read: true,
    read_at: '2026-09-10T09:31:00Z',
    created_at: '2026-09-10T09:00:00Z',
    event_id: null,
  },
];
