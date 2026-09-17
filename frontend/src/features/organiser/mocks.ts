// Mock fixtures for the Event Organiser role. Aligned with the coordinator
// fixtures so the same event codes read coherently from both sides — an
// Organiser looking at EVT-O01 will see the same event a Coordinator would
// see under EVT-C01 in the coordinator mock data, differing only in the
// fields each role is permitted to view.

export type OrganiserStatus =
  | 'Draft'
  | 'Submitted'
  | 'Under review'
  | 'Clarification requested'
  | 'Approved'
  | 'Planning'
  | 'Confirmed'
  | 'Rejected'
  | 'Cancelled';

export type OrganiserEvent = {
  eventCode: string;
  title: string;
  purpose: string;
  status: OrganiserStatus;
  submittedAt: string | null;
  preferredDate: string;
  preferredWindow: string;
  attendeeCount: number;
  venue: string | null;
  clarificationQuestions: string[];
  timeline: { at: string; actor: string; note: string }[];
};

export const organiserEvents: OrganiserEvent[] = [
  {
    eventCode: 'EVT-O01',
    title: 'Annual Sustainability Forum',
    purpose: 'Faculty-wide seminar on green campus initiatives.',
    status: 'Clarification requested',
    submittedAt: '2026-09-11',
    preferredDate: '2026-10-08',
    preferredWindow: '09:00-17:00',
    attendeeCount: 220,
    venue: null,
    clarificationQuestions: [
      'Please confirm the expected attendee split between faculty and external guests.',
      'Are the catering requirements different for the afternoon panel?',
    ],
    timeline: [
      { at: '2026-09-16 09:40', actor: 'Coordinator', note: 'Requested clarification (2 questions).' },
      { at: '2026-09-11 14:12', actor: 'You',         note: 'Submitted request.' },
    ],
  },
  {
    eventCode: 'EVT-O02',
    title: 'Faculty Career Mixer',
    purpose: 'Networking event with industry sponsors.',
    status: 'Approved',
    submittedAt: '2026-09-04',
    preferredDate: '2026-09-25',
    preferredWindow: '18:00-22:00',
    attendeeCount: 180,
    venue: 'Auditorium B',
    clarificationQuestions: [],
    timeline: [
      { at: '2026-09-15 15:22', actor: 'Coordinator', note: 'Approved.' },
      { at: '2026-09-04 10:03', actor: 'You',         note: 'Submitted request.' },
    ],
  },
  {
    eventCode: 'EVT-O03',
    title: 'Design Studio Recital',
    purpose: 'Public showcase for the graduating cohort.',
    status: 'Draft',
    submittedAt: null,
    preferredDate: '2026-11-04',
    preferredWindow: '14:00-16:00',
    attendeeCount: 120,
    venue: null,
    clarificationQuestions: [],
    timeline: [],
  },
];

export function findOrganiserEvent(code: string): OrganiserEvent | undefined {
  return organiserEvents.find(event => event.eventCode === code);
}

export const organiserSummary = {
  drafts: organiserEvents.filter(event => event.status === 'Draft').length,
  awaiting: organiserEvents.filter(event => event.status === 'Submitted' || event.status === 'Under review').length,
  clarify: organiserEvents.filter(event => event.status === 'Clarification requested').length,
  confirmed: organiserEvents.filter(event => event.status === 'Confirmed' || event.status === 'Approved').length,
};
