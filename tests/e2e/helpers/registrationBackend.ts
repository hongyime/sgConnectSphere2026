// Fake api/attendee/events.ts for E09-S01/S02 Playwright tests: ?open=1, and GET
// and POST ?registration=1; and the Organiser's api/events.ts ?registrations=1
// (E09-S02). The shapes match docs/api-changes-week7.md.
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
    missingDetails: [], registration: null,
    capacity: { eventFull: false, waitlistEnabled: false, fullSessionIds: [] }, ...overrides,
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

// E09-S02 Organiser view: Session A 80 places, Session B 40, so 120 in all.
export function organiserRegistrations(overrides: Record<string, unknown> = {}) {
  return {
    event: { id: 'e-2001', eventCode: 'EVT-2001', name: 'Community Meetup', status: 'confirmed', waitlistEnabled: true,
      startsAt: '2026-11-15T01:00:00.000Z', endsAt: '2026-11-15T09:00:00.000Z', registrationEnabled: true,
      opensAt: '2026-10-01T01:00:00.000Z', closesAt: '2026-11-10T09:00:00.000Z', withdrawalDeadline: null },
    capacity: { capacity: 120, registered: 99 },
    sessions: [
      { ...registrationSessions[0], capacity: 80, registered: 80 },
      { ...registrationSessions[1], capacity: 40, registered: 19 },
    ],
    pending: [],
    ...overrides,
  };
}

// Answers GET and POST /api/events?registrations=1 as the Event Organiser and records every POST.
// view may be a function so a test can change what a reload shows.
export async function fakeOrganiserRegistrations(page: Page, options: { view?: unknown | (() => unknown); post?: (body: any) => Reply } = {}) {
  await signInAs(page, 'event_organiser', { email: 'organiser_a@clienta.com' });
  const posts: any[] = [];
  const current = () => (typeof options.view === 'function' ? options.view() : options.view) ?? organiserRegistrations();
  await page.route('**/api/events?registrations=1*', route => {
    const request = route.request();
    if (request.method() === 'POST') {
      posts.push(request.postDataJSON());
      return route.fulfill(options.post?.(request.postDataJSON()) ?? { json: current() });
    }
    return route.fulfill({ json: current() });
  });
  return posts;
}

// E09-S03: answers PATCH /api/events?edit=1 (the registration period save) and records each body.
export async function fakePeriodSave(page: Page, reply: (body: any) => Reply = () => ({ json: { updated: true, fields: [] } })) {
  const saves: any[] = [];
  await page.route('**/api/events?edit=1*', route => {
    if (route.request().method() !== 'PATCH') return route.fallback();
    saves.push(route.request().postDataJSON());
    return route.fulfill(reply(route.request().postDataJSON()));
  });
  return saves;
}
