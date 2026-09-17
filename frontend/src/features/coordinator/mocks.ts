// Mock fixtures used by every Coordinator screen. Event codes stay stable
// across screens (EVT-C01, EVT-C02, EVT-C03) so a navigation flow reads
// coherently and screenshots stay comparable. No live network calls.

export type CoordinatorStatus =
  | 'Draft'
  | 'Under review'
  | 'Clarification requested'
  | 'Approved'
  | 'Planning'
  | 'Confirmed'
  | 'Rejected';

export type CoordinatorEvent = {
  eventCode: string;
  title: string;
  organiser: string;
  clientOrg: string;
  status: CoordinatorStatus;
  submitted: string;
  requestedDate: string;
  venue: string | null;
  capacity: number;
  attendeeCount: number;
  slaDue: string;
  requirements: string[];
  auditTrail: { at: string; actor: string; note: string }[];
  planning: {
    venue: 'Pending' | 'Tentative' | 'Confirmed';
    equipment: 'None' | 'Partial' | 'Complete';
    technicalSupport: 'Missing' | 'Assigned';
  };
};

export const coordinatorEvents: CoordinatorEvent[] = [
  {
    eventCode: 'EVT-C01',
    title: 'Annual Sustainability Forum',
    organiser: 'Aisha Rahim',
    clientOrg: 'Environmental Council',
    status: 'Under review',
    submitted: '2026-09-11',
    requestedDate: '2026-10-08',
    venue: null,
    capacity: 220,
    attendeeCount: 0,
    slaDue: 'in 1 day',
    requirements: ['Hearing loop', 'Recorded live captioning', 'Vegetarian catering'],
    auditTrail: [
      { at: '2026-09-16 09:40', actor: 'You', note: 'Opened review.' },
      { at: '2026-09-11 14:12', actor: 'Aisha Rahim', note: 'Submitted request.' },
    ],
    planning: { venue: 'Pending', equipment: 'None', technicalSupport: 'Missing' },
  },
  {
    eventCode: 'EVT-C02',
    title: 'Faculty Career Mixer',
    organiser: 'Ben Tay',
    clientOrg: 'Business School',
    status: 'Planning',
    submitted: '2026-09-04',
    requestedDate: '2026-09-25',
    venue: 'Auditorium B',
    capacity: 180,
    attendeeCount: 0,
    slaDue: 'in 3 days',
    requirements: ['Stage lighting', 'Roving microphones'],
    auditTrail: [
      { at: '2026-09-15 15:22', actor: 'You', note: 'Approved.' },
      { at: '2026-09-15 15:20', actor: 'You', note: 'Requested clarification on staffing.' },
      { at: '2026-09-04 10:03', actor: 'Ben Tay', note: 'Submitted request.' },
    ],
    planning: { venue: 'Confirmed', equipment: 'Partial', technicalSupport: 'Missing' },
  },
  {
    eventCode: 'EVT-C03',
    title: 'International Student Welcome',
    organiser: 'Chen Xin',
    clientOrg: 'Global Programmes',
    status: 'Approved',
    submitted: '2026-09-06',
    requestedDate: '2026-09-20',
    venue: 'Central Hall',
    capacity: 324,
    attendeeCount: 0,
    slaDue: 'overdue',
    requirements: ['Halal catering', 'Multi-lingual signage'],
    auditTrail: [
      { at: '2026-09-14 11:00', actor: 'You', note: 'Approved.' },
      { at: '2026-09-06 09:14', actor: 'Chen Xin', note: 'Submitted request.' },
    ],
    planning: { venue: 'Confirmed', equipment: 'Complete', technicalSupport: 'Assigned' },
  },
];

export function findCoordinatorEvent(eventCode: string) {
  return coordinatorEvents.find(event => event.eventCode === eventCode);
}

export const coordinatorSummary = {
  assigned: coordinatorEvents.length,
  awaitingDecision: coordinatorEvents.filter(e => e.status === 'Under review').length,
  inPlanning: coordinatorEvents.filter(e => e.status === 'Planning').length,
  readyToConfirm: coordinatorEvents.filter(
    e => e.planning.venue === 'Confirmed' && e.planning.equipment === 'Complete' && e.planning.technicalSupport === 'Assigned'
  ).length,
};
