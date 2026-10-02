// In-memory stand-in for the E03-S02 (SCRUM-33) clarification endpoints in
// api/events.ts, plus the reads both sides' screens make and the session and
// notification endpoints the shared header calls. It holds one request
// ("Annual Tech Summit") that a Coordinator and an Organiser take turns on:
// call signInAs() to switch who the browser is. Response shapes, rules and
// sentences follow backend/src/modules/eventLifecycle/clarification.ts; the
// real rules are proven against PostgreSQL in
// backend/tests/clarification.integration.test.ts.
import type { Page, Route } from '@playwright/test';

type Person = { id: string; name: string; email: string; role: 'event_coordinator' | 'event_organiser' };
type Question = { id: string; body: string; created_at: string; author_name: string; answer: string | null };
type Notice = { id: string; title: string; message: string; is_read: boolean; read_at: string | null; created_at: string; event_id: string };

export const coordinator: Person = { id: 'c-b', name: 'Coord B', email: 'coordinator_1@connectsphere.com', role: 'event_coordinator' };
export const organiser: Person = { id: 'o-a', name: 'Organiser A', email: 'organiser_a@clienta.com', role: 'event_organiser' };

const event = { id: 'evt-annual', code: 'EVT-ANNUAL', title: 'Annual Tech Summit' };

// TC_E03S02_04: other events assigned to the same Coordinator. With the
// summit (Under Review) that makes 2 Awaiting Clarification and 3 others.
const otherEvents = [
  { id: 'evt-2', event_code: 'EVT-2', title: 'Robotics Open Day', status: 'awaiting_clarification' },
  { id: 'evt-3', event_code: 'EVT-3', title: 'Faculty Career Mixer', status: 'approved' },
  { id: 'evt-4', event_code: 'EVT-4', title: 'Charity Run', status: 'awaiting_clarification' },
  { id: 'evt-5', event_code: 'EVT-5', title: 'Design Studio Recital', status: 'rejected' },
];

