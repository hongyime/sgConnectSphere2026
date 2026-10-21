// Fake api/attendee/events.ts for E09-S01 Playwright tests: ?open=1, and GET and
// POST ?registration=1. The shapes match docs/api-changes-week7.md.
import type { Page, Request } from '@playwright/test';
import { signInAs } from './fakeSession';

export const registrationEvent = {
  id: 'e-tech', eventCode: 'EVT-TECH', name: 'Tech Summit',
  startsAt: '2027-04-01T01:00:00.000Z', endsAt: '2027-04-01T09:00:00.000Z',
  venueName: 'Grand Auditorium', venueLocation: 'Level 1',
  registrationState: 'open', opensAt: '2027-02-01T00:00:00.000Z', closesAt: '2027-03-30T00:00:00.000Z',
};

export const registrationSessions = [
  { id: 's-a', title: 'Session A', startsAt: '2027-04-01T01:00:00.000Z', endsAt: '2027-04-01T04:00:00.000Z', venueName: 'Grand Auditorium', venueLocation: 'Level 1' },
  { id: 's-b', title: 'Session B', startsAt: '2027-04-01T05:00:00.000Z', endsAt: '2027-04-01T09:00:00.000Z', venueName: 'Seminar Room B', venueLocation: 'Level 2' },
];

export function registrationForm(overrides: Record<string, unknown> = {}) {
  return {
    event: registrationEvent, sessions: registrationSessions,
    details: { name: 'Casey Tan', email: 'attendee_c@example.com', contactNumber: '+65 8123 4567' },
    missingDetails: [], registration: null, ...overrides,
  };
}

type Reply = { status?: number; json: unknown };

// Answers the attendee events API and records every POST registration request.
export async function fakeRegistrationBackend(page: Page, options: {
  open?: Reply; form?: Reply; post?: (request: Request) => Reply;
} = {}) {
  await signInAs(page, 'attendee', { email: 'attendee_c@example.com' });
  const posts: unknown[] = [];
  await page.route('**/api/attendee/events?*', route => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === 'POST') {
      posts.push(request.postDataJSON());
      const reply = options.post?.(request) ?? { status: 201, json: {
        registration: { id: 'r-1', status: 'registered', registeredAt: '2027-03-01T02:00:00.000Z', sessionIds: request.postDataJSON().sessionIds },
        event: registrationEvent,
        sessions: registrationSessions.filter(session => request.postDataJSON().sessionIds.includes(session.id)),
      } };
      return route.fulfill(reply);
    }
    if (url.searchParams.get('open') === '1') {
      return route.fulfill(options.open ?? { json: { events: [{ ...registrationEvent, myRegistrationStatus: null }] } });
    }
    return route.fulfill(options.form ?? { json: registrationForm() });
  });
  return posts;
}