export async function fakeClarificationBackend(page: Page, options: {
  status?: 'under_review' | 'awaiting_clarification';
  // Questions already outstanding when the test starts (status awaiting_clarification).
  questions?: { body: string; raisedAt: string }[];
  withOtherEvents?: boolean;
} = {}) {
  const state = {
    user: options.status === 'awaiting_clarification' ? organiser : coordinator,
    status: options.status ?? 'under_review',
    questions: (options.questions ?? []).map((question, index): Question => ({
      id: `00000000-0000-4000-8000-00000000000${index + 1}`, body: question.body, created_at: question.raisedAt,
      author_name: coordinator.name, answer: null,
    })),
    notices: new Map<string, Notice[]>(),
  };
  const outstanding = () => state.questions.filter(question => question.answer === null)
    .map(({ id, body, created_at, author_name }) => ({ id, body, created_at, author_name }));
  const numbered = (items: string[]) => items.map((item, index) => `${index + 1}. ${item}`).join('\n');

  function notify(to: Person, title: string, message: string) {
    const list = state.notices.get(to.id) ?? [];
    list.unshift({ id: `n-${list.length + 1}-${to.id}`, title, message, is_read: false, read_at: null, created_at: '2026-09-08T02:00:00.000Z', event_id: event.id });
    state.notices.set(to.id, list);
  }

  const json = (route: Route, status: number, body: unknown) => route.fulfill({ status, json: body });
  const summary = () => ({
    id: event.id, event_code: event.code, title: event.title, status: state.status, status_changed_at: '2026-09-07T01:00:00.000Z',
    starts_at: '2026-10-10T01:00:00.000Z', ends_at: '2026-10-10T04:00:00.000Z', expected_attendance: 200,
    coordinator_assigned_at: '2026-09-07T01:00:00.000Z', organiser_name: organiser.name,
  });

  await page.route('**/api/auth/session', route => json(route, 200, {
    user: { id: state.user.id, email: state.user.email, role: state.user.role, clientOrgId: state.user.role === 'event_organiser' ? 'client-a' : null },
  }));
  await page.route('**/api/notifications', route => {
    const list = state.notices.get(state.user.id) ?? [];
    if (route.request().method() === 'POST') {
      const { id } = route.request().postDataJSON() as { id: string };
      const notice = list.find(item => item.id === id)!;
      Object.assign(notice, { is_read: true, read_at: '2026-09-08T03:00:00.000Z' });
      return json(route, 200, { notification: notice });
    }
    return json(route, 200, { notifications: list });
  });

  await page.route('**/api/events?*', route => {
    try { return handleEvents(route); } catch (error) {
      // Fail the request visibly rather than leaving the page waiting.
      return json(route, 500, { error: `Test backend error: ${(error as Error).message}` });
    }
  });

  function handleEvents(route: Route) {
    const request = route.request();
    const params = new URL(request.url()).searchParams;
    const id = params.get('id');
    const ours = id === event.id || id === event.code;

    if (request.method() === 'GET' && params.get('assigned') === '1' && !id) {
      const others = options.withOtherEvents ? otherEvents.map(other => ({ ...summary(), ...other, reassignment_pending: false })) : [];
      return json(route, 200, { events: [{ ...summary(), reassignment_pending: false }, ...others] });
    }
    if (request.method() === 'GET' && params.get('assigned') === '1' && ours) {
      return json(route, 200, { event: {
        ...summary(), description: 'A summit for the tech community', purpose: 'Community learning', venue_requirements: null,
        accessibility_note: null, equipment_requirements: null, layout_preference: null, registration_setup: null,
        coordinator_id: coordinator.id, coordinator_name: coordinator.name, organiser_email: organiser.email,
        pendingReassignment: null, outstandingQuestions: outstanding(),
      } });
    }
    if (request.method() === 'GET' && params.get('mine') === '1' && ours) {
      return json(route, 200, { event: {
        id: event.id, title: event.title, purpose: 'Community learning', status: state.status,
        startAt: '2026-10-10T01:00:00.000Z', endAt: '2026-10-10T04:00:00.000Z', expectedAttendance: 200,
      } });
    }
    if (request.method() === 'GET' && ours) {
      return json(route, 200, { event: {
        ...summary(), organiser_id: organiser.id, creator_name: organiser.name, coordinator_id: coordinator.id,
        coordinator_name: coordinator.name, statusHistory: [], comments: [], outstandingQuestions: outstanding(),
      } });
    }
    if (request.method() === 'POST' && params.get('clarification') === 'request' && ours) {
      if (state.status !== 'under_review') return json(route, 409, { error: 'Clarification can only be requested while the request is Under Review.' });
      const asked = ((request.postDataJSON() as { questions: string[] }).questions ?? []).map(text => text.trim()).filter(Boolean);
      if (!asked.length) return json(route, 400, { error: 'Add at least one question.' });
      for (const body of asked) {
        state.questions.push({ id: `00000000-0000-4000-8000-0000000001${state.questions.length}`, body, created_at: '2026-09-08T02:00:00.000Z', author_name: coordinator.name, answer: null });
      }
      state.status = 'awaiting_clarification';
      notify(organiser, 'Clarification requested', `${coordinator.name} needs more information about ${event.code} ${event.title} before the review can continue. The request is now Awaiting Clarification.\n\nQuestions:\n${numbered(asked)}`);
      return json(route, 201, { clarification: { eventId: event.id, status: state.status } });
    }
    if (request.method() === 'POST' && params.get('clarification') === 'response' && ours) {
      if (state.status !== 'awaiting_clarification') return json(route, 409, { error: 'This request is not awaiting clarification.' });
      const answers = (request.postDataJSON() as { answers: { questionId: string; answer: string }[] }).answers;
      const open = state.questions.filter(question => question.answer === null);
      if (open.some(question => !answers.find(item => item.questionId === question.id)?.answer.trim())) {
        return json(route, 400, { error: 'Answer every outstanding question before resubmitting.' });
      }
      for (const question of open) question.answer = answers.find(item => item.questionId === question.id)!.answer.trim();
      state.status = 'under_review';
      notify(coordinator, 'Clarification answered', `${organiser.name} answered your questions about ${event.code} ${event.title}. The request is back Under Review.\n\n${open.map((question, index) => `${index + 1}. ${question.body}\nAnswer: ${question.answer}`).join('\n')}`);
      return json(route, 200, { clarification: { eventId: event.id, status: state.status } });
    }
    return json(route, 404, { error: 'Not handled by the test backend.' });
  }

  return {
    signInAs(person: Person) { state.user = person; },
    get status() { return state.status; },
    get questions() { return state.questions; },
  };
}
